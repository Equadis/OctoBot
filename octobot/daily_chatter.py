"""Persistent, raw message counts and the daily 17:00 UTC Exalted handover."""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

import aiosqlite
import discord
from discord.ext import commands, tasks

log = logging.getLogger(__name__)
UTC = timezone.utc
EXCLUDED_CHANNEL_IDS = frozenset({1547025818914525254, 1547064843909988433})


def latest_boundary(now: datetime) -> datetime:
    now = now.astimezone(UTC)
    boundary = now.replace(hour=17, minute=0, second=0, microsecond=0)
    return boundary if now >= boundary else boundary - timedelta(days=1)


def day_label(day: datetime) -> str:
    n = day.day
    suffix = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix} {day:%b}"


def announcement(ranking: list, end: datetime, role_id: int, *, mentions: bool) -> str:
    def user(index):
        return f"<@{ranking[index][0]}>" if mentions else "@"

    role = f"<@&{role_id}>" if mentions else "Exalted"
    lines = [
        f"# Top Daily Chatter: {user(0)} - ({day_label(end)})",
        f"{user(0)} is our top chatter of the day with {ranking[0][1]} messages "
        f"and has been awarded the {role} role for the day!",
    ]
    for index, place in ((1, "2nd"), (2, "3rd")):
        if len(ranking) > index:
            lines.append(f"{place} place: {user(index)} - {ranking[index][1]} messages")
    return "\n".join(lines)


class ChatterStore:
    def __init__(self, path, guild_id):
        self.path = path
        self.guild_id = guild_id
        self.db = None

    async def connect(self, now):
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
        """)
        # First installation starts tracking now and awards at the next boundary.
        # Existing databases retain their checkpoint, so restarts catch up once.
        async with self.db.execute(
            "SELECT 1 FROM daily_chatter_runs WHERE guild_id=? LIMIT 1", (self.guild_id,)
        ) as cursor:
            exists = await cursor.fetchone()
        if not exists:
            await self.db.execute(
                "INSERT INTO daily_chatter_runs VALUES (?, ?, '[]', NULL, 1)",
                (self.guild_id, latest_boundary(now).timestamp()),
            )
        await self.db.commit()

    async def record(self, message):
        await self.db.execute(
            "INSERT OR IGNORE INTO daily_chatter_messages VALUES (?, ?, ?, ?)",
            (message.id, self.guild_id, message.author.id, message.created_at.timestamp()),
        )
        await self.db.commit()

    async def counts(self, end):
        async with self.db.execute(
            "SELECT user_id, COUNT(*) FROM daily_chatter_messages "
            "WHERE guild_id=? AND sent_at>=? AND sent_at<? "
            "GROUP BY user_id ORDER BY COUNT(*) DESC, user_id ASC",
            (self.guild_id, (end - timedelta(days=1)).timestamp(), end.timestamp()),
        ) as cursor:
            return await cursor.fetchall()

    async def run(self, end):
        async with self.db.execute(
            "SELECT ranking, message_id, completed FROM daily_chatter_runs WHERE guild_id=? AND end_at=?",
            (self.guild_id, end.timestamp()),
        ) as cursor:
            row = await cursor.fetchone()
        return (json.loads(row[0]), row[1], bool(row[2])) if row else None

    async def save(self, end, ranking, message_id=None, completed=False):
        await self.db.execute(
            "INSERT OR REPLACE INTO daily_chatter_runs VALUES (?, ?, ?, ?, ?)",
            (self.guild_id, end.timestamp(), json.dumps(ranking), message_id, int(completed)),
        )
        # Keep enough history to retry yesterday's job after a restart.
        await self.db.execute(
            "DELETE FROM daily_chatter_messages WHERE guild_id=? AND sent_at<?",
            (self.guild_id, (end - timedelta(days=2)).timestamp()),
        )
        await self.db.commit()

    async def close(self):
        if self.db is not None:
            await self.db.close()


class DailyChatterCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.store = ChatterStore(bot.config.database_path, bot.config.guild_id)
        self.lock = asyncio.Lock()
        self.enabled = bool(bot.config.daily_chatter_role_id and bot.config.daily_chatter_channel_id)

    async def cog_load(self):
        if self.enabled:
            await self.store.connect(datetime.now(UTC))
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
    async def on_message(self, message):
        if (not self.enabled or message.guild is None
                or message.guild.id != self.bot.config.guild_id
                or message.author.bot or message.webhook_id is not None
                or message.is_system()):
            return
        if (message.channel.id in EXCLUDED_CHANNEL_IDS
                or getattr(message.channel, "parent_id", None) in EXCLUDED_CHANNEL_IDS):
            return
        async with self.lock:
            await self.store.record(message)

    @tasks.loop(seconds=30)
    async def refresh(self):
        try:
            async with self.lock:
                await self.award(latest_boundary(datetime.now(UTC)))
        except Exception:
            # A permissions/network failure must not permanently stop tomorrow's job.
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
        # Fetch everyone: role.members may be incomplete after a cold start.
        members = {member.id: member async for member in guild.fetch_members(limit=None)}
        if state is None:
            ranking = [(uid, count) for uid, count in await self.store.counts(end)
                       if uid in members and not members[uid].bot][:3]
            await self.store.save(end, ranking)
            message_id = None
        else:
            ranking, message_id, _ = state
        # A member who leaves before a retry cannot retain the day's award.
        ranking = [entry for entry in ranking if entry[0] in members and not members[entry[0]].bot]
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
                )
                message_id = message.id
                await self.store.save(end, ranking, message_id)
            else:
                message = channel.get_partial_message(message_id)
            await message.edit(
                content=announcement(ranking, end, role.id, mentions=True),
                allowed_mentions=discord.AllowedMentions.none(),
            )
        await self.store.save(end, ranking, message_id, completed=True)
