from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import discord

from octobot.bot import OctoBot
from octobot.command_sync import sync_commands
from octobot.discord_api import DeferredDiscordRequest, DiscordAPI, retry_after
from octobot.lifecycle import run_bot, serve
from octotracker.config import Config
from octotracker.database import Database


def error(status, body="", **headers):
    response = SimpleNamespace(status=status, reason="test", headers=headers)
    return discord.HTTPException(response, body)


class LifecycleTests(unittest.IsolatedAsyncioTestCase):
    class Bot:
        def __init__(self, login_error=None, *, connect=None):
            self.login = AsyncMock(side_effect=login_error)
            self.connect = connect or AsyncMock()
            self.closed = False

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            self.closed = True

    async def test_authentication_honours_header_and_closes_before_retry(self):
        first = self.Bot(error(429, **{"Retry-After": "180"}))
        second = self.Bot()
        attempts = iter([first, second])
        delays = []

        async def sleep(delay):
            self.assertTrue(first.closed)
            self.assertFalse(second.closed)
            delays.append(delay)

        with patch("octobot.lifecycle.asyncio.sleep", sleep):
            await run_bot(lambda: next(attempts), "token")
        self.assertEqual(delays, [180])
        second.connect.assert_awaited_once_with(reconnect=True)
        self.assertTrue(second.closed)

    async def test_cloudflare_error_is_sanitised_and_saved(self):
        first = self.Bot(error(429, "<html>1015 private content</html>"))
        second = self.Bot()
        attempts = iter([first, second])
        with tempfile.TemporaryDirectory() as folder:
            cooldown = Path(folder) / "bot.discord-cooldown"
            with self.assertLogs("octobot.lifecycle", logging.WARNING) as logs:
                with patch("octobot.lifecycle.asyncio.sleep", new_callable=AsyncMock) as sleep:
                    await run_bot(lambda: next(attempts), "token", cooldown_path=cooldown)
            self.assertGreaterEqual(sleep.await_args.args[0], 4 * 3600)
            self.assertGreater(float(cooldown.read_text()), 0)
            self.assertNotIn("private content", "\n".join(logs.output))

    async def test_existing_startup_cooldown_is_observed_before_factory(self):
        instance = self.Bot()
        with tempfile.TemporaryDirectory() as folder:
            cooldown = Path(folder) / "bot.discord-cooldown"
            cooldown.write_text("1000")
            with patch("octobot.lifecycle.time.time", return_value=700):
                with patch("octobot.lifecycle.asyncio.sleep", new_callable=AsyncMock) as sleep:
                    def factory():
                        sleep.assert_awaited_once_with(300)
                        return instance
                    await run_bot(factory, "token", cooldown_path=cooldown)
        instance.login.assert_awaited_once()

    async def test_invalid_credentials_and_permission_denials_end_after_one_attempt(self):
        for login_error in (discord.LoginFailure("secret"), error(403), error(401)):
            with self.subTest(kind=type(login_error), status=getattr(login_error, "status", None)):
                instance = self.Bot(login_error)
                await run_bot(lambda: instance, "token")
                instance.login.assert_awaited_once()
                instance.connect.assert_not_awaited()
                self.assertTrue(instance.closed)

    async def test_network_errors_back_off_exponentially(self):
        attempts = iter([self.Bot(ConnectionResetError()), self.Bot(TimeoutError()), self.Bot()])
        with patch("octobot.discord_api.random.uniform", return_value=1):
            with patch("octobot.lifecycle.asyncio.sleep", new_callable=AsyncMock) as sleep:
                await run_bot(lambda: next(attempts), "token")
        self.assertEqual([call.args[0] for call in sleep.await_args_list], [15, 30])

    async def test_sigterm_closes_client(self):
        entered_gateway = asyncio.Event()

        async def connect(**_):
            entered_gateway.set()
            await asyncio.Future()

        instance = self.Bot(connect=connect)
        loop = asyncio.get_running_loop()
        with patch.object(loop, "add_signal_handler") as register, patch.object(loop, "remove_signal_handler"):
            server = asyncio.create_task(serve(lambda: instance, "token"))
            await entered_gateway.wait()
            register.call_args.args[1]()
            await server
        self.assertTrue(instance.closed)

    async def test_octobot_closes_sqlite_even_when_a_worker_stop_fails(self):
        bot = OctoBot(Config("token", 100, None, None, None))
        bot.monitor = SimpleNamespace(stop=AsyncMock(side_effect=RuntimeError("worker stopped unexpectedly")))
        bot.radio_monitor = SimpleNamespace(stop=AsyncMock())
        bot.database.close = AsyncMock()
        bot.moderation_database.close = AsyncMock()
        async with bot:
            with self.assertRaises(RuntimeError):
                await bot.close()
        bot.radio_monitor.stop.assert_awaited_once()
        bot.moderation_database.close.assert_awaited_once()
        bot.database.close.assert_awaited_once()


class CooldownTests(unittest.IsolatedAsyncioTestCase):
    async def test_route_limit_does_not_stop_another_resource(self):
        now = 0
        api = DiscordAPI(clock=lambda: now)
        slow = AsyncMock(side_effect=error(429, **{"Retry-After": "120", "X-RateLimit-Scope": "shared"}))
        with self.assertRaises(discord.HTTPException):
            await api.call("channel_send", 1, slow)
        with self.assertRaises(DeferredDiscordRequest):
            await api.call("channel_send", 1, slow)
        self.assertEqual(len(api.invalid), 0)
        self.assertEqual(await api.call("channel_send", 2, AsyncMock(return_value="ok")), "ok")
        now = 120
        self.assertEqual(await api.call("channel_send", 1, AsyncMock(return_value="recovered")), "recovered")

    async def test_global_limit_defers_an_already_queued_operation(self):
        api = DiscordAPI(clock=lambda: 0)
        started, release, other_started = asyncio.Event(), asyncio.Event(), asyncio.Event()

        async def limited():
            started.set()
            await release.wait()
            raise error(429, **{"X-RateLimit-Global": "true", "Retry-After": "120"})

        async def ongoing():
            other_started.set()
            await release.wait()

        first = asyncio.create_task(api.call("channel_send", 1, limited))
        await started.wait()
        second = asyncio.create_task(api.call("channel_history", 2, ongoing))
        await other_started.wait()
        request = AsyncMock()
        queued = asyncio.create_task(api.call("message_edit", 3, request))
        await asyncio.sleep(0)
        release.set()
        with self.assertRaises(discord.HTTPException):
            await first
        await second
        with self.assertRaises(DeferredDiscordRequest):
            await queued
        request.assert_not_awaited()

    async def test_missing_channel_cache_is_shared_and_can_be_invalidated(self):
        bot = SimpleNamespace(get_channel=lambda _: None, fetch_channel=AsyncMock(side_effect=error(404)))
        api = DiscordAPI(clock=lambda: 0)
        with self.assertRaises(discord.HTTPException):
            await api.resolve_channel(bot, 5)
        with self.assertRaises(DeferredDiscordRequest):
            await api.resolve_channel(bot, 5)
        bot.fetch_channel.assert_awaited_once_with(5)
        api.invalidate_channel(5)
        bot.fetch_channel.side_effect = None
        bot.fetch_channel.return_value = "updated channel"
        self.assertEqual(await api.resolve_channel(bot, 5), "updated channel")
        self.assertEqual(await api.resolve_channel(bot, 5), "updated channel")
        self.assertEqual(bot.fetch_channel.await_count, 2)

    async def test_http_trace_counts_native_requests_without_double_counting(self):
        api = DiscordAPI(clock=lambda: 0)
        trace = api.trace_config()
        params = SimpleNamespace(method="GET", response=SimpleNamespace(status=403, headers={}))
        await trace.on_request_end[0](None, None, params)
        with self.assertRaises(discord.HTTPException):
            await api.call("channel_history", 11, AsyncMock(side_effect=error(403)))
        self.assertEqual(len(api.invalid), 1)
        self.assertEqual(api.totals["http_get", 403], 1)
        self.assertEqual(api.totals["channel_history", 403], 1)

    def test_retry_after_rejects_bad_values(self):
        for value in ("NaN", "Infinity", "-2", "unparseable"):
            self.assertEqual(retry_after(error(429, **{"Retry-After": value})), 0)
        self.assertEqual(retry_after(error(429, **{"Retry-After": "2.5"})), 2.5)


class SyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_command_schema_persists_and_changes_sync_again(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "existing.db"
            first = Database(path)
            await first.connect()
            self.addAsyncCleanup(first.close)
            await first.set_metadata("previous-data", "preserved")

            bot = OctoBot(Config("token", 555, None, None, None))
            tree = bot.tree
            tree.sync = AsyncMock(return_value=[])
            await sync_commands(tree, first, 333, bot.guild)
            self.assertEqual(tree.sync.await_count, 2)
            await first.close()

            reopened = Database(path)
            await reopened.connect()
            self.addAsyncCleanup(reopened.close)
            await sync_commands(tree, reopened, 333, bot.guild)
            self.assertEqual(tree.sync.await_count, 2)
            self.assertEqual(await reopened.get_metadata("previous-data"), "preserved")

            tree.get_command("status", guild=bot.guild).description = "Updated schema."
            tree.sync.side_effect = error(503)
            with self.assertRaises(discord.HTTPException):
                await sync_commands(tree, reopened, 333, bot.guild)
            tree.sync.side_effect = None
            await sync_commands(tree, reopened, 333, bot.guild)
            self.assertEqual(tree.sync.await_count, 4)
            await sync_commands(tree, reopened, 333, bot.guild, force=True)
            self.assertEqual(tree.sync.await_count, 5)
            self.assertEqual(tree.sync.await_args.kwargs, {"guild": bot.guild})

    def test_railway_validation_refuses_ephemeral_fallback(self):
        with tempfile.TemporaryDirectory() as folder:
            env = {"RAILWAY_ENVIRONMENT_ID": "production", "RAILWAY_VOLUME_MOUNT_PATH": folder}
            with patch.dict(os.environ, env, clear=True):
                Config("t", 1, None, None, None, database_path=Path(folder) / "octobot.db").validate_database_path()
                with self.assertRaises(RuntimeError):
                    Config("t", 1, None, None, None, database_path=Path("data/octobot.db")).validate_database_path()
                with self.assertRaises(RuntimeError):
                    Config("t", 1, None, None, None, database_path=Path(folder) / ".." / "octobot.db").validate_database_path()
