from __future__ import annotations

import asyncio
import tempfile
import unittest
from pathlib import Path
from dataclasses import replace
from types import SimpleNamespace

import discord

from octotracker.announcements import Announcement
from octotracker.config import Config
from octotracker.database import Database
from octotracker.monitor import Monitor

CHANNEL = 1547025378479181895
ANNOUNCEMENT_ROLE = 1562868331885633579
PATCH_NOTE_ROLE = 1562868317193248939


class _Channel:
    def __init__(self):
        self.id = CHANNEL
        self.sent: list[dict] = []

    async def send(self, **kwargs):
        self.sent.append(kwargs)
        return SimpleNamespace(id=100 + len(self.sent))


class _Client:
    """Returns one topic, already carrying its body so enrich does nothing."""

    def __init__(self, topics: list[Announcement]):
        self.topics = topics

    async def fetch_topics(self):
        return self.topics

    async def enrich(self, announcement):
        return announcement


def _topic(topic_id: int, title: str, body: str) -> Announcement:
    return Announcement(
        topic_id=topic_id,
        title=title,
        url=f"https://octowow.st/forum/viewtopic.php?t={topic_id}",
        author="Kestrel",
        body=body,
        content_source="forum-first-post",
    )


class ForumPingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.db = Database(Path(self.temp.name) / "octobot.db")
        await self.db.connect()
        self.channel = _Channel()
        self.config = Config(
            token="t", guild_id=1, status_channel_id=None, alert_channel_id=None,
            announcement_channel_id=CHANNEL,
        )

    async def asyncTearDown(self) -> None:
        await self.db.close()
        self.temp.cleanup()

    def monitor(self, announcements=(), patches=(), **config_overrides) -> Monitor:
        channel = self.channel
        config = replace(self.config, **config_overrides) if config_overrides else self.config

        class _Bot:
            user = SimpleNamespace(id=1)

            def get_channel(self, channel_id):
                return channel if channel_id == CHANNEL else None

        return Monitor(
            bot=_Bot(), config=config, database=self.db,
            status_client=None, auth_probe=None,
            announcement_client=_Client(list(announcements)),
            patch_note_client=_Client(list(patches)),
        )

    async def test_a_new_announcement_pings_the_announcement_role(self) -> None:
        monitor = self.monitor(announcements=[_topic(1, "Seed", "Old news")])
        await monitor.check_announcements()  # first run seeds, posts nothing
        self.assertEqual(self.channel.sent, [])

        monitor.announcement_client.topics.append(_topic(2, "New", "Fresh news"))
        await monitor.check_announcements()
        self.assertEqual(len(self.channel.sent), 1)
        sent = self.channel.sent[0]
        self.assertEqual(sent["content"], f"<@&{ANNOUNCEMENT_ROLE}>")
        self.assertEqual([role.id for role in sent["allowed_mentions"].roles], [ANNOUNCEMENT_ROLE])

    async def test_a_new_patch_note_pings_the_patch_note_role(self) -> None:
        monitor = self.monitor(
            patches=[_topic(10, "Seed", "Old patch")], patch_note_channel_id=CHANNEL
        )
        await monitor.check_patch_notes()
        self.assertEqual(self.channel.sent, [])

        monitor.patch_note_client.topics.append(_topic(11, "2026-10-22", "Fresh patch"))
        await monitor.check_patch_notes()
        self.assertEqual(len(self.channel.sent), 1)
        self.assertEqual(self.channel.sent[0]["content"], f"<@&{PATCH_NOTE_ROLE}>")

    async def test_a_long_post_pings_only_on_its_first_page(self) -> None:
        monitor = self.monitor(announcements=[_topic(1, "Seed", "Old")])
        await monitor.check_announcements()
        # Long enough to split into several embeds.
        monitor.announcement_client.topics.append(_topic(2, "Long", "word " * 4000))
        await monitor.check_announcements()

        self.assertGreater(len(self.channel.sent), 1, "expected a multi-page post")
        self.assertEqual(self.channel.sent[0]["content"], f"<@&{ANNOUNCEMENT_ROLE}>")
        for page in self.channel.sent[1:]:
            self.assertIsNone(page["content"])
            self.assertFalse(page["allowed_mentions"].roles)

    async def test_no_role_configured_means_no_ping(self) -> None:
        monitor = self.monitor(
            announcements=[_topic(1, "Seed", "Old")], announcement_ping_role_id=None
        )
        await monitor.check_announcements()
        monitor.announcement_client.topics.append(_topic(2, "New", "Fresh"))
        await monitor.check_announcements()
        self.assertEqual(len(self.channel.sent), 1)
        self.assertIsNone(self.channel.sent[0]["content"])
        self.assertFalse(self.channel.sent[0]["allowed_mentions"].roles)

    async def test_the_two_feeds_use_their_own_roles(self) -> None:
        self.assertNotEqual(ANNOUNCEMENT_ROLE, PATCH_NOTE_ROLE)
        config = Config(
            token="t", guild_id=1, status_channel_id=None, alert_channel_id=None,
            announcement_channel_id=CHANNEL,
        )
        self.assertEqual(config.announcement_ping_role_id, ANNOUNCEMENT_ROLE)
        self.assertEqual(config.patch_note_ping_role_id, PATCH_NOTE_ROLE)

    async def test_an_everyone_ping_is_never_allowed(self) -> None:
        monitor = self.monitor(announcements=[_topic(1, "Seed", "Old")])
        await monitor.check_announcements()
        monitor.announcement_client.topics.append(_topic(2, "New", "Fresh @everyone"))
        await monitor.check_announcements()
        mentions = self.channel.sent[0]["allowed_mentions"]
        self.assertFalse(mentions.everyone)
        self.assertFalse(mentions.users)


if __name__ == "__main__":
    unittest.main()
