"""Application-level cooldowns for background Discord operations."""
from __future__ import annotations

import asyncio
import logging
import math
import random
import time
from collections import Counter, deque
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import aiohttp
import discord

log = logging.getLogger(__name__)


class DeferredDiscordRequest(RuntimeError):
    """A background operation is waiting out an earlier failure."""


def headers_for(error):
    return getattr(getattr(error, "response", None), "headers", None) or {}


def is_edge_limit(error):
    if getattr(error, "status", None) != 429:
        return False
    headers = headers_for(error)
    return "1015" in (getattr(error, "text", None) or "") or "text/html" in headers.get("Content-Type", "").lower()


def retry_after(error):
    if isinstance(error, discord.RateLimited):
        return error.retry_after
    header = headers_for(error).get("Retry-After")
    if not header:
        return 0
    try:
        seconds = float(header)
    except ValueError:
        try:
            seconds = (parsedate_to_datetime(header) - datetime.now(timezone.utc)).total_seconds()
        except (TypeError, ValueError, OverflowError):
            return 0
    return max(0, seconds) if math.isfinite(seconds) else 0


def retry_delay(attempt, *, base=30, cap=1800):
    return min(cap, base * 2 ** min(attempt, 16)) * random.uniform(1, 1.25)


def http_status(error):
    return 429 if isinstance(error, discord.RateLimited) else getattr(error, "status", None)


async def collect(iterator):
    return [item async for item in iterator]


def complete_member_cache(guild):
    # discord.py's chunked property checks the expected member count against
    # the current cache. An unavailable guild cannot validate that snapshot.
    return bool(getattr(guild, "chunked", False) and not getattr(guild, "unavailable", False))


async def ensure_member_cache(guild, api):
    if not complete_member_cache(guild):
        async with api.member_cache_lock:
            if not complete_member_cache(guild):
                await api.call("member_chunk", guild.id, lambda: asyncio.wait_for(guild.chunk(), timeout=45))
    if not complete_member_cache(guild):
        raise DeferredDiscordRequest("The full guild member cache is unavailable")


def role_manageable(guild, role, member=None):
    me = getattr(guild, "me", None)
    if me is None:
        return not isinstance(guild, discord.Guild)
    if not me.guild_permissions.manage_roles or role.managed or role.is_default():
        return False
    if me.id == guild.owner_id:
        return True
    return me.top_role > role and (
        member is None or member.id == me.id
        or (member.id != guild.owner_id and me.top_role > member.top_role)
    )


class DiscordAPI:
    def __init__(self, *, clock=time.monotonic):
        self.clock = clock
        self.slots = asyncio.Semaphore(2)
        self.cooldowns = {}
        self.failures = {}
        self.global_until = 0
        self.totals = Counter()
        self.invalid = deque()
        self.next_report = clock() + 60
        self.has_http_trace = False
        self._channels = {}
        self._channel_lock = asyncio.Lock()
        self.member_cache_lock = asyncio.Lock()

    def trace_config(self):
        """Count actual REST responses, including retries hidden by discord.py."""
        trace = aiohttp.TraceConfig()
        trace.on_request_end.append(self._observe_response)
        self.has_http_trace = True
        return trace

    async def _observe_response(self, session, context, params):
        response = params.response
        status = response.status
        scope = response.headers.get("X-RateLimit-Scope", "").lower()
        now = self.clock()
        if status in (401, 403, 429) and not (status == 429 and scope == "shared"):
            self.invalid.append(now)
        if status == 429:
            kind = response.headers.get("Content-Type", "").lower()
            if "text/html" in kind:
                self.global_until = max(self.global_until, now + 4 * 3600)
        self.count("http_" + params.method.lower(), status)

    def invalidate_channel(self, channel_id):
        self._channels.pop(channel_id, None)
        for key in tuple(self.cooldowns):
            if key[1] == channel_id:
                self.cooldowns.pop(key, None)
                self.failures.pop(key, None)

    def invalidate_roles(self, guild_id):
        for key in tuple(self.cooldowns):
            if key[0] in ("role_add", "role_remove") and key[1][0] == guild_id:
                self.cooldowns.pop(key)
                self.failures.pop(key, None)

    async def resolve_channel(self, bot, channel_id):
        channel = bot.get_channel(channel_id)
        if channel is not None:
            return channel
        async with self._channel_lock:
            cached = self._channels.get(channel_id)
            if cached and cached[0] > self.clock():
                return cached[1]
            channel = await self.call("channel_lookup", channel_id, lambda: bot.fetch_channel(channel_id))
            self._channels[channel_id] = (self.clock() + 300, channel)
            return channel

    def count(self, operation, result):
        self.totals[operation, result] += 1
        now = self.clock()
        while self.invalid and self.invalid[0] <= now - 600:
            self.invalid.popleft()
        if now >= self.next_report:
            # Keep active and recently expired entries so repeated failures
            # increase their backoff, while old resource IDs can be collected.
            for key, until in tuple(self.cooldowns.items()):
                if until <= now - 3600:
                    self.cooldowns.pop(key)
                    self.failures.pop(key, None)
            self._channels = {key: entry for key, entry in self._channels.items() if entry[0] > now}
            log.info("Discord API window operations=%s invalid_10m=%d global_cooldown_s=%d",
                     {f"{op}:{outcome}": n for (op, outcome), n in self.totals.items()},
                     len(self.invalid), max(0, self.global_until - now))
            self.totals.clear()
            self.next_report = now + 60

    def _check(self, key):
        if self.clock() < max(self.global_until, self.cooldowns.get(key, 0)):
            self.count(key[0], "deferred")
            raise DeferredDiscordRequest(f"{key[0]} is in cooldown")

    def _failure(self, key, error, *, cache_missing):
        status = http_status(error)
        headers = headers_for(error)
        scope = headers.get("X-RateLimit-Scope", "").lower()
        now = self.clock()
        if not self.has_http_trace and status in (401, 403, 429) and not (status == 429 and scope == "shared"):
            self.invalid.append(now)
        self.count(key[0], status or type(error).__name__)
        edge = is_edge_limit(error)
        global_limit = status == 401 or edge or (
            status == 429 and (scope == "global" or headers.get("X-RateLimit-Global") == "true")
        )
        if status == 401:
            delay = 3600
        elif edge:
            delay = max(4 * 3600, retry_after(error))
        elif status == 429:
            delay = max(30, retry_after(error))
        elif status == 403:
            delay = 300
        elif status == 404:
            channel_gone = getattr(error, "code", None) == 10003 and isinstance(key[1], int)
            if channel_gone:
                self._channels.pop(key[1], None)
                self.cooldowns["channel_lookup", key[1]] = now + 900
            delay = 900 if cache_missing or channel_gone else 0
        else:
            attempt = self.failures.get(key, 0)
            self.failures[key] = attempt + 1
            delay = retry_delay(attempt, base=5, cap=300)
        if delay:
            if global_limit:
                self.global_until = max(self.global_until, now + delay)
            else:
                self.cooldowns[key] = now + delay
            log.warning("Discord background cooldown operation=%s status=%s scope=%s seconds=%.0f",
                        key[0], status, "global" if global_limit else "resource", delay)

    async def call(self, operation, resource, action, *, cache_missing=True):
        key = (operation, resource)
        self._check(key)
        async with self.slots:
            self._check(key)
            try:
                result = await action()
            except (discord.HTTPException, discord.RateLimited, OSError, TimeoutError) as exc:
                self._failure(key, exc, cache_missing=cache_missing)
                raise
            self.cooldowns.pop(key, None)
            self.failures.pop(key, None)
            self.count(operation, "ok")
            return result


def background_api(bot):
    api = getattr(bot, "discord_api", None)
    return api if api is not None else DiscordAPI()
