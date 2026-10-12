from __future__ import annotations

import os
import unittest
from types import SimpleNamespace
from unittest import mock

import discord

from octocop.cogs.invitefilter import InviteFilterCog
from octocop.invites import contains_invite, find_invite_codes
from octotracker.config import Config

GUILD = 1547014756463026197
FORUM = 1547029978326245376
OTHER_GUILD = 999


class FindInviteCodesTests(unittest.TestCase):
    def test_every_invite_host_is_recognised(self) -> None:
        cases = {
            "discord.gg/abc123": "abc123",
            "https://discord.gg/abc123": "abc123",
            "http://www.discord.gg/abc123": "abc123",
            "https://discord.com/invite/abc123": "abc123",
            "discordapp.com/invite/abc123": "abc123",
            "https://ptb.discord.gg/abc123": "abc123",
            "canary.discord.gg/abc123": "abc123",
            "dsc.gg/abc123": "abc123",
            "discord.me/abc123": "abc123",
        }
        for text, expected in cases.items():
            self.assertEqual(find_invite_codes(f"come join {text} now"), [expected], text)

    def test_spacing_and_zero_width_tricks_do_not_hide_a_link(self) -> None:
        for text in (
            "discord . gg / sneaky",
            "discord.gg /sneaky",
            "discord​.gg/sneaky",
            "ＤＩＳＣＯＲＤ.gg/sneaky",
        ):
            self.assertEqual(find_invite_codes(text), ["sneaky"], repr(text))

    def test_ordinary_text_is_not_an_invite(self) -> None:
        for text in (
            "",
            "join our discord!",
            "see discord.com/channels/123/456",
            "the word discord appears here",
            "https://octowow.st/forum/viewtopic.php?t=1",
        ):
            self.assertFalse(contains_invite(text), repr(text))

    def test_duplicates_collapse_and_order_is_kept(self) -> None:
        text = "discord.gg/one then discord.gg/two then discord.gg/one"
        self.assertEqual(find_invite_codes(text), ["one", "two"])


class _Perms:
    def __init__(self, staff: bool):
        self.can_timeout = self.can_warn = self.can_check = self.can_manage_settings = staff


class _Bot:
    def __init__(self, *, resolves: dict[str, int | None] | None = None, fail: bool = False):
        self.config = Config(
            token="t", guild_id=GUILD, status_channel_id=None,
            alert_channel_id=None, announcement_channel_id=None,
        )
        self.resolves = resolves or {}
        self.fail = fail
        self.fetches: list[str] = []
        self.moderation_permissions = SimpleNamespace(
            for_member=lambda member: self._perms(member)
        )

    async def _perms(self, member):
        return _Perms(getattr(member, "staff", False))

    async def fetch_invite(self, code, **kwargs):
        self.fetches.append(code)
        if self.fail:
            raise discord.HTTPException(SimpleNamespace(status=500, reason="x"), "boom")
        if code not in self.resolves:
            raise discord.NotFound(SimpleNamespace(status=404, reason="x"), "gone")
        guild_id = self.resolves[code]
        return SimpleNamespace(guild=SimpleNamespace(id=guild_id) if guild_id else None)


class ForeignInviteTests(unittest.IsolatedAsyncioTestCase):
    async def test_an_invite_to_this_server_is_not_foreign(self) -> None:
        cog = InviteFilterCog(_Bot(resolves={"ours": GUILD}))
        self.assertEqual(await cog.foreign_invite_codes("join discord.gg/ours"), [])

    async def test_an_invite_elsewhere_is_foreign(self) -> None:
        cog = InviteFilterCog(_Bot(resolves={"theirs": OTHER_GUILD}))
        self.assertEqual(await cog.foreign_invite_codes("discord.gg/theirs"), ["theirs"])

    async def test_a_dead_code_counts_as_foreign(self) -> None:
        cog = InviteFilterCog(_Bot(resolves={}))
        self.assertEqual(await cog.foreign_invite_codes("discord.gg/expired"), ["expired"])

    async def test_a_mixed_message_reports_only_the_foreign_ones(self) -> None:
        cog = InviteFilterCog(_Bot(resolves={"ours": GUILD, "theirs": OTHER_GUILD}))
        codes = await cog.foreign_invite_codes("discord.gg/ours and discord.gg/theirs")
        self.assertEqual(codes, ["theirs"])

    async def test_results_are_cached_so_a_spammer_costs_one_lookup(self) -> None:
        bot = _Bot(resolves={"theirs": OTHER_GUILD})
        cog = InviteFilterCog(bot)
        for _ in range(3):
            await cog.foreign_invite_codes("discord.gg/theirs")
        self.assertEqual(bot.fetches, ["theirs"])

    async def test_an_api_failure_raises_so_the_message_is_left_alone(self) -> None:
        cog = InviteFilterCog(_Bot(fail=True))
        with self.assertRaises(discord.HTTPException):
            await cog.foreign_invite_codes("discord.gg/whatever")


class AllowedChannelTests(unittest.TestCase):
    def setUp(self) -> None:
        self.cog = InviteFilterCog(_Bot())

    def test_the_forum_and_its_posts_are_allowed(self) -> None:
        forum = SimpleNamespace(id=FORUM, parent_id=None)
        post = SimpleNamespace(id=555, parent_id=FORUM)
        self.assertTrue(self.cog._is_allowed_channel(forum))
        self.assertTrue(self.cog._is_allowed_channel(post))

    def test_other_channels_and_their_threads_are_not(self) -> None:
        channel = SimpleNamespace(id=12345, parent_id=None)
        thread = SimpleNamespace(id=678, parent_id=12345)
        self.assertFalse(self.cog._is_allowed_channel(channel))
        self.assertFalse(self.cog._is_allowed_channel(thread))


class InviteConfigTests(unittest.TestCase):
    def test_defaults_match_the_requested_forum_and_two_minutes(self) -> None:
        config = Config(
            token="t", guild_id=GUILD, status_channel_id=None,
            alert_channel_id=None, announcement_channel_id=None,
        )
        self.assertEqual(config.invite_allowed_channel_ids, frozenset({FORUM}))
        self.assertEqual(config.invite_filter_timeout_seconds, 120)

    def test_the_timeout_is_configurable_and_can_be_disabled(self) -> None:
        base = {"DISCORD_TOKEN": "t", "DISCORD_GUILD_ID": str(GUILD)}
        with mock.patch.dict(os.environ, {**base, "INVITE_FILTER_TIMEOUT": "10m"}, clear=True):
            self.assertEqual(Config.from_env().invite_filter_timeout_seconds, 600)
        with mock.patch.dict(os.environ, {**base, "INVITE_FILTER_TIMEOUT": "0"}, clear=True):
            self.assertEqual(Config.from_env().invite_filter_timeout_seconds, 0)
        with mock.patch.dict(os.environ, {**base, "INVITE_FILTER_TIMEOUT": "nonsense"}, clear=True):
            with self.assertRaises(RuntimeError):
                Config.from_env()

    def test_allowed_channels_are_configurable(self) -> None:
        env = {
            "DISCORD_TOKEN": "t",
            "DISCORD_GUILD_ID": str(GUILD),
            "DISCORD_INVITE_ALLOWED_CHANNEL_IDS": "111,222",
        }
        with mock.patch.dict(os.environ, env, clear=True):
            self.assertEqual(Config.from_env().invite_allowed_channel_ids, frozenset({111, 222}))


if __name__ == "__main__":
    unittest.main()
