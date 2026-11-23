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

log = logging.getLogger(__name__)
UTC = timezone.utc
EXCLUDED_CHANNEL_IDS = frozenset({1547025818914525254, 1547064843909988433})
HEARTBEAT_OVERLAP = timedelta(minutes=1)
RETENTION = timedelta(days=3)
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


@dataclass
class BackfillResult:
    scanned: int = 0
    recovered: int = 0
    inaccessible: list = field(default_factory=list)  # permanent (Forbidden)
    failed: list = field(default_factory=list)  # transient; window is incomplete

    @property
    def complete(self) -> bool:
        return not self.failed


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
            CREATE TABLE IF NOT EXISTS daily_chatter_reconciled (
                guild_id INTEGER NOT NULL, channel_id INTEGER NOT NULL,
                start_at REAL NOT NULL, end_at REAL NOT NULL,
                PRIMARY KEY(guild_id, channel_id, start_at, end_at)
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
        inserted = 0
        for message in messages:
            cursor = await self.db.execute(
                "INSERT OR IGNORE INTO daily_chatter_messages VALUES (?, ?, ?, ?)",
                (message.id, self.guild_id, message.author.id, message.created_at.timestamp()),
            )
            inserted += max(cursor.rowcount, 0)
        await self.db.commit()
        return inserted

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
            "SELECT 1 FROM daily_chatter_reconciled "
            "WHERE guild_id=? AND channel_id=? AND start_at=? AND end_at=?",
            (self.guild_id, channel_id, start.timestamp(), end.timestamp()),
        ) as cursor:
            return await cursor.fetchone() is not None

    async def mark_reconciled(self, channel_id, start, end):
        await self.db.execute(
            "INSERT OR IGNORE INTO daily_chatter_reconciled VALUES (?, ?, ?, ?)",
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
            "DELETE FROM daily_chatter_reconciled WHERE guild_id=? AND end_at<?",
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


class DailyChatterCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
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
            alive = await self.store.get_state("alive_at")
            since = (datetime.fromtimestamp(float(alive), UTC) - HEARTBEAT_OVERLAP) if alive else floor
            self.catchup_from = max(since, floor)
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
        if self.enabled and self.catchup_from is None:
            self.catchup_from = datetime.now(UTC) - HEARTBEAT_OVERLAP

    @commands.Cog.listener()
    async def on_message(self, message):
        if not self.enabled or not is_eligible_message(message, self.bot.config.guild_id):
            return
        try:
            await self.store.record(message)
        except Exception as exc:  # never lose a message silently
            self.record_failures += 1
            self.last_error = f"record failed: {exc!r}"
            log.exception("Daily chatter could not record message %s", message.id)
            # The history backfill will pick it up from the checkpoint.
            created = message.created_at - HEARTBEAT_OVERLAP
            self.catchup_from = min(self.catchup_from or created, created)

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
            if member is None and hasattr(guild, "fetch_member"):
                try:
                    member = await guild.fetch_member(uid)
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

    async def eligible_channels(self, guild, start, result):
        channels, seen = [], set()

        def add(channel):
            if channel.id not in seen and not is_excluded_channel(channel):
                seen.add(channel.id)
                channels.append(channel)

        for channel in [*getattr(guild, "text_channels", []), *getattr(guild, "voice_channels", []),
                        *getattr(guild, "stage_channels", [])]:
            add(channel)
        for thread in getattr(guild, "threads", []):
            add(thread)
        parents = [*getattr(guild, "text_channels", []), *getattr(guild, "forum_channels", [])]
        for parent in parents:
            if is_excluded_channel(parent):
                continue
            try:
                async for thread in parent.archived_threads(limit=None):
                    stamp = getattr(thread, "archive_timestamp", None)
                    if stamp is not None and stamp < start:
                        break  # newest-archived first: nothing older can hold window messages
                    add(thread)
            except discord.Forbidden:
                result.inaccessible.append(parent.id)
            except (discord.HTTPException, OSError, asyncio.TimeoutError):
                result.failed.append(parent.id)
        return channels

    async def backfill(self, guild, start, end, *, mark_window=None) -> BackfillResult:
        """Record every eligible message in [start, end) found in Discord history.

        mark_window=(win_start, win_end) records per-channel completion so a closed
        window is never rescanned after a successful pass.
        """
        result = BackfillResult()
        channels = await self.eligible_channels(guild, start, result)
        for channel in channels:
            if mark_window and await self.store.is_reconciled(channel.id, *mark_window):
                continue
            batch = []
            try:
                async for message in channel.history(limit=None, after=start, before=end, oldest_first=True):
                    result.scanned += 1
                    if is_eligible_message(message, self.bot.config.guild_id):
                        batch.append(message)
                result.recovered += await self.store.record_many(batch)
                if mark_window:
                    await self.store.mark_reconciled(channel.id, *mark_window)
            except discord.Forbidden:
                result.inaccessible.append(channel.id)
            except discord.NotFound:
                continue  # channel/thread deleted meanwhile
            except (discord.HTTPException, OSError, asyncio.TimeoutError) as exc:
                # Keep what was fetched so far; the channel stays un-marked and is retried.
                result.recovered += await self.store.record_many(batch)
                result.failed.append(channel.id)
                log.warning("Daily chatter history read failed for channel %s: %r", channel.id, exc)
        self.last_backfill = result
        log.info(
            "Daily chatter backfill %s..%s: scanned=%d recovered=%d inaccessible=%s failed=%s",
            start.isoformat(), end.isoformat(), result.scanned, result.recovered,
            result.inaccessible, result.failed,
        )
        return result

    async def run_catchup(self, guild):
        if self.catchup_from is None:
            return
        started, now = self.catchup_from, datetime.now(UTC)
        result = await self.backfill(guild, started, now + timedelta(seconds=1))
        if result.complete:
            # Only clear if nothing newer asked for an earlier scan meanwhile.
            if self.catchup_from == started:
                self.catchup_from = None
        else:
            self.last_error = f"catch-up incomplete for channels {result.failed}"

    async def reconcile_window(self, guild, end):
        start = end - timedelta(days=1)
        result = await self.backfill(guild, start, end, mark_window=(start, end))
        if not result.complete:
            raise ReconciliationIncomplete(
                f"history for {len(result.failed)} channel(s) could not be read: {result.failed}"
            )
        return result

    # ---- announcement lookup (idempotency across lost databases) ----------

    async def find_announcement(self, channel, end):
        me = getattr(self.bot, "user", None)
        if me is None or not hasattr(channel, "history"):
            return None
        label = f"({day_label(end)})"
        async for message in channel.history(limit=50, after=end, oldest_first=False):
            if (message.author.id == me.id and message.content.startswith(ANNOUNCEMENT_PREFIX)
                    and label in message.content.splitlines()[0]):
                return message
        return None

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
        try:
            async with self.lock:
                guild = self.bot.get_guild(self.bot.config.guild_id)
                if guild is not None:
                    await self.run_catchup(guild)
                    if self.catchup_from is None:
                        await self.store.set_state("alive_at", datetime.now(UTC).timestamp())
                await self.award(latest_boundary(datetime.now(UTC)))
        except ReconciliationIncomplete as exc:
            reason = str(exc)
            if reason != self.delay_reason:
                log.warning("Daily chatter award delayed: %s", reason)
            self.delay_reason = reason
            await self.store.set_state("delay_reason", reason)
        except Exception as exc:
            self.last_error = repr(exc)
            log.exception("Daily chatter handover failed; retrying in 30 seconds")

    @refresh.before_loop
    async def before_refresh(self):
        await self.bot.wait_until_ready()

    async def award(self, end):
        state = await self.store.run(end)
        if state and state[2]:
            return
        guild = self.bot.get_guild(self.bot.config.guild_id)
        if guild is None:
            raise RuntimeError("Daily chatter guild is unavailable")
        role = guild.get_role(self.bot.config.daily_chatter_role_id)
        if role is None:
            raise RuntimeError("Daily chatter role is missing")
        channel = self.bot.get_channel(self.bot.config.daily_chatter_channel_id)
        if channel is None:
            channel = await self.bot.fetch_channel(self.bot.config.daily_chatter_channel_id)
        if channel.guild.id != guild.id:
            raise RuntimeError("Daily chatter channel must be in the configured guild")
        if state is None:
            # A lost/fresh database must not repeat an award that was already posted.
            existing = await self.find_announcement(channel, end)
            if existing is not None:
                log.warning("Daily chatter award for %s already announced (message %s); adopting it",
                            end.isoformat(), existing.id)
                await self.store.save(end, [], existing.id, completed=True)
                return
            # Never rank an unverified window: this raises if history is unreadable.
            await self.reconcile_window(guild, end)
            ranking = await self.build_ranking(guild, end)
            total, unique, top = await self.store.summary(end)
            last = await self.store.last_message_at()
            log.info("Daily chatter window ending %s: messages=%d unique_users=%d top3=%s last_recorded=%s",
                     end.isoformat(), total, unique, top, last.isoformat() if last else None)
            await self.store.save(end, ranking)
            message_id = None
        else:
            ranking, message_id, _ = state
        self.delay_reason = None
        # Fetch everyone: role.members may be incomplete after a cold start.
        members = {member.id: member async for member in guild.fetch_members(limit=None)}
        # A member who leaves before a retry cannot retain the day's award.
        valid = await self.resolve_members(guild, [uid for uid, _ in ranking])
        ranking = [entry for entry in ranking if entry[0] in valid]
        for uid, member in valid.items():
            members.setdefault(uid, member)
        winner = members[ranking[0][0]] if ranking else None
        # Remove ALL stale holders before adding the new winner. If removal fails,
        # abort and retry without ever granting a second copy of the role.
        for member in members.values():
            if role in member.roles and (winner is None or member.id != winner.id):
                await member.remove_roles(role, reason="Daily top chatter: previous award expired")
        if winner is not None and role not in winner.roles:
            await winner.add_roles(role, reason="Daily top chatter: most messages in the 24h period")
        if ranking:
            if message_id is None:
                message = await channel.send(
                    announcement(ranking, end, role.id, mentions=False),
                    allowed_mentions=discord.AllowedMentions.none(),
                    silent=True,
                )
                message_id = message.id
                await self.store.save(end, ranking, message_id)
            else:
                message = channel.get_partial_message(message_id)
            # Listing the exact users lets Discord attach their profiles to the message so
            # clients render names instead of "@unknown-user"; the message was sent
            # silently and the role is never allowed to ping.
            await message.edit(
                content=announcement(ranking, end, role.id, mentions=True),
                allowed_mentions=discord.AllowedMentions(
                    everyone=False, roles=False, replied_user=False,
                    users=[discord.Object(id=uid) for uid, _ in ranking],
                ),
            )
        await self.store.save(end, ranking, message_id, completed=True)
        await self.store.set_state("delay_reason", None)
