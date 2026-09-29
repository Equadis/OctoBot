from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

if TYPE_CHECKING:
    from octobot.bot import OctoBot

log = logging.getLogger(__name__)


class RoleCleanupCog(commands.Cog):
    """Hold one invariant: a member has the base role exactly when they have no levelled role.

    It is enforced automatically on every role change, and ``/rolefix`` applies the
    same rule to every member in one pass for anyone the bot missed.
    """

    def __init__(self, bot: "OctoBot"):
        self.bot = bot

    @property
    def _remove_role_id(self) -> int | None:
        return self.bot.config.role_cleanup_remove_role_id

    @property
    def _level_role_ids(self) -> frozenset[int]:
        """Every role that means "not a newcomer", so the base role does not apply."""
        config = self.bot.config
        return config.role_cleanup_level_role_ids | config.role_cleanup_auto_trigger_role_ids

    @staticmethod
    def _has_any(member: discord.Member, role_ids: frozenset[int]) -> bool:
        return any(role.id in role_ids for role in member.roles)

    async def reconcile(self, member: discord.Member, reason: str) -> str | None:
        """Add or remove the base role so the invariant holds.

        Returns "removed", "granted", or None when the member is already correct.
        """
        base_id = self._remove_role_id
        levels = self._level_role_ids
        if base_id is None or not levels:
            return None
        base_role = member.guild.get_role(base_id)
        if base_role is None:
            return None
        has_base = base_role in member.roles
        has_level = self._has_any(member, levels)
        if has_level and has_base:
            await member.remove_roles(base_role, reason=reason[:512])
            return "removed"
        if not has_level and not has_base:
            await member.add_roles(base_role, reason=reason[:512])
            return "granted"
        return None

    @commands.Cog.listener()
    async def on_member_update(self, before: discord.Member, after: discord.Member) -> None:
        if after.guild.id != self.bot.config.guild_id or after.bot:
            return
        # Nickname, avatar and timeout updates arrive here too; only role changes
        # can break the invariant. The bot's own add/remove re-enters once and
        # then finds nothing to do, so this cannot loop.
        if {role.id for role in before.roles} == {role.id for role in after.roles}:
            return
        try:
            action = await self.reconcile(
                after, "OctoBot role cleanup | base role follows the levelled roles"
            )
        except discord.Forbidden:
            log.warning(
                "Cannot change role %s on %s: missing Manage Roles or the role is above mine",
                self._remove_role_id,
                after.id,
            )
            return
        except discord.HTTPException:
            log.exception("Failed to reconcile roles for %s", after.id)
            return
        if action == "removed":
            log.info("Removed base role %s from %s", self._remove_role_id, after.id)
        elif action == "granted":
            log.info("Granted base role %s to %s", self._remove_role_id, after.id)

    @app_commands.command(
        name="rolefix",
        description="Reconcile the base role against the levelled roles for every member.",
    )
    @app_commands.guild_only()
    async def rolefix_command(self, interaction: discord.Interaction) -> None:
        if interaction.guild is None or not isinstance(interaction.user, discord.Member):
            await interaction.response.send_message("This command can only be used in a server.", ephemeral=True)
            return
        perms = await self.bot.moderation_permissions.for_member(interaction.user)
        if not perms.can_manage_settings:
            await interaction.response.send_message(
                "You do not have permission to use `/rolefix`.", ephemeral=True
            )
            return

        guild = interaction.guild
        base_id = self._remove_role_id
        levels = self._level_role_ids
        if base_id is None or not levels:
            await interaction.response.send_message(
                "Role cleanup is not configured (ROLE_CLEANUP_* in .env).", ephemeral=True
            )
            return
        base_role = guild.get_role(base_id)
        if base_role is None:
            await interaction.response.send_message(
                f"Role `{base_id}` does not exist in this server.", ephemeral=True
            )
            return

        # A full member walk can take a while on a large server; acknowledge first.
        await interaction.response.defer(ephemeral=True, thinking=True)
        checked = removed = granted = failed = 0
        reason = f"OctoBot /rolefix by {interaction.user} ({interaction.user.id})"[:512]
        try:
            async for member in guild.fetch_members(limit=None):
                if member.bot:
                    continue
                checked += 1
                try:
                    action = await self.reconcile(member, reason)
                    if action == "removed":
                        removed += 1
                    elif action == "granted":
                        granted += 1
                except (discord.Forbidden, discord.HTTPException):
                    failed += 1
                    log.exception("Failed to fix roles for %s during /rolefix", member.id)
        except discord.HTTPException as exc:
            await interaction.followup.send(
                f"Discord rejected the member list: `{exc}`. Check that the **Server Members Intent** is enabled.",
                ephemeral=True,
            )
            return

        await interaction.followup.send(
            f"Checked **{checked}** members.\n"
            f"Removed {base_role.mention} from **{removed}** who have a levelled role.\n"
            f"Gave {base_role.mention} to **{granted}** who had no roles at all."
            + (f"\n**{failed}** change(s) failed; see the bot log." if failed else ""),
            ephemeral=True,
            allowed_mentions=discord.AllowedMentions.none(),
        )
