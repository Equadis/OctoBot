from __future__ import annotations

import unittest
from types import SimpleNamespace

from octocop.cogs.roles import RoleCleanupCog
from octotracker.config import Config

LEGACY = 1547037223558451291
AUTO = 1547371277474603028
LEVEL_ONLY = 1547038342661804194  # a levelled role that /rolefix acts on
UNRELATED = 999


class _Role:
    def __init__(self, role_id: int):
        self.id = role_id
        self.mention = f"<@&{role_id}>"

    def __eq__(self, other):
        return isinstance(other, _Role) and other.id == self.id

    def __hash__(self):
        return hash(self.id)


class _Guild:
    def __init__(self, guild_id: int, roles: dict[int, _Role]):
        self.id = guild_id
        self._roles = roles

    def get_role(self, role_id: int):
        return self._roles.get(role_id)


class _Member:
    def __init__(self, guild: _Guild, member_id: int, role_ids: list[int], *, bot: bool = False):
        self.guild = guild
        self.id = member_id
        self.bot = bot
        self.roles = [guild.get_role(role_id) for role_id in role_ids]
        self.removed: list[tuple[_Role, str]] = []
        self.added: list[tuple[_Role, str]] = []

    async def remove_roles(self, role, *, reason=None):
        self.removed.append((role, reason))
        self.roles = [existing for existing in self.roles if existing != role]

    async def add_roles(self, role, *, reason=None):
        self.added.append((role, reason))
        self.roles = [*self.roles, role]


def _config(**overrides) -> Config:
    return Config(
        token="test",
        guild_id=123,
        status_channel_id=None,
        alert_channel_id=None,
        announcement_channel_id=None,
        **overrides,
    )


class RoleCleanupTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.roles = {role_id: _Role(role_id) for role_id in (LEGACY, AUTO, LEVEL_ONLY, UNRELATED)}
        self.guild = _Guild(123, self.roles)
        self.cog = RoleCleanupCog(SimpleNamespace(config=_config()))

    def test_defaults_match_the_requested_role_ids(self) -> None:
        config = _config()
        self.assertEqual(config.role_cleanup_remove_role_id, LEGACY)
        self.assertEqual(config.role_cleanup_auto_trigger_role_ids, frozenset({AUTO}))

    async def test_gaining_the_trigger_role_removes_the_legacy_role(self) -> None:
        before = _Member(self.guild, 1, [LEGACY])
        after = _Member(self.guild, 1, [LEGACY, AUTO])
        await self.cog.on_member_update(before, after)
        self.assertEqual([role.id for role, _ in after.removed], [LEGACY])
        self.assertNotIn(self.roles[LEGACY], after.roles)

    async def test_regaining_legacy_while_holding_trigger_removes_it_again(self) -> None:
        before = _Member(self.guild, 1, [AUTO])
        after = _Member(self.guild, 1, [AUTO, LEGACY])
        await self.cog.on_member_update(before, after)
        self.assertEqual([role.id for role, _ in after.removed], [LEGACY])

    async def test_any_levelled_role_removes_the_base_role(self) -> None:
        # Not just the auto trigger: every levelled role means the base role goes.
        before = _Member(self.guild, 2, [LEGACY])
        after = _Member(self.guild, 2, [LEGACY, LEVEL_ONLY])
        await self.cog.on_member_update(before, after)
        self.assertEqual([role.id for role, _ in after.removed], [LEGACY])

        # A member already holding both is repaired on the next role change.
        before = _Member(self.guild, 1, [LEGACY, AUTO])
        after = _Member(self.guild, 1, [LEGACY, AUTO, UNRELATED])
        await self.cog.on_member_update(before, after)
        self.assertEqual([role.id for role, _ in after.removed], [LEGACY])

    async def test_losing_the_last_levelled_role_grants_the_base_role(self) -> None:
        before = _Member(self.guild, 1, [AUTO])
        after = _Member(self.guild, 1, [])
        await self.cog.on_member_update(before, after)
        self.assertEqual([role.id for role, _ in after.added], [LEGACY])
        self.assertIn(self.roles[LEGACY], after.roles)

        # Still holding another levelled role: nothing is granted.
        before = _Member(self.guild, 2, [AUTO, LEVEL_ONLY])
        after = _Member(self.guild, 2, [LEVEL_ONLY])
        await self.cog.on_member_update(before, after)
        self.assertEqual(after.added, [])

        # An unrelated role is not a levelled role, so the base role still applies.
        before = _Member(self.guild, 3, [AUTO, UNRELATED])
        after = _Member(self.guild, 3, [UNRELATED])
        await self.cog.on_member_update(before, after)
        self.assertEqual([role.id for role, _ in after.added], [LEGACY])

    async def test_non_role_updates_bots_and_other_guilds_are_ignored(self) -> None:
        # Same roles either side: a nickname or avatar change, nothing to do.
        before = _Member(self.guild, 1, [UNRELATED])
        after = _Member(self.guild, 1, [UNRELATED])
        await self.cog.on_member_update(before, after)
        self.assertEqual((after.removed, after.added), ([], []))

        before = _Member(self.guild, 4, [AUTO], bot=True)
        after = _Member(self.guild, 4, [], bot=True)
        await self.cog.on_member_update(before, after)
        self.assertEqual(after.added, [])

        other = _Guild(456, self.roles)
        before = _Member(other, 3, [LEGACY])
        after = _Member(other, 3, [LEGACY, AUTO])
        await self.cog.on_member_update(before, after)
        self.assertEqual(after.removed, [])

    async def test_a_correct_member_is_never_touched_so_updates_cannot_loop(self) -> None:
        # The bot's own change re-enters the listener; the second pass is a no-op.
        before = _Member(self.guild, 1, [LEGACY])
        after = _Member(self.guild, 1, [LEGACY, AUTO])
        await self.cog.on_member_update(before, after)
        settled_before = _Member(self.guild, 1, [LEGACY, AUTO])
        settled_after = _Member(self.guild, 1, [AUTO])
        await self.cog.on_member_update(settled_before, settled_after)
        self.assertEqual((settled_after.removed, settled_after.added), ([], []))

    def test_level_roles_cover_all_four(self) -> None:
        config = _config()
        self.assertEqual(
            config.role_cleanup_level_role_ids,
            frozenset({1547038342661804194, 1547038337297154078, 1547038296025333880, AUTO}),
        )
        # A levelled role that is not the auto trigger still counts for /rolefix.
        self.assertTrue(
            self.cog._has_any(_Member(self.guild, 1, [LEVEL_ONLY]), config.role_cleanup_level_role_ids)
        )
        self.assertFalse(
            self.cog._has_any(_Member(self.guild, 1, [UNRELATED, LEGACY]), config.role_cleanup_level_role_ids)
        )

    async def test_gaining_a_levelled_role_without_the_base_role_changes_nothing(self) -> None:
        before = _Member(self.guild, 1, [])
        after = _Member(self.guild, 1, [AUTO])
        await self.cog.on_member_update(before, after)
        self.assertEqual((after.removed, after.added), ([], []))


if __name__ == "__main__":
    unittest.main()
