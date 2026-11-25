"""Run one Discord client at a time and let the platform deliver shutdown signals."""
from __future__ import annotations

import asyncio
import logging
import math
import time
import signal
import sqlite3

import aiohttp
import discord

from octobot.discord_api import http_status, is_edge_limit, retry_after, retry_delay

log = logging.getLogger(__name__)


async def run_bot(factory, token, *, cooldown_path=None):
    if cooldown_path is not None:
        try:
            remaining = float(cooldown_path.read_text()) - time.time()
        except FileNotFoundError:
            remaining = 0
        except (OSError, ValueError):
            log.error("Discord lifecycle cooldown could not be read")
            remaining = 4 * 3600
        if math.isfinite(remaining) and remaining > 0:
            log.warning("Discord lifecycle resuming saved cooldown delay_s=%.0f", remaining)
            await asyncio.sleep(remaining)
    attempt = 0
    while True:
        phase = "login"
        connected_since = None
        log.info("Discord lifecycle phase=%s attempt=%d", phase, attempt + 1)
        try:
            async with factory() as bot:
                await bot.login(token)
                phase = "gateway"
                log.info("Discord authentication succeeded")
                connected_since = time.monotonic()
                await bot.connect(reconnect=True)
            return
        except sqlite3.Error as exc:
            log.error("Discord lifecycle stopped phase=%s storage_error=%s", phase, type(exc).__name__)
            return
        except (discord.LoginFailure, discord.PrivilegedIntentsRequired) as exc:
            log.error("Discord lifecycle stopped phase=%s error=%s", phase, type(exc).__name__)
            return
        except (discord.HTTPException, discord.RateLimited, discord.GatewayNotFound,
                discord.ConnectionClosed, aiohttp.ClientError, OSError, TimeoutError) as exc:
            status = http_status(exc)
            if status in (401, 403, 404) or (
                isinstance(exc, discord.ConnectionClosed) and exc.code in (4004, 4010, 4011, 4012, 4013, 4014)
            ):
                log.error("Discord lifecycle stopped phase=%s status=%s error=%s",
                          phase, status, type(exc).__name__)
                return
            if connected_since is not None and time.monotonic() - connected_since > 300:
                attempt = 0
            edge = is_edge_limit(exc)
            minimum = 4 * 3600 if edge else 60 if status == 429 else 15
            delay = max(retry_after(exc), retry_delay(attempt, base=minimum, cap=max(minimum, 1800)))
            log.warning("Discord lifecycle retry phase=%s status=%s edge_limit=%s error=%s delay_s=%.0f",
                        phase, status, edge, type(exc).__name__, delay)
            if status == 429 and cooldown_path is not None:
                pending = cooldown_path.with_suffix(".discord-cooldown.tmp")
                try:
                    pending.write_text(str(time.time() + delay))
                    pending.replace(cooldown_path)
                except OSError:
                    log.error("Discord lifecycle cooldown could not be saved")
            attempt += 1
            await asyncio.sleep(delay)


async def serve(factory, token, *, cooldown_path=None):
    loop = asyncio.get_running_loop()
    worker = asyncio.create_task(run_bot(factory, token, cooldown_path=cooldown_path), name="discord-client")
    try:
        loop.add_signal_handler(signal.SIGTERM, worker.cancel)
    except NotImplementedError:  # Windows handles Ctrl+C through asyncio.run.
        pass
    try:
        await worker
    except asyncio.CancelledError:
        log.info("Discord lifecycle stopped on shutdown")
    finally:
        loop.remove_signal_handler(signal.SIGTERM)
