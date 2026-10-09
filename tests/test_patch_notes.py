from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from octotracker.announcements import (
    FORUM_URL,
    PATCH_NOTES_URL,
    Announcement,
    AnnouncementClient,
)
from octotracker.database import Database
from octotracker.embeds import announcement_embeds


def _topic(topic_id: int, title: str, body: str = "Body") -> Announcement:
    return Announcement(
        topic_id=topic_id,
        title=title,
        url=f"https://octowow.st/forum/viewtopic.php?t={topic_id}",
        author="Kestrel",
        body=body,
        content_source="forum-first-post",
    )


class PatchNoteClientTests(unittest.TestCase):
    def test_the_two_clients_read_different_forums(self) -> None:
        announcements = AnnouncementClient(session=None)
        patches = AnnouncementClient(session=None, forum_url=PATCH_NOTES_URL, news_url=None)
        self.assertEqual(announcements.forum_url, FORUM_URL)
        self.assertIn("f=2", announcements.forum_url)
        self.assertEqual(patches.forum_url, PATCH_NOTES_URL)
        self.assertIn("f=4", patches.forum_url)
        # The news feed carries announcements only, so patch notes have no fallback.
        self.assertIsNotNone(announcements.news_url)
        self.assertIsNone(patches.news_url)


class PatchNoteEmbedTests(unittest.TestCase):
    def test_the_footer_and_colour_say_which_kind_it_is(self) -> None:
        topic = _topic(2816, "2026-10-06")
        patch = announcement_embeds(topic, kind="patch_note")[0]
        announcement = announcement_embeds(topic)[0]
        self.assertIn("patch notes", patch.footer.text)
        self.assertIn("Topic 2816", patch.footer.text)
        self.assertIn("announcement", announcement.footer.text)
        self.assertNotEqual(patch.colour, announcement.colour)
        self.assertEqual(patch.title, "2026-10-06")


class PatchNoteStorageTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.db = Database(Path(self.temp.name) / "octobot.db")
        await self.db.connect()

    async def asyncTearDown(self) -> None:
        await self.db.close()
        self.temp.cleanup()

    async def test_the_two_kinds_do_not_see_each_other(self) -> None:
        await self.db.store_announcement(_topic(100, "Announcement"))
        await self.db.store_announcement(_topic(200, "2026-10-06"), kind="patch_note")

        self.assertEqual(await self.db.known_topic_ids(), {100})
        self.assertEqual(await self.db.known_topic_ids("patch_note"), {200})
        self.assertEqual((await self.db.latest_announcement()).topic_id, 100)
        self.assertEqual((await self.db.latest_announcement("patch_note")).topic_id, 200)
        self.assertEqual(
            [item.topic_id for item in await self.db.pending_announcements()], [100]
        )
        self.assertEqual(
            [item.topic_id for item in await self.db.pending_announcements("patch_note")], [200]
        )

        # Delivering one kind leaves the other pending.
        await self.db.mark_announcement_sent(100)
        self.assertEqual(await self.db.pending_announcements(), [])
        self.assertEqual(
            [item.topic_id for item in await self.db.pending_announcements("patch_note")], [200]
        )

    async def test_seeding_is_tracked_per_kind(self) -> None:
        self.assertFalse(await self.db.announcements_initialized())
        self.assertFalse(await self.db.announcements_initialized("patch_note"))

        await self.db.seed_announcements([_topic(100, "Announcement")])
        self.assertTrue(await self.db.announcements_initialized())
        self.assertFalse(await self.db.announcements_initialized("patch_note"))

        await self.db.seed_announcements([_topic(200, "2026-10-06")], "patch_note")
        self.assertTrue(await self.db.announcements_initialized("patch_note"))
        # Seeded rows count as already delivered, so nothing is back-posted.
        self.assertEqual(await self.db.pending_announcements("patch_note"), [])

    async def test_rows_written_before_patch_notes_existed_stay_announcements(self) -> None:
        import sqlite3

        path = Path(self.temp.name) / "old.db"
        con = sqlite3.connect(path)
        con.executescript(
            """
            CREATE TABLE announcements (
                topic_id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT,
                published_at TEXT,
                preview TEXT,
                body TEXT,
                content_source TEXT,
                url TEXT NOT NULL,
                discovered_at TEXT NOT NULL,
                announced INTEGER NOT NULL DEFAULT 0,
                delivery_pages_sent INTEGER NOT NULL DEFAULT 0
            );
            INSERT INTO announcements(topic_id, title, url, discovered_at, announced)
                VALUES (55, 'Old post', 'https://octowow.st/forum/viewtopic.php?t=55', '2026-01-01', 1);
            """
        )
        con.commit()
        con.close()

        old = Database(path)
        await old.connect()
        try:
            self.assertEqual(await old.known_topic_ids(), {55})
            self.assertEqual(await old.known_topic_ids("patch_note"), set())
        finally:
            await old.close()


if __name__ == "__main__":
    unittest.main()
