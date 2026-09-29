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
    """Keep the base role and the levelled roles mutually exclusive.

    Automatic: gaining ``role_cleanup_auto_trigger_role_ids`` drops the base role.
    ``/rolefix`` reconciles every member in one pass: anyone with a levelled role
    loses the base role, and anyone with none of them is given it.
    """

    def __init__(self, bot: "OctoBot"):
        self.bot = bot

    @property
    def _remove_role_id(self) -> int | None:
        return self.bot.config.role_cleanup_remove_role_id

    @staticmethod
    def _has_any(member: discord.Member, role_ids: frozenset[int]) -> bool:
        return any(role.id in role_ids for role in member.roles)

    async def _remove_legacy_role(self, member: discord.Member, reason: str) -> bool:
        """Remove the legacy role from ``member`` if present. True when removed."""
        remove_id = self._remove_role_id
        if remove_id is None:
            return False
        role = member.guild.get_role(remove_id)
        if role is None or role not in member.roles:
            return False
        await member.remove_roles(role, reason=reason[:512])
        return True

    @commands.Cog.listener()
    async def on_member_update(self, before: discord.Member, after: discord.Member) -> None:
        if after.guild.id != self.bot.config.guild_id:
            return
        triggers = self.bot.config.role_cleanup_auto_trigger_role_ids
        if not triggers or self._remove_role_id is None:
            return
        if not self._has_any(after, triggers):
            return
        before_ids = {role.id for role in before.roles}
        after_ids = {role.id for role in after.roles}
        # Only act on the change that granted a trigger role (or re-added the legacy
        # role while a trigger role is held). Unrelated updates are ignored.
        gained_trigger = bool((after_ids - before_ids) & triggers)
        regained_legacy = self._remove_role_id in after_ids - before_ids
        if not (gained_trigger or regained_legacy):
            return
        try:
            removed = await self._remove_legacy_role(
                after, "OctoBot role cleanup | superseded by a higher role"
            )
        except discord.Forbidden:
            log.warning(
                "Cannot remove role %s from %s: missing Manage Roles or role is above mine",
                self._remove_role_id,
                after.id,
            )
            return
        except discord.HTTPException:
            log.exception("Failed to remove role %s from %s", self._remove_role_id, after.id)
            return
        if removed:
            log.info("Removed legacy role %s from %s", self._remove_role_id, after.id)

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
        levels = self.bot.config.role_cleanup_level_role_ids
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
                has_base = base_role in member.roles
                has_level = self._has_any(member, levels)
                try:
                    if has_level and has_base:
                        await member.remove_roles(base_role, reason=reason)
                        removed += 1
                    elif not has_level and not has_base:
                        await member.add_roles(base_role, reason=reason)
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
