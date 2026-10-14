from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

import discord

from octotracker.config import Config
from octotracker.database import Database
from octotracker.monitor import (
    ALERT_EMBED_TITLES,
    AUTH_DIAGNOSTIC_TITLES,
    STATUS_EMBED_TITLE,
    STATUS_EMBED_TITLES,
    Monitor,
)

CHANNEL = 555
BOT_ID = 1
SOMEONE_ELSE = 2


class _Message:
    def __init__(self, message_id: int, author_id: int = BOT_ID, title: str | None = STATUS_EMBED_TITLE):
        self.id = message_id
        self.author = SimpleNamespace(id=author_id)
        self.embeds = [SimpleNamespace(title=title)] if title is not None else []
        self.edits: list = []
        self.deleted = False

    async def edit(self, **kwargs):
        self.edits.append(kwargs)

    async def delete(self):
        self.deleted = True


class _Channel:
    """Newest-first history, like discord.py's."""

    def __init__(self, messages: list[_Message] | None = None, *, missing: set[int] | None = None):
        self.id = CHANNEL
        self.messages = messages or []
        self.missing = missing or set()
        self.sent: list = []

    async def fetch_message(self, message_id: int):
        if message_id in self.missing:
            raise discord.NotFound(SimpleNamespace(status=404, reason="x"), "gone")
        for message in self.messages:
            if message.id == message_id:
                return message
        raise discord.NotFound(SimpleNamespace(status=404, reason="x"), "gone")

    async def history(self, limit: int = 50):
        for message in self.messages[:limit]:
            yield message

    async def send(self, **kwargs):
        message = _Message(900 + len(self.sent))
        self.sent.append(kwargs)
        self.messages.insert(0, message)
        return message


class _Bot:
    def __init__(self, channel: _Channel):
        self.user = SimpleNamespace(id=BOT_ID)
        self._channel = channel

    def get_channel(self, channel_id):
        return self._channel if channel_id == CHANNEL else None


class StatusMessageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.db = Database(Path(self.temp.name) / "octobot.db")
        await self.db.connect()
        self.config = Config(
            token="t", guild_id=1, status_channel_id=CHANNEL,
            alert_channel_id=None, announcement_channel_id=None,
        )

    async def asyncTearDown(self) -> None:
        await self.db.close()
        self.temp.cleanup()

    def monitor(self, channel: _Channel) -> Monitor:
        bot = _Bot(channel)
        monitor = Monitor(
            bot=bot, config=self.config, database=self.db,
            status_client=None, auth_probe=None, announcement_client=None,
        )
        # The embed content is irrelevant here; only which message carries it.
        async def fake_embed(snapshot):
            return discord.Embed(title=STATUS_EMBED_TITLE)
        monitor.make_status_embed = fake_embed
        return monitor

    @property
    def key(self) -> str:
        return f"status_message_id:{CHANNEL}"

    async def test_the_first_poll_sends_one_message_and_remembers_it(self) -> None:
        channel = _Channel()
        monitor = self.monitor(channel)
        await monitor._update_status_message(None)
        self.assertEqual(len(channel.sent), 1)
        self.assertEqual(await self.db.get_metadata(self.key), "900")

    async def test_later_polls_edit_that_message_and_never_send_again(self) -> None:
        existing = _Message(42)
        channel = _Channel([existing])
        await self.db.set_metadata(self.key, "42")
        monitor = self.monitor(channel)
        for _ in range(5):
            await monitor._update_status_message(None)
        self.assertEqual(channel.sent, [])
        self.assertEqual(len(existing.edits), 5)

    async def test_a_lost_id_adopts_the_message_already_there(self) -> None:
        # A fresh database, or cleared metadata, must not add a second message.
        existing = _Message(42)
        channel = _Channel([existing])
        monitor = self.monitor(channel)
        await monitor._update_status_message(None)
        self.assertEqual(channel.sent, [])
        self.assertEqual(len(existing.edits), 1)
        self.assertEqual(await self.db.get_metadata(self.key), "42")

    async def test_duplicates_already_in_the_channel_are_cleaned_up(self) -> None:
        newest, older, oldest = _Message(50), _Message(40), _Message(30)
        channel = _Channel([newest, older, oldest])
        monitor = self.monitor(channel)
        await monitor._update_status_message(None)
        self.assertEqual(channel.sent, [])
        self.assertEqual(len(newest.edits), 1)
        self.assertFalse(newest.deleted)
        self.assertTrue(older.deleted)
        self.assertTrue(oldest.deleted)
        self.assertEqual(await self.db.get_metadata(self.key), "50")

    async def test_other_messages_in_the_channel_are_left_alone(self) -> None:
        someone_else = _Message(60, author_id=SOMEONE_ELSE)
        alert = _Message(61, title="OctoWoW is back online")
        plain = _Message(62, title=None)
        channel = _Channel([someone_else, alert, plain])
        monitor = self.monitor(channel)
        await monitor._update_status_message(None)
        # Nothing of ours was there, so one message is created and nothing deleted.
        self.assertEqual(len(channel.sent), 1)
        for message in (someone_else, alert, plain):
            self.assertFalse(message.deleted, message.id)
            self.assertEqual(message.edits, [])

    async def test_the_previous_octotracker_title_is_adopted(self) -> None:
        # Installs upgrading from before the rename must reuse their old message.
        old = _Message(80, title="OctoTracker — Server Status")
        channel = _Channel([old])
        monitor = self.monitor(channel)
        await monitor._update_status_message(None)
        self.assertEqual(channel.sent, [])
        self.assertEqual(len(old.edits), 1)
        self.assertEqual(await self.db.get_metadata(self.key), "80")

    async def test_alerts_and_diagnostics_each_keep_one_message(self) -> None:
        channel = _Channel()
        monitor = self.monitor(channel)
        alert = discord.Embed(title="🟠 Community connection issues reported")
        cleared = discord.Embed(title="🟢 Community reports cleared")
        diagnostic = discord.Embed(title="OctoWoW authentication diagnostic")

        await monitor._upsert_alert(CHANNEL, alert)
        await monitor._upsert_alert(CHANNEL, cleared)
        await monitor.upsert_standing_message(
            CHANNEL, f"auth_diagnostic_message_id:{CHANNEL}", diagnostic,
            AUTH_DIAGNOSTIC_TITLES, label="authentication diagnostic",
        )
        await monitor.upsert_standing_message(
            CHANNEL, f"auth_diagnostic_message_id:{CHANNEL}", diagnostic,
            AUTH_DIAGNOSTIC_TITLES, label="authentication diagnostic",
        )
        # One alert message and one diagnostic message, each edited after creation.
        self.assertEqual(len(channel.sent), 2)
        self.assertEqual(len(channel.messages), 2)

    async def test_every_alert_title_is_recognised_as_the_same_message(self) -> None:
        for title in ALERT_EMBED_TITLES:
            with self.subTest(title=title):
                channel = _Channel([_Message(10, title=title)])
                monitor = self.monitor(channel)
                await monitor._upsert_alert(CHANNEL, discord.Embed(title=title))
                self.assertEqual(channel.sent, [], title)

    async def test_the_status_message_and_an_alert_do_not_adopt_each_other(self) -> None:
        alert_message = _Message(10, title="🟢 Community reports cleared")
        channel = _Channel([alert_message])
        monitor = self.monitor(channel)
        await monitor._update_status_message(None)
        # The alert is not a status message, so a status message is created.
        self.assertEqual(len(channel.sent), 1)
        self.assertFalse(alert_message.deleted)
        self.assertEqual(alert_message.edits, [])

    async def test_a_deleted_stored_message_is_replaced_not_duplicated(self) -> None:
        survivor = _Message(70)
        channel = _Channel([survivor], missing={99})
        await self.db.set_metadata(self.key, "99")
        monitor = self.monitor(channel)
        await monitor._update_status_message(None)
        self.assertEqual(channel.sent, [])
        self.assertEqual(len(survivor.edits), 1)
        self.assertEqual(await self.db.get_metadata(self.key), "70")


if __name__ == "__main__":
    unittest.main()
