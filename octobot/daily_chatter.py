"""Persistent, raw message counts and the daily 17:00 UTC Exalted handover.

Reliability model
-----------------
* Live ``on_message`` events record messages immediately (no XP cooldowns involved).
* Anything missed (downtime, deploys, gateway drops) is recovered from Discord history.
  Recovery is idempotent: rows are keyed by Discord message ID.
* The award for a window never runs until the full 24h window has been reconciled.
  Transient failures delay the award and retry; the reason is stored and logged.
* An award that was already announced (even if the database was lost) is detected
  from the announcement channel and adopted rather than repeated.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import aiosqlite
import discord
from discord import app_commands
from discord.ext import commands, tasks

from octobot.discord_api import (
    DeferredDiscordRequest, background_api, collect, complete_member_cache,
    ensure_member_cache, retry_delay, role_manageable,
)

log = logging.getLogger(__name__)
UTC = timezone.utc
EXCLUDED_CHANNEL_IDS = frozenset({1547025818914525254, 1547064843909988433})
HEARTBEAT_OVERLAP = timedelta(minutes=1)
RETENTION = timedelta(days=3)
HISTORY_PAGE = 100
RECONCILIATION_REQUESTS = 40
DISCORD_FAILURES = (discord.HTTPException, discord.RateLimited, DeferredDiscordRequest, OSError, TimeoutError)
ANNOUNCEMENT_PREFIX = "# Top Daily Chatter:"


def latest_boundary(now: datetime) -> datetime:
    now = now.astimezone(UTC)
    boundary = now.replace(hour=17, minute=0, second=0, microsecond=0)
    return boundary if now >= boundary else boundary - timedelta(days=1)


def day_label(day: datetime) -> str:
    n = day.day
    suffix = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix} {day:%b}"


def messages_label(count: int) -> str:
    return f"{count} message" if count == 1 else f"{count} messages"


def announcement(ranking: list, end: datetime, role_id: int, *, mentions: bool) -> str:
    def user(index):
        return f"<@{ranking[index][0]}>" if mentions else "@"

    role = f"<@&{role_id}>" if mentions else "Exalted"
    lines = [
        f"# Top Daily Chatter: {user(0)} - ({day_label(end)})",
        f"{user(0)} is our top chatter of the day with {messages_label(ranking[0][1])} "
        f"and has been awarded the {role} role for the day!",
    ]
    for index, place in ((1, "2nd"), (2, "3rd")):
        if len(ranking) > index:
            lines.append(f"{place} place: {user(index)} - {messages_label(ranking[index][1])}")
    return "\n".join(lines)


def is_excluded_channel(channel) -> bool:
    return (getattr(channel, "id", None) in EXCLUDED_CHANNEL_IDS
            or getattr(channel, "parent_id", None) in EXCLUDED_CHANNEL_IDS)


def is_eligible_message(message, guild_id) -> bool:
    """Single rule used by live events and history reconciliation."""
    guild = getattr(message, "guild", None)
    channel = getattr(message, "channel", None)
    return not (
        guild is None or guild.id != guild_id
        or message.author.bot or message.webhook_id is not None
        or message.is_system() or is_excluded_channel(channel)
    )


def check_database_path(path) -> tuple[str, list[str]]:
    """Validate that the database lives somewhere that survives deployments."""
    problems: list[str] = []
    raw = Path(path)
    resolved = raw.expanduser().resolve()
    mount = os.environ.get("RAILWAY_VOLUME_MOUNT_PATH")
    if mount:
        try:
            resolved.relative_to(Path(mount).resolve())
        except ValueError:
            problems.append(
                f"database is NOT on the mounted volume ({mount}); counts are lost on every deploy"
            )
    if not raw.is_absolute():
        problems.append("DATABASE_PATH is relative; use an absolute path such as /data/octobot.db")
    parent = resolved.parent
    if not parent.exists() or not os.access(parent, os.W_OK):
        problems.append("database directory is missing or not writable")
    return str(resolved), problems


class ReconciliationIncomplete(RuntimeError):
    """Raised when the 24h window could not be fully read from Discord."""


class ReconciliationPending(ReconciliationIncomplete):
    """The request budget is used up and the next batch can continue."""


@dataclass
class BackfillResult:
    scanned: int = 0
    recovered: int = 0
    inaccessible: list = field(default_factory=list)
    pending: bool = False
    requests: int = 0
    failed: list = field(default_factory=list)  # transient; window is incomplete

    @property
    def complete(self) -> bool:
        return not (self.failed or self.inaccessible or self.pending)


class ChatterStore:
    def __init__(self, path, guild_id):
        self.path = path
        self.guild_id = guild_id
        self.db = None

    async def connect(self, now=None):
        self.db = await aiosqlite.connect(self.path)
        await self.db.executescript("""
            CREATE TABLE IF NOT EXISTS daily_chatter_messages (
                message_id INTEGER PRIMARY KEY, guild_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL, sent_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS daily_chatter_window
                ON daily_chatter_messages(guild_id, sent_at);
            CREATE TABLE IF NOT EXISTS daily_chatter_runs (
                guild_id INTEGER NOT NULL, end_at REAL NOT NULL,
                ranking TEXT NOT NULL, message_id INTEGER,
                completed INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(guild_id, end_at)
            );
            CREATE TABLE IF NOT EXISTS daily_chatter_state (
                guild_id INTEGER NOT NULL, key TEXT NOT NULL, value TEXT,
                PRIMARY KEY(guild_id, key)
            );
            CREATE TABLE IF NOT EXISTS daily_chatter_coverage (
                guild_id INTEGER NOT NULL, channel_id INTEGER NOT NULL,
                start_at REAL NOT NULL, end_at REAL NOT NULL,
                PRIMARY KEY(guild_id, channel_id, start_at, end_at)
            );
            CREATE TABLE IF NOT EXISTS daily_chatter_progress (
                guild_id INTEGER NOT NULL, channel_id INTEGER NOT NULL,
                start_at REAL NOT NULL, end_at REAL NOT NULL, source TEXT NOT NULL,
                progress TEXT NOT NULL,
                PRIMARY KEY(guild_id, channel_id, start_at, end_at, source)
            );
        """)
        # No "assume the latest award is done" seeding any more: a fresh database
        # (e.g. after a redeploy onto ephemeral disk) used to mark the current award
        # complete and silently skip it. Awards are now idempotent via the
        # announcement channel instead (see DailyChatterCog.find_announcement).
        await self.db.commit()

    async def record(self, message) -> bool:
        """Insert one message; returns True when it was new."""
        cursor = await self.db.execute(
            "INSERT OR IGNORE INTO daily_chatter_messages VALUES (?, ?, ?, ?)",
            (message.id, self.guild_id, message.author.id, message.created_at.timestamp()),
        )
        await self.db.commit()
        return cursor.rowcount > 0

    async def record_many(self, messages) -> int:
        cursor = await self.db.executemany(
            "INSERT OR IGNORE INTO daily_chatter_messages VALUES (?, ?, ?, ?)",
            [(message.id, self.guild_id, message.author.id, message.created_at.timestamp())
             for message in messages],
        )
        await self.db.commit()
        return cursor.rowcount

    async def progress(self, channel_id, start, end, source):
        async with self.db.execute(
            "SELECT progress FROM daily_chatter_progress "
            "WHERE guild_id=? AND channel_id=? AND start_at=? AND end_at=? AND source=?",
            (self.guild_id, channel_id, start.timestamp(), end.timestamp(), source),
        ) as cursor:
            row = await cursor.fetchone()
        return json.loads(row[0]) if row else None

    async def set_progress(self, channel_id, start, end, source, value):
        await self.db.execute(
            "INSERT OR REPLACE INTO daily_chatter_progress VALUES (?, ?, ?, ?, ?, ?)",
            (self.guild_id, channel_id, start.timestamp(), end.timestamp(), source, json.dumps(value)),
        )
        await self.db.commit()

    async def coverage_until(self, channel_id, start, end):
        cursor_at = start.timestamp()
        async with self.db.execute(
            "SELECT start_at, end_at FROM daily_chatter_coverage "
            "WHERE guild_id=? AND channel_id=? AND end_at>? AND start_at<? ORDER BY start_at",
            (self.guild_id, channel_id, cursor_at, end.timestamp()),
        ) as cursor:
            async for left, right in cursor:
                if left > cursor_at:
                    break
                cursor_at = max(cursor_at, right)
        return datetime.fromtimestamp(min(cursor_at, end.timestamp()), UTC)

    async def counts(self, end):
        async with self.db.execute(
            "SELECT user_id, COUNT(*) FROM daily_chatter_messages "
            "WHERE guild_id=? AND sent_at>=? AND sent_at<? "
            "GROUP BY user_id ORDER BY COUNT(*) DESC, user_id ASC",
            (self.guild_id, (end - timedelta(days=1)).timestamp(), end.timestamp()),
        ) as cursor:
            return await cursor.fetchall()

    async def last_message_at(self):
        async with self.db.execute(
            "SELECT MAX(sent_at) FROM daily_chatter_messages WHERE guild_id=?", (self.guild_id,)
        ) as cursor:
            value = (await cursor.fetchone())[0]
        return datetime.fromtimestamp(value, UTC) if value is not None else None

    async def get_state(self, key):
        async with self.db.execute(
            "SELECT value FROM daily_chatter_state WHERE guild_id=? AND key=?", (self.guild_id, key)
        ) as cursor:
            row = await cursor.fetchone()
        return row[0] if row else None

    async def set_state(self, key, value):
        await self.db.execute(
            "INSERT OR REPLACE INTO daily_chatter_state VALUES (?, ?, ?)",
            (self.guild_id, key, None if value is None else str(value)),
        )
        await self.db.commit()

    async def is_reconciled(self, channel_id, start, end) -> bool:
        async with self.db.execute(
            "SELECT 1 FROM daily_chatter_coverage "
            "WHERE guild_id=? AND channel_id=? AND start_at=? AND end_at=?",
            (self.guild_id, channel_id, start.timestamp(), end.timestamp()),
        ) as cursor:
            return await cursor.fetchone() is not None

    async def mark_reconciled(self, channel_id, start, end):
        await self.db.execute(
            "INSERT OR IGNORE INTO daily_chatter_coverage VALUES (?, ?, ?, ?)",
            (self.guild_id, channel_id, start.timestamp(), end.timestamp()),
        )
        await self.db.commit()

    async def run(self, end):
        async with self.db.execute(
            "SELECT ranking, message_id, completed FROM daily_chatter_runs WHERE guild_id=? AND end_at=?",
            (self.guild_id, end.timestamp()),
        ) as cursor:
            row = await cursor.fetchone()
        return (json.loads(row[0]), row[1], bool(row[2])) if row else None

    async def save(self, end, ranking, message_id=None, completed=False):
        # One transaction: run row and pruning commit together or not at all.
        await self.db.execute(
            "INSERT OR REPLACE INTO daily_chatter_runs VALUES (?, ?, ?, ?, ?)",
            (self.guild_id, end.timestamp(), json.dumps(ranking), message_id, int(completed)),
        )
        await self.db.execute(
            "DELETE FROM daily_chatter_messages WHERE guild_id=? AND sent_at<?",
            (self.guild_id, (end - RETENTION).timestamp()),
        )
        await self.db.execute(
            "DELETE FROM daily_chatter_coverage WHERE guild_id=? AND end_at<?",
            (self.guild_id, (end - RETENTION).timestamp()),
        )
        await self.db.execute(
            "DELETE FROM daily_chatter_progress WHERE guild_id=? AND end_at<?",
            (self.guild_id, (end - RETENTION).timestamp()),
        )
        await self.db.execute(
            "DELETE FROM daily_chatter_state WHERE guild_id=? "
            "AND substr(key, 1, instr(key, ':') - 1) IN "
            "('announcement_checked', 'announcement_search', 'award_roles', 'award_send') "
            "AND CAST(substr(key, instr(key, ':') + 1) AS INTEGER) < ?",
            (self.guild_id, (end - RETENTION).timestamp()),
        )
        await self.db.commit()

    async def summary(self, end):
        """Window statistics for diagnostics: (total, unique, top3)."""
        counts = await self.counts(end)
        return sum(c for _, c in counts), len(counts), counts[:3]

    async def close(self):
        if self.db is not None:
            await self.db.close()
            self.db = None


class DailyChatterCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.api = background_api(bot)
        self._catchup_end = None
        self._followup_from = None
        self._chatter_retry = {}
        self._archive_channels = {}
        self._archive_cache_window = None
        self._role_observations = {}
        self._observation_end = None
        self.store = ChatterStore(bot.config.database_path, bot.config.guild_id)
        self.lock = asyncio.Lock()  # serialises award/backfill, NOT live recording
        self.enabled = bool(bot.config.daily_chatter_role_id and bot.config.daily_chatter_channel_id)
        self.catchup_from: datetime | None = None
        self.last_error: str | None = None
        self.last_backfill: BackfillResult | None = None
        self.delay_reason: str | None = None
        self.record_failures = 0

    async def cog_load(self):
        if self.enabled:
            resolved, problems = check_database_path(self.bot.config.database_path)
            log.info("Daily chatter database: %s", resolved)
            for problem in problems:
                log.critical("Daily chatter persistence problem: %s", problem)
            await self.store.connect()
            now = datetime.now(UTC)
            floor = latest_boundary(now) - timedelta(days=1)
            alive = await self.store.get_state("gateway_checkpoint_v2")
            since = (datetime.fromtimestamp(float(alive), UTC) - HEARTBEAT_OVERLAP) if alive else floor
            self.catchup_from = max(since, floor)
            pending = await self.store.get_state("catchup_interval")
            if pending:
                left, right = json.loads(pending)
                if left >= floor.timestamp():
                    self.catchup_from = datetime.fromtimestamp(left, UTC)
                    self._catchup_end = datetime.fromtimestamp(right, UTC)
                    self._followup_from = self._catchup_end - HEARTBEAT_OVERLAP
            log.info("Daily chatter will backfill history from %s", self.catchup_from.isoformat())
            self.refresh.start()

    async def cog_unload(self):
        self.refresh.cancel()
        task = self.refresh.get_task()
        if task is not None:
            try:
                await task
            except asyncio.CancelledError:
                pass
        await self.store.close()

    @commands.Cog.listener()
    async def on_disconnect(self):
        # Events can be lost across a gateway reconnect: re-scan from just before it.
        if self.enabled:
            self._role_observations.clear()
            self._request_catchup(datetime.now(UTC) - HEARTBEAT_OVERLAP)

    def _request_catchup(self, start):
        if self._catchup_end is None:
            self.catchup_from = min(self.catchup_from or start, start)
        else:
            self._followup_from = min(self._followup_from or start, start)

    @commands.Cog.listener()
    async def on_member_update(self, before, after):
        if not self.enabled or after.guild.id != self.bot.config.guild_id:
            return
        role_id = self.bot.config.daily_chatter_role_id
        previous = any(role.id == role_id for role in before.roles)
        current = any(role.id == role_id for role in after.roles)
        if previous != current:
            self._role_observations.pop(after.id, None)

    @commands.Cog.listener()
    async def on_message(self, message):
        if not self.enabled or not is_eligible_message(message, self.bot.config.guild_id):
            return
        try:
            await self.store.record(message)
        except Exception as exc:  # never lose a message silently
            self.record_failures += 1
            self.last_error = f"record failed: {type(exc).__name__}"
            log.error("Daily chatter could not record a gateway message error=%s", type(exc).__name__)
            self._request_catchup(message.created_at - HEARTBEAT_OVERLAP)

    # ---- member resolution -------------------------------------------------

    async def resolve_members(self, guild, user_ids):
        """Return {user_id: Member} for current non-bot members among user_ids.

        Uses cache first, then an API lookup, so an incomplete member cache cannot
        hide an eligible member. Departed users (404) are simply absent; transient
        API errors propagate so the award retries instead of skipping a winner.
        """
        found = {}
        for uid in user_ids:
            member = guild.get_member(uid) if hasattr(guild, "get_member") else None
            if member is None and not complete_member_cache(guild) and hasattr(guild, "fetch_member"):
                try:
                    member = await self.api.call(
                        "member_lookup", (guild.id, uid), lambda: guild.fetch_member(uid), cache_missing=False,
                    )
                except discord.NotFound:
                    member = None
            if member is not None and not member.bot:
                found[uid] = member
        return found

    async def build_ranking(self, guild, end, limit=3):
        counts = await self.store.counts(end)
        ranking = []
        for uid, count in counts:
            if len(ranking) >= limit:
                break
            if await self.resolve_members(guild, [uid]):
                ranking.append((uid, count))
        return ranking

    # ---- history reconciliation -------------------------------------------

    @staticmethod
    def _can_read(channel, guild):
        if not hasattr(channel, "permissions_for") or getattr(guild, "me", None) is None:
            return True
        permissions = channel.permissions_for(guild.me)
        return permissions.view_channel and permissions.read_message_history

    async def _read_archive(self, parent, kind, options, start, end, result):
        saved = await self.store.progress(parent.id, start, end, kind)
        cursor, ids, done = saved or (None, [], False)
        while not done:
            if result.requests >= RECONCILIATION_REQUESTS:
                result.pending = True
                break
            params = dict(options)
            if cursor is not None:
                params["before"] = discord.Object(id=int(cursor)) if kind == "joined" else datetime.fromisoformat(cursor)
            result.requests += 1
            try:
                page = await self.api.call(
                    "archive_history_" + kind, parent.id,
                    lambda: collect(parent.archived_threads(limit=HISTORY_PAGE, **params)),
                )
            except discord.NotFound:
                return []
            except discord.Forbidden:
                result.inaccessible.append(parent.id)
                break
            except DISCORD_FAILURES:
                result.failed.append(parent.id)
                break
            done = len(page) < HISTORY_PAGE
            for thread in page:
                stamp = getattr(thread, "archive_timestamp", None)
                # Joined-private threads are sorted by creation ID.
                if stamp is not None and stamp < start:
                    if kind != "joined":
                        done = True
                        break
                    continue
                if not is_excluded_channel(thread):
                    self._archive_channels[thread.id] = thread
                    ids.append(thread.id)
            if not done:
                next_cursor = str(page[-1].id) if kind == "joined" else page[-1].archive_timestamp.isoformat()
                if next_cursor == cursor:
                    result.failed.append(parent.id)
                    break
                cursor = next_cursor
            ids = list(dict.fromkeys(ids))
            await self.store.set_progress(parent.id, start, end, kind, [cursor, ids, done])
        return ids

    async def eligible_channels(self, guild, start, end, result):
        text_channels = getattr(guild, "text_channels", [])
        parents = [*text_channels, *getattr(guild, "forum_channels", [])]
        channels = {
            channel.id: channel
            for channel in [*text_channels, *getattr(guild, "voice_channels", []),
                            *getattr(guild, "stage_channels", []), *getattr(guild, "threads", [])]
            if not is_excluded_channel(channel)
            and (getattr(channel, "created_at", None) is None or channel.created_at < end)
        }
        saved_active = await self.store.progress(guild.id, start, end, "active_threads") or []
        active_ids = {
            thread.id for thread in getattr(guild, "threads", []) if thread.id in channels
        }
        if active_ids - set(saved_active):
            await self.store.set_progress(guild.id, start, end, "active_threads", sorted(active_ids | set(saved_active)))
        archived = {thread_id: None for thread_id in saved_active if thread_id not in channels}
        for parent in parents:
            if is_excluded_channel(parent) or not hasattr(parent, "archived_threads"):
                continue
            if getattr(parent, "created_at", start) >= end:
                continue
            if not self._can_read(parent, guild):
                result.inaccessible.append(parent.id)
                continue
            kinds = [("public", {})]
            if isinstance(parent, discord.TextChannel) and guild.me is not None:
                if parent.permissions_for(guild.me).manage_threads:
                    kinds.append(("private", {"private": True}))
                else:
                    kinds.append(("joined", {"private": True, "joined": True}))
            for kind, options in kinds:
                for thread_id in await self._read_archive(parent, kind, options, start, end, result):
                    if thread_id not in channels:
                        archived[thread_id] = self._archive_channels.get(thread_id)
        channels.update(archived)
        return channels

    async def backfill(self, guild, start, end) -> BackfillResult:
        """Scan bounded pages, committing their messages before advancing the cursor."""
        result = BackfillResult()
        window = latest_boundary(end)
        if self._archive_cache_window != window:
            self._archive_channels.clear()
            self._archive_cache_window = window
        channels = await self.eligible_channels(guild, start, end, result)
        for channel_id, channel in channels.items():
            left = await self.store.coverage_until(channel_id, start, end)
            if left == end:
                continue
            if result.requests >= RECONCILIATION_REQUESTS:
                result.pending = True
                break
            try:
                if channel is None:
                    result.requests += 1
                    channel = await self.api.call(
                        "channel_lookup", channel_id, lambda: self.bot.fetch_channel(channel_id)
                    )
                    self._archive_channels[channel_id] = channel
                if not self._can_read(channel, guild):
                    result.inaccessible.append(channel_id)
                    continue
                await self._read_history(channel, left, end, result)
            except discord.NotFound:
                # Discord distinguishes deleted channels from every other history error.
                await self.store.mark_reconciled(channel_id, left, end)
            except discord.Forbidden:
                result.inaccessible.append(channel_id)
            except DISCORD_FAILURES:
                result.failed.append(channel_id)
        self.last_backfill = result
        log.info(
            "Daily chatter backfill start=%s end=%s requests=%d scanned=%d recovered=%d "
            "inaccessible=%d failed=%d pending=%s",
            start.isoformat(), end.isoformat(), result.requests, result.scanned, result.recovered,
            len(result.inaccessible), len(result.failed), result.pending,
        )
        return result

    async def _read_history(self, channel, start, end, result):
        cursor = await self.store.progress(channel.id, start, end, "history")
        if cursor is None:
            cursor = discord.utils.time_snowflake(start, high=False) - 1
        while result.requests < RECONCILIATION_REQUESTS:
            result.requests += 1
            page = await self.api.call(
                "channel_history", channel.id, lambda: collect(channel.history(
                    limit=HISTORY_PAGE, after=discord.Object(id=cursor), before=end, oldest_first=True,
                )),
            )
            result.scanned += len(page)
            result.recovered += await self.store.record_many(
                message for message in page if is_eligible_message(message, self.bot.config.guild_id)
            )
            if len(page) < HISTORY_PAGE:
                await self.store.mark_reconciled(channel.id, start, end)
                return
            cursor = page[-1].id
            await self.store.set_progress(channel.id, start, end, "history", cursor)
        result.pending = True

    async def run_catchup(self, guild):
        if self.catchup_from is None:
            return
        started = self.catchup_from
        if self._catchup_end is None:
            self._catchup_end = datetime.now(UTC)
            await self.store.set_state(
                "catchup_interval", json.dumps([started.timestamp(), self._catchup_end.timestamp()]),
            )
        result = await self.backfill(guild, started, self._catchup_end)
        if result.complete:
            followup = self._followup_from
            # Commit the recovered boundary before clearing the interval. A crash
            # between these writes can repeat a small, deduplicated overlap.
            checkpoint = min(followup or self._catchup_end, self._catchup_end)
            await self.store.set_state("gateway_checkpoint_v2", checkpoint.timestamp())
            await self.store.set_state("catchup_interval", None)
            self._catchup_end = None
            self.catchup_from, self._followup_from = self._followup_from, None
        return result

    async def reconcile_window(self, guild, end):
        start = end - timedelta(days=1)
        result = await self.backfill(guild, start, end)
        if result.inaccessible or result.failed:
            raise ReconciliationIncomplete(
                f"{len(result.inaccessible)} inaccessible, {len(result.failed)} failed"
            )
        if result.pending:
            raise ReconciliationPending("history has more pages to reconcile")
        return result

    # ---- announcement lookup (idempotency across lost databases) ----------

    async def find_announcement(self, channel, end, *, after=None):
        me = getattr(self.bot, "user", None)
        if me is None or not hasattr(channel, "history"):
            return None
        label = f"({day_label(end)})"
        start = after or end
        channel_id = self.bot.config.daily_chatter_channel_id
        key = f"announcement_search:{int(end.timestamp())}:{start.timestamp()}"
        saved = await self.store.get_state(key)
        right, cursor = json.loads(saved) if saved else (
            datetime.now(UTC).timestamp(), discord.utils.time_snowflake(start, high=False) - 1,
        )
        for _ in range(4):
            messages = await self.api.call(
                "channel_history", channel_id, lambda: collect(channel.history(
                    limit=HISTORY_PAGE, after=discord.Object(id=cursor), oldest_first=True,
                    before=datetime.fromtimestamp(right, UTC),
                )),
            )
            for message in messages:
                if (message.author.id == me.id and message.content.startswith(ANNOUNCEMENT_PREFIX)
                        and label in message.content.splitlines()[0]):
                    await self.store.set_state(key, None)
                    return message
            if len(messages) < HISTORY_PAGE:
                await self.store.set_state(key, None)
                return None
            cursor = messages[-1].id
            await self.store.set_state(key, json.dumps([right, cursor]))
        raise ReconciliationPending("announcement history has more pages to check")

    # ---- previews / diagnostics -------------------------------------------

    async def test_preview(self, now: datetime | None = None) -> str:
        """Render a read-only Exalted preview from observed messages, never award roles."""
        if not self.enabled:
            raise RuntimeError("Daily Exalted tracking is disabled.")
        now = now or datetime.now(UTC)
        guild = self.bot.get_guild(self.bot.config.guild_id)
        if guild is None:
            raise RuntimeError("Daily Exalted server is unavailable.")
        ranking = await self.build_ranking(guild, now)
        label = "**🧪 TEST ALERT: Daily Exalted (no notifications or role changes).**"
        if not ranking:
            return label + "\n\nNo eligible chat messages recorded in the last 24 hours."
        return (
            label
            + "\n\n**Preview only:** message counts over the preceding 24 hours as of "
            + f"<t:{int(now.timestamp())}:f>. The actual 17:00 UTC result may differ.\n\n"
            + announcement(ranking, now, self.bot.config.daily_chatter_role_id, mentions=True)
        )

    async def health_report(self, now: datetime | None = None) -> str:
        now = now or datetime.now(UTC)
        boundary = latest_boundary(now)
        next_end = boundary + timedelta(days=1)
        total, unique, top = await self.store.summary(next_end)
        last = await self.store.last_message_at()
        _, problems = check_database_path(self.bot.config.database_path)
        previous = await self.store.run(boundary)
        lines = [
            "**Daily chatter health**",
            f"Window: {boundary:%Y-%m-%d %H:%M} → {next_end:%Y-%m-%d %H:%M} UTC (provisional)",
            f"Messages recorded: {total} from {unique} user(s)",
            "Top 3: " + (", ".join(f"<@{u}> {c}" for u, c in top) or "none"),
            f"Last recorded message: {last:%Y-%m-%d %H:%M:%S} UTC" if last else "Last recorded message: none",
            f"Persistence: {'OK' if not problems else 'PROBLEM - ' + '; '.join(problems)}",
            f"Previous award ({day_label(boundary)}): "
            + ("completed" if previous and previous[2] else "pending/none"),
            f"Pending catch-up: {self.catchup_from.isoformat() if self.catchup_from else 'none'}",
        ]
        if self.last_backfill:
            b = self.last_backfill
            lines.append(f"Last backfill: scanned {b.scanned}, recovered {b.recovered}, "
                         f"inaccessible {len(b.inaccessible)}, failed {len(b.failed)}")
        lines.append(f"Record failures: {self.record_failures}")
        if self.delay_reason:
            lines.append(f"Award delayed: {self.delay_reason}")
        if self.last_error:
            lines.append(f"Last error: {self.last_error}")
        return "\n".join(lines)

    @app_commands.command(name="chatterstatus", description="Show Daily Top Chatter tracking health (admin only).")
    @app_commands.default_permissions(administrator=True)
    @app_commands.guild_only()
    async def chatterstatus(self, interaction: discord.Interaction):
        if not interaction.permissions.administrator:
            await interaction.response.send_message("Administrator only.", ephemeral=True)
            return
        if not self.enabled:
            await interaction.response.send_message("Daily chatter is disabled.", ephemeral=True)
            return
        await interaction.response.send_message(
            await self.health_report(), ephemeral=True, allowed_mentions=discord.AllowedMentions.none()
        )

    # ---- scheduler ---------------------------------------------------------

    @tasks.loop(seconds=30)
    async def refresh(self):
        if self.lock.locked():
            return
        async with self.lock:
            guild = self.bot.get_guild(self.bot.config.guild_id)
            if guild is None or getattr(guild, "unavailable", False) or not self.bot.is_ready():
                return
            now = datetime.now(UTC)
            await self._scheduled("award", lambda: self.award(latest_boundary(now)))
            if self.catchup_from is not None:
                await self._scheduled("catchup", lambda: self.run_catchup(guild))
            if self.catchup_from is None:
                await self.store.set_state("gateway_checkpoint_v2", now.timestamp())

    async def _scheduled(self, name, action):
        attempts, retry_at = self._chatter_retry.get(name, (0, 0))
        if self.api.clock() < retry_at:
            return
        try:
            result = await action()
            if isinstance(result, BackfillResult) and (result.inaccessible or result.failed):
                raise ReconciliationIncomplete("gateway catch-up is waiting for inaccessible or failed Discord resources")
        except Exception as exc:
            progressing = isinstance(exc, ReconciliationPending)
            delay = 0 if progressing else retry_delay(attempts)
            self._chatter_retry[name] = (0 if progressing else attempts + 1, self.api.clock() + delay)
            reason = str(exc) if isinstance(exc, ReconciliationIncomplete) else type(exc).__name__
            if name == "award":
                self.delay_reason = reason
            self.last_error = reason
            log.warning("Daily chatter deferred operation=%s reason=%s retry_s=%.0f", name, reason, delay)
        else:
            self._chatter_retry.pop(name, None)

    @refresh.before_loop
    async def before_refresh(self):
        await self.bot.wait_until_ready()

    async def award(self, end):
        if self._observation_end != end:
            self._observation_end = end
            self._role_observations.clear()
        state = await self.store.run(end)
        if state and state[2]:
            return
        guild = self.bot.get_guild(self.bot.config.guild_id)
        if guild is None:
            raise RuntimeError("Daily chatter guild is unavailable")
        role = guild.get_role(self.bot.config.daily_chatter_role_id)
        if role is None:
            raise RuntimeError("Daily chatter role is missing")
        channel = await self.api.resolve_channel(self.bot, self.bot.config.daily_chatter_channel_id)
        if channel.guild.id != guild.id:
            raise RuntimeError("Daily chatter channel must be in the configured guild")
        announcement_key = f"announcement_checked:{int(end.timestamp())}"
        if state is None:
            checked = await self.store.get_state(announcement_key)
            if checked is None:
                existing = await self.find_announcement(channel, end)
                if existing is not None and self._is_final_announcement(existing):
                    await self.store.save(end, [], existing.id, completed=True)
                    return
                checked = str(existing.id) if existing is not None else "none"
                await self.store.set_state(announcement_key, checked)
            await self.reconcile_window(guild, end)
            ranking = await self.build_ranking(guild, end)
            total, unique, _ = await self.store.summary(end)
            log.info("Daily chatter window end=%s messages=%d unique_users=%d", end.isoformat(), total, unique)
            message_id = int(checked) if checked.isdecimal() else None
            await self.store.save(end, ranking, message_id)
        else:
            ranking, message_id, _ = state

        self.delay_reason = None
        if not role_manageable(guild, role):
            raise ReconciliationIncomplete("the bot cannot manage the Daily Chatter role")
        await ensure_member_cache(guild, self.api)
        members = list(role.members)
        # Rebuild from the reconciled counts if any leading member has left.
        valid = await self.resolve_members(guild, [uid for uid, _ in ranking])
        if len(valid) != len(ranking):
            ranking = await self.build_ranking(guild, end)
            valid = await self.resolve_members(guild, [uid for uid, _ in ranking])
        ranking = [entry for entry in ranking if entry[0] in valid]
        winner = valid[ranking[0][0]] if ranking else None
        winners_key = f"award_roles:{int(end.timestamp())}"
        progress = json.loads(await self.store.get_state(winners_key) or "{}")
        removed = set(progress.get("removed", ()))
        for member in members:
            if self._role_observations.get(member.id) is False or (winner is not None and member.id == winner.id):
                continue
            if not role_manageable(guild, role, member):
                raise ReconciliationIncomplete("the bot cannot remove Exalted from a current holder")
            try:
                await self.api.call(
                    "role_remove", (guild.id, role.id), lambda: member.remove_roles(
                        role, reason="Daily top chatter: previous award expired",
                    ), cache_missing=False,
                )
            except discord.NotFound as exc:
                if exc.code != 10007:  # Unknown Member: departure also removes the role.
                    raise
            self._role_observations[member.id] = False
            removed.add(member.id)
            progress["removed"] = sorted(removed)
            await self.store.set_state(winners_key, json.dumps(progress))
        if any(
            (winner is None or holder.id != winner.id) and self._role_observations.get(holder.id) is not False
            for holder in role.members
        ):
            raise ReconciliationIncomplete("another member acquired Exalted during the handover")
        if winner is not None and role not in winner.roles and not self._role_observations.get(winner.id):
            if not role_manageable(guild, role, winner):
                raise ReconciliationIncomplete("the bot cannot grant Exalted to the winner")
            await self.api.call(
                "role_add", (guild.id, role.id),
                lambda: winner.add_roles(role, reason="Daily top chatter: most messages in the 24h period"),
                cache_missing=False,
            )
            self._role_observations[winner.id] = True
            progress["granted"] = winner.id
            await self.store.set_state(winners_key, json.dumps(progress))
        if ranking:
            channel_id = self.bot.config.daily_chatter_channel_id
            if message_id is None:
                # A send may have succeeded before its response or SQLite write failed.
                # Keep the date and title in the silent placeholder so it can be adopted.
                send_key = f"award_send:{int(end.timestamp())}"
                previous_send = await self.store.get_state(send_key)
                existing = None
                if previous_send is not None:
                    start = datetime.fromtimestamp(float(previous_send), UTC)
                    existing = await self.find_announcement(channel, end, after=start)
                if existing is None:
                    await self.store.set_state(send_key, (datetime.now(UTC) - HEARTBEAT_OVERLAP).timestamp())
                    nonce = hashlib.sha256(f"chatter:{guild.id}:{end.timestamp()}".encode()).hexdigest()[:24]
                    existing = await self.api.call("channel_send", channel_id, lambda: channel.send(
                        announcement(ranking, end, role.id, mentions=False),
                        allowed_mentions=discord.AllowedMentions.none(), silent=True, nonce=nonce,
                    ))
                message_id = existing.id
                await self.store.save(end, ranking, message_id)
            message = channel.get_partial_message(message_id)
            # Listing the exact users lets Discord attach their profiles to the message so
            # clients render names instead of "@unknown-user"; the message was sent
            # silently and the role is never allowed to ping.
            try:
                await self.api.call("message_edit", channel_id, lambda: message.edit(
                    content=announcement(ranking, end, role.id, mentions=True),
                    allowed_mentions=discord.AllowedMentions(
                        everyone=False, roles=False, replied_user=False,
                        users=[discord.Object(id=uid) for uid, _ in ranking],
                    ),
                ), cache_missing=False)
            except discord.NotFound as exc:
                if exc.code != 10008:
                    raise
                await self.store.save(end, ranking)
                raise ReconciliationIncomplete("the saved Daily Chatter message was deleted") from None
        await self.store.save(end, ranking, message_id, completed=True)
        self._role_observations.clear()
        await self.store.set_state("delay_reason", None)

    @staticmethod
    def _is_final_announcement(message):
        return "<@" in message.content.partition("\n")[0]
