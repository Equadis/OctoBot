from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import discord

from entity_fixture import make_database
from octobot.discord_api import DiscordAPI
from octobot.entity_linking.cog import EntityLinkingCog
from octobot.entity_linking.database import EntityDatabase
from octobot.entity_linking.views import SelectionView
from octocop.database import Database as ModerationDatabase

GUILD = 123


class FakeReply:
    def __init__(self, message_id=9000):
        self.id = message_id
        self.deleted = False
        self.edits = []

    async def edit(self, **kwargs):
        self.edits.append(kwargs)

    async def delete(self):
        self.deleted = True


class FakeMessage:
    _next = 1

    def __init__(self, content, *, author_id=7, bot=False, webhook=False, channel_id=50, guild_id=GUILD,
                 can_send=True, reply_error=None, edited=False):
        FakeMessage._next += 1
        self.id = FakeMessage._next
        self.content = content
        self.author = SimpleNamespace(id=author_id, bot=bot)
        self.webhook_id = 1 if webhook else None
        self.type = discord.MessageType.default
        self.edited_at = object() if edited else None
        perms = SimpleNamespace(send_messages=can_send, send_messages_in_threads=can_send, embed_links=True,
                                read_message_history=True)
        self.channel = SimpleNamespace(id=channel_id, permissions_for=lambda _me: perms)
        self.guild = None if guild_id is None else SimpleNamespace(id=guild_id, me=object())
        self.reply_error = reply_error
        self.reply_calls = []
        self.sent = FakeReply(self.id + 100000)

    async def reply(self, **kwargs):
        self.reply_calls.append(kwargs)
        if self.reply_error:
            raise self.reply_error
        return self.sent


def http_error(status, cls=discord.HTTPException):
    response = SimpleNamespace(status=status, reason="x", headers={})
    return cls(response, "boom")


class EntityLinkingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.moderation = ModerationDatabase(Path(self.temp.name) / "octobot.db")
        await self.moderation.connect()
        self.addCleanup(self._close_moderation)
        self.entities = make_database(Path(self.temp.name) / "entities.sqlite")
        self.bot = SimpleNamespace(config=SimpleNamespace(guild_id=GUILD), moderation_database=self.moderation,
                                   discord_api=DiscordAPI())
        self.now = 1000.0
        self.cog = self.new_cog()

    async def _close_moderation(self):
        await self.moderation.close()

    def new_cog(self, path=None, **kw):
        database = EntityDatabase(path or self.entities)
        self.addCleanup(database.close)
        kw.setdefault("grace", 0)
        return EntityLinkingCog(self.bot, database, clock=lambda: self.now, **kw)

    # ------------------------------------------------------------------ basic behaviour
    async def test_replies_with_embed_without_pinging(self):
        message = FakeMessage("Anyone selling [item:Dark Leather Gloves]?")
        self.assertTrue(await self.cog.handle_message(message))
        call, = message.reply_calls
        self.assertEqual(len(call["embeds"]), 1)
        self.assertEqual(call["embeds"][0].title, "Dark Leather Gloves")
        self.assertIs(call["mention_author"], False)
        self.assertEqual(call["allowed_mentions"].to_dict(), discord.AllowedMentions.none().to_dict())

    async def test_multiple_references_one_reply_max_three_deduplicated(self):
        message = FakeMessage("[item:TF] [item:19019] [item:Thunderfury] [quest:7848] [spell:Backstab] [item:17182]")
        self.assertTrue(await self.cog.handle_message(message))
        call, = message.reply_calls
        titles = [e.title for e in call["embeds"]]
        self.assertEqual(titles, ["Thunderfury, Blessed Blade of the Windseeker", "Attunement to the Core",
                                  "Backstab (Rank 1)"])
        self.assertEqual(len(message.reply_calls), 1)

    async def test_silent_when_nothing_found_or_no_syntax(self):
        for text in ("hello", "[item:zzzzqqqq]", "[npc:Thrall]", "[item:19019", "`[item:19019]`", "[quest:Thunderfury]"):
            message = FakeMessage(text)
            await self.cog.on_message(message)
            self.assertEqual(message.reply_calls, [], text)
            self.cog._last_use.clear()

    async def test_ignored_sources(self):
        for message in (FakeMessage("[item:TF]", bot=True), FakeMessage("[item:TF]", webhook=True),
                        FakeMessage("[item:TF]", guild_id=None), FakeMessage("[item:TF]", guild_id=999)):
            await self.cog.on_message(message)
            self.assertEqual(message.reply_calls, [])

    async def test_cooldown_per_user(self):
        first, second, other = FakeMessage("[item:TF]"), FakeMessage("[item:TF]"), FakeMessage("[item:TF]", author_id=8)
        self.assertTrue(await self.cog.handle_message(first))
        self.assertFalse(await self.cog.handle_message(second))
        self.assertTrue(await self.cog.handle_message(other))
        self.now += 3.5
        self.assertTrue(await self.cog.handle_message(FakeMessage("[item:TF]")))

    # ------------------------------------------------------------------ settings
    async def test_server_and_channel_switches(self):
        await self.moderation.set_entity_links_enabled(GUILD, False)
        self.cog.invalidate_settings()
        self.assertFalse(await self.cog.handle_message(FakeMessage("[item:TF]")))
        await self.moderation.set_entity_links_enabled(GUILD, True)
        await self.moderation.set_entity_link_channel(GUILD, 50, False)
        self.cog.invalidate_settings()
        self.assertFalse(await self.cog.handle_message(FakeMessage("[item:TF]", channel_id=50)))
        self.assertTrue(await self.cog.handle_message(FakeMessage("[item:TF]", channel_id=51, author_id=2)))
        await self.moderation.set_entity_link_channel(GUILD, 50, True)
        self.cog.invalidate_settings()
        self.assertTrue(await self.cog.handle_message(FakeMessage("[item:TF]", channel_id=50, author_id=3)))

    async def test_thread_inherits_disabled_parent(self):
        await self.moderation.set_entity_link_channel(GUILD, 60, False)
        message = FakeMessage("[item:TF]", channel_id=61)
        message.channel.parent_id = 60
        self.assertFalse(await self.cog.handle_message(message))

    async def test_settings_default_on_and_migration_is_idempotent(self):
        settings = await self.moderation.get_guild_settings(GUILD)
        self.assertEqual(settings["entity_links_enabled"], 1)
        await self.moderation.close()
        await self.moderation.connect()                      # re-run migrations on an existing file
        self.assertEqual(await self.moderation.list_entity_link_disabled_channels(GUILD), [])

    # ------------------------------------------------------------------ moderation compatibility
    async def test_message_removed_by_filter_gets_no_preview(self):
        cog = self.new_cog(grace=0.01)
        message = FakeMessage("[item:TF]")
        await cog._forget(message.id)                        # what on_raw_message_delete records
        self.assertFalse(await cog.handle_message(message))
        self.assertEqual(message.reply_calls, [])

    async def test_reply_removed_when_original_deleted_later(self):
        message = FakeMessage("[item:TF]")
        await self.cog.handle_message(message)
        payload = SimpleNamespace(message_id=message.id)
        await self.cog.on_raw_message_delete(payload)
        self.assertTrue(message.sent.deleted)
        self.assertNotIn(message.id, self.cog._replies)

    async def test_bulk_delete(self):
        message = FakeMessage("[item:TF]")
        await self.cog.handle_message(message)
        await self.cog.on_raw_bulk_message_delete(SimpleNamespace(message_ids={message.id}))
        self.assertTrue(message.sent.deleted)

    async def test_generated_replies_are_bot_messages(self):
        # Daily chatter and /history only record non-bot authors; our reply is authored by the bot.
        from octobot.daily_chatter import is_eligible_message
        bot_reply = SimpleNamespace(guild=SimpleNamespace(id=GUILD), author=SimpleNamespace(bot=True, id=1),
                                    webhook_id=None, type=discord.MessageType.reply, content="", created_at=None)
        self.assertFalse(is_eligible_message(bot_reply, GUILD))

    # ------------------------------------------------------------------ edits
    async def test_edit_updates_existing_reply(self):
        message = FakeMessage("[item:TF]")
        await self.cog.handle_message(message)
        message.content = "[item:Sulfuras]"
        await self.cog.handle_edit(message)
        self.assertEqual(len(message.reply_calls), 1)
        edit, = message.sent.edits
        self.assertEqual(edit["embeds"][0].title, "Sulfuras, Hand of Ragnaros")

    async def test_edit_with_same_references_changes_nothing(self):
        message = FakeMessage("[item:TF]")
        await self.cog.handle_message(message)
        message.content = "[item:tf] and some words"
        await self.cog.handle_edit(message)
        self.assertEqual(message.sent.edits, [])

    async def test_edit_removing_references_deletes_reply(self):
        message = FakeMessage("[item:TF]")
        await self.cog.handle_message(message)
        message.content = "never mind"
        await self.cog.handle_edit(message)
        self.assertTrue(message.sent.deleted)

    async def test_edit_adding_reference_to_untracked_message_replies_once(self):
        message = FakeMessage("[item:TF]", edited=True)
        await self.cog.handle_edit(message)
        self.assertEqual(len(message.reply_calls), 1)

    # ------------------------------------------------------------------ Discord failures
    async def test_missing_permissions_are_silent(self):
        message = FakeMessage("[item:TF]", can_send=False)
        self.assertFalse(await self.cog.handle_message(message))
        self.assertEqual(message.reply_calls, [])

    async def test_forbidden_reply_is_handled_and_channel_backs_off(self):
        message = FakeMessage("[item:TF]", reply_error=http_error(403, discord.Forbidden))
        self.assertFalse(await self.cog.handle_message(message))
        retry = FakeMessage("[item:TF]", author_id=99)
        self.assertFalse(await self.cog.handle_message(retry))
        self.assertEqual(retry.reply_calls, [])             # in cooldown after the 403: no hammering

    async def test_rate_limit_backs_off_instead_of_retrying(self):
        message = FakeMessage("[item:TF]", reply_error=http_error(429))
        self.assertFalse(await self.cog.handle_message(message))
        again = FakeMessage("[item:TF]", author_id=5)
        self.assertFalse(await self.cog.handle_message(again))
        self.assertEqual(again.reply_calls, [])

    async def test_original_deleted_before_reply(self):
        message = FakeMessage("[item:TF]", reply_error=http_error(404, discord.NotFound))
        self.assertFalse(await self.cog.handle_message(message))

    # ------------------------------------------------------------------ database outage
    async def test_missing_database_disables_feature_quietly(self):
        cog = self.new_cog(path=Path(self.temp.name) / "missing.sqlite")
        await cog.cog_load()                                 # must not raise
        message = FakeMessage("[item:TF]")
        await cog.on_message(message)
        self.assertEqual(message.reply_calls, [])

    async def test_corrupt_database_then_recovery_without_restart(self):
        path = Path(self.temp.name) / "live.sqlite"
        path.write_bytes(b"garbage" * 50)
        cog = self.new_cog(path=path)
        broken = FakeMessage("[item:TF]")
        await cog.on_message(broken)
        self.assertEqual(broken.reply_calls, [])
        make_database(Path(self.temp.name) / "fresh.sqlite")
        (Path(self.temp.name) / "fresh.sqlite").replace(path)   # atomic swap from the build tool
        self.now += 10
        fixed = FakeMessage("[item:TF]")
        self.assertTrue(await cog.handle_message(fixed))

    async def test_listener_never_raises(self):
        message = FakeMessage("[item:TF]")
        with mock.patch.object(self.cog, "handle_message", side_effect=RuntimeError("boom")):
            await self.cog.on_message(message)               # logged, not raised

    # ------------------------------------------------------------------ ambiguity
    async def test_ambiguous_reference_sends_selection_for_author_only(self):
        message = FakeMessage("[quest:Test of Endurance]", author_id=7)
        await self.cog.handle_message(message)
        call, = message.reply_calls
        view: SelectionView = call["view"]
        self.assertIsNotNone(view)
        select = view.children[0]
        self.assertEqual(len(select.options), 2)
        self.assertLessEqual(len(select.options), 25)
        self.assertTrue(all("Level" in o.description and "ID" in o.description for o in select.options))

        class Interaction:
            def __init__(self, user_id):
                self.user = SimpleNamespace(id=user_id)
                self.sent = []
                self.edited = None
                self.response = SimpleNamespace(send_message=self._send, edit_message=self._edit, defer=self._defer)

            async def _send(self, text, **kw):
                self.sent.append((text, kw))

            async def _edit(self, **kw):
                self.edited = kw

            async def _defer(self):
                pass

        stranger = Interaction(8)
        select._values = [select.options[0].value]
        await select.callback(stranger)
        self.assertTrue(stranger.sent[0][1]["ephemeral"])
        self.assertIsNone(stranger.edited)

        author = Interaction(7)
        select._values = [select.options[1].value]
        await select.callback(author)
        self.assertEqual(len(author.edited["embeds"]), 1)
        self.assertTrue(author.edited["embeds"][0].url.startswith("https://octowow.st/db/?quest="))
        self.assertIsNone(author.edited["view"])             # prompt replaced by the entity embed

    async def test_selection_times_out_and_cleans_up(self):
        message = FakeMessage("[quest:Test of Endurance]")
        await self.cog.handle_message(message)
        view = message.reply_calls[0]["view"]
        await view.on_timeout()
        self.assertTrue(message.sent.deleted)                # only prompt was present: removed entirely

    async def test_selection_timeout_keeps_resolved_embeds(self):
        message = FakeMessage("[item:TF] [quest:Test of Endurance]")
        await self.cog.handle_message(message)
        view = message.reply_calls[0]["view"]
        view.message = message.sent
        await view.on_timeout()
        self.assertFalse(message.sent.deleted)
        self.assertEqual(len(message.sent.edits[0]["embeds"]), 1)
        self.assertIsNone(message.sent.edits[0]["view"])


if __name__ == "__main__":
    unittest.main()
