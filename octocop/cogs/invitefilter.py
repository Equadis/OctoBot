from __future__ import annotations

import logging
from datetime import timedelta
from typing import TYPE_CHECKING

import discord
from discord.ext import commands

from ..duration import format_duration
from ..invites import find_invite_codes

if TYPE_CHECKING:
    from octobot.bot import OctoBot

log = logging.getLogger(__name__)


class InviteFilterCog(commands.Cog):
    """Delete other servers' invite links and time the poster out.

    Two things are allowed through: an invite to this server, and anything posted
    in the configured forum, where sharing a server is the point of the channel.
    Staff are exempt, as with the word filter.
    """

    def __init__(self, bot: "OctoBot"):
        self.bot = bot
        # Resolved invite code -> guild id (None when Discord says it is invalid).
        self._resolved: dict[str, int | None] = {}

    @property
    def _timeout_seconds(self) -> int:
        return self.bot.config.invite_filter_timeout_seconds

    def _is_allowed_channel(self, channel: discord.abc.GuildChannel) -> bool:
        """True inside the exempt forum, including every thread/post under it."""
        allowed = self.bot.config.invite_allowed_channel_ids
        if not allowed:
            return False
        if getattr(channel, "id", None) in allowed:
            return True
        # Forum posts and threads carry the forum as their parent.
        parent_id = getattr(channel, "parent_id", None)
        return parent_id is not None and parent_id in allowed

    async def _is_exempt(self, member: discord.Member) -> bool:
        if member.bot or member.id == member.guild.owner_id or member.guild_permissions.administrator:
            return True
        perms = await self.bot.moderation_permissions.for_member(member)
        return any((perms.can_timeout, perms.can_warn, perms.can_check, perms.can_manage_settings))

    async def _invite_guild_id(self, code: str) -> int | None:
        """The guild an invite points at, or None when it cannot be resolved.

        Codes are cached: a raid pasting the same link repeatedly costs one API call.
        """
        if code in self._resolved:
            return self._resolved[code]
        try:
            invite = await self.bot.fetch_invite(code, with_counts=False, with_expiration=False)
        except discord.NotFound:
            # A dead or fake code is certainly not an invite to this server.
            self._resolved[code] = None
            return None
        except (discord.HTTPException, discord.DiscordException):
            # Transient failure: say nothing rather than punish on a bad API day.
            log.warning("Could not resolve invite %s", code)
            raise
        guild_id = invite.guild.id if invite.guild is not None else None
        self._resolved[code] = guild_id
        return guild_id

    async def foreign_invite_codes(self, text: str) -> list[str]:
        """Invite codes in ``text`` that do not point at this server.

        Raises discord.HTTPException when Discord could not be reached, so the
        caller can leave the message alone instead of acting on a guess.
        """
        foreign: list[str] = []
        for code in find_invite_codes(text):
            guild_id = await self._invite_guild_id(code)
            if guild_id != self.bot.config.guild_id:
                foreign.append(code)
        return foreign

    async def _enforce(self, message: discord.Message) -> None:
        if message.guild is None or message.guild.id != self.bot.config.guild_id:
            return
        if not isinstance(message.author, discord.Member) or message.author.bot:
            return
        if not find_invite_codes(message.content or ""):
            return
        if self._is_allowed_channel(message.channel):
            return
        if await self._is_exempt(message.author):
            return
        try:
            codes = await self.foreign_invite_codes(message.content or "")
        except (discord.HTTPException, discord.DiscordException):
            return
        if not codes:
            # Every link pointed back here, which is fine.
            return

        guild = message.guild
        member = message.author
        seconds = self._timeout_seconds
        shown = ", ".join(f"`{code}`" for code in codes[:5])
        reason = f"OctoBot invite filter | advertising: {', '.join(codes[:5])}"[:512]

        deleted = True
        try:
            await message.delete()
        except discord.NotFound:
            pass
        except (discord.Forbidden, discord.HTTPException):
            deleted = False
            log.exception("Invite filter could not delete message %s", message.id)

        now = discord.utils.utcnow()
        current_until = member.timed_out_until
        already_timed_out = current_until is not None and current_until > now
        timed_out = False
        if not already_timed_out and seconds > 0:
            try:
                await member.timeout(timedelta(seconds=seconds), reason=reason)
                timed_out = True
            except (discord.Forbidden, discord.HTTPException):
                log.exception("Invite filter could not time out %s", member.id)

        timeout_id = None
        moderation = self.bot.get_cog("ModerationCog")
        if timed_out:
            bot_id = self.bot.user.id if self.bot.user else 0
            timeout_id = await self.bot.moderation_database.add_timeout(
                guild.id, member.id, bot_id, seconds,
                "Automatic: posted an invite to another Discord server",
                now, now + timedelta(seconds=seconds),
            )
            if moderation is not None:
                await moderation._dm_timeout(
                    guild=guild, user=member,
                    reason="Your message linked to another Discord server.",
                    duration_seconds=seconds, timeout_id=timeout_id,
                )

        embed = discord.Embed(
            title="Discord invite filtered", description=(message.content or "")[:2000]
        )
        embed.add_field(name="User", value=f"{member.mention} (`{member.id}`)", inline=False)
        embed.add_field(name="Invite(s)", value=shown, inline=True)
        embed.add_field(name="Channel", value=f"<#{message.channel.id}>", inline=True)
        outcome = ["message deleted" if deleted else "**message not deleted** (missing Manage Messages?)"]
        if timed_out:
            outcome.append(f"{format_duration(seconds)} timeout (case `T-{timeout_id:04d}`)")
        elif already_timed_out:
            outcome.append("already timed out")
        elif seconds > 0:
            outcome.append("**timeout failed** (missing Moderate Members or role too low?)")
        embed.add_field(name="Action", value=", ".join(outcome), inline=False)
        if moderation is not None:
            await moderation._log(guild, embed)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        try:
            await self._enforce(message)
        except Exception:
            log.exception("Invite filter failed on message %s", getattr(message, "id", None))

    @commands.Cog.listener()
    async def on_message_edit(self, before: discord.Message, after: discord.Message) -> None:
        if before.content == after.content:
            return
        try:
            await self._enforce(after)
        except Exception:
            log.exception("Invite filter failed on edited message %s", getattr(after, "id", None))
