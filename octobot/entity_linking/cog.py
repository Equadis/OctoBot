"""Discord glue: watch messages for ``[type:name]`` references and reply with entity embeds."""
from __future__ import annotations

import asyncio
import logging
import sqlite3
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import TYPE_CHECKING

import discord
from discord.ext import commands

from octobot.discord_api import DeferredDiscordRequest

from .database import EntityDatabase
from .embeds import build_embed
from .models import Entity, Reference
from .parser import MAX_PREVIEWS, normalize, parse_references
from .resolver import Resolver
from .views import SelectionView, prompt_embed

if TYPE_CHECKING:
    from octobot.bot import OctoBot

log = logging.getLogger(__name__)
USER_COOLDOWN_SECONDS = 3.0
MAX_CONCURRENT_LOOKUPS = 4
MODERATION_GRACE_SECONDS = 1.0   # lets the word/invite filters delete a message before we answer it
SETTINGS_TTL_SECONDS = 30.0
TRACKED_REPLIES = 400
TRACKED_DELETIONS = 400
MAX_COOLDOWN_ENTRIES = 2000
NO_MENTIONS = discord.AllowedMentions.none()


@dataclass
class _Slot:
    entity: Entity | None = None
    reference: Reference | None = None
    candidates: tuple[Entity, ...] = ()


@dataclass
class _Reply:
    message: discord.Message
    signature: tuple
    view: SelectionView | None = None


def signature_of(references: list[Reference]) -> tuple:
    return tuple((r.type, normalize(r.query)) for r in references)


class EntityLinkingCog(commands.Cog):
    def __init__(self, bot: "OctoBot", database: EntityDatabase | None = None, *,
                 cooldown: float = USER_COOLDOWN_SECONDS, grace: float = MODERATION_GRACE_SECONDS,
                 concurrency: int = MAX_CONCURRENT_LOOKUPS, clock=time.monotonic):
        self.bot = bot
        self.database = database or EntityDatabase()
        self.resolver = Resolver(self.database)
        self.cooldown, self.grace, self.clock = cooldown, grace, clock
        self._semaphore = asyncio.Semaphore(concurrency)
        self._last_use: OrderedDict[int, float] = OrderedDict()
        self._replies: OrderedDict[int, _Reply] = OrderedDict()
        self._deleted: OrderedDict[int, None] = OrderedDict()
        self._settings: tuple[float, bool, frozenset[int]] | None = None
        self._unavailable_logged = False

    # ------------------------------------------------------------------ lifecycle
    async def cog_load(self) -> None:
        try:
            counts = await asyncio.to_thread(self.database.counts)
            log.info("Entity linking ready: %s", counts)
        except (OSError, sqlite3.Error) as exc:
            log.error("Entity linking disabled until %s is readable: %s", self.database.path, exc)

    async def cog_unload(self) -> None:
        await asyncio.to_thread(self.database.close)

    # ------------------------------------------------------------------ settings
    def invalidate_settings(self) -> None:
        self._settings = None

    async def _enabled_in(self, channel: discord.abc.GuildChannel | discord.Thread, guild_id: int) -> bool:
        now = self.clock()
        if self._settings is None or now - self._settings[0] > SETTINGS_TTL_SECONDS:
            moderation = self.bot.moderation_database
            row = await moderation.get_guild_settings(guild_id)
            disabled = await moderation.list_entity_link_disabled_channels(guild_id)
            self._settings = (now, bool(row.get("entity_links_enabled", 1)), frozenset(disabled))
        _, enabled, disabled = self._settings
        if not enabled:
            return False
        parent_id = getattr(channel, "parent_id", None)
        return channel.id not in disabled and (parent_id is None or parent_id not in disabled)

    # ------------------------------------------------------------------ guards
    def _on_cooldown(self, user_id: int) -> bool:
        now = self.clock()
        last = self._last_use.get(user_id)
        if last is not None and now - last < self.cooldown:
            return True
        self._last_use[user_id] = now
        self._last_use.move_to_end(user_id)
        while len(self._last_use) > MAX_COOLDOWN_ENTRIES:
            self._last_use.popitem(last=False)
        return False

    @staticmethod
    def _can_reply(message: discord.Message) -> bool:
        guild = message.guild
        me = getattr(guild, "me", None)
        if me is None:
            return False
        perms = message.channel.permissions_for(me)
        sending = perms.send_messages_in_threads if isinstance(message.channel, discord.Thread) else perms.send_messages
        return bool(sending and perms.embed_links and perms.read_message_history)

    def _eligible(self, message: discord.Message) -> bool:
        if message.guild is None or message.guild.id != self.bot.config.guild_id:
            return False
        if message.author.bot or message.webhook_id is not None:
            return False
        return message.type in (discord.MessageType.default, discord.MessageType.reply)

    # ------------------------------------------------------------------ lookup
    def _lookup(self, references: list[Reference]) -> list[_Slot]:
        """Resolve references (blocking SQLite work: run in a thread)."""
        slots: list[_Slot] = []
        seen: set[int] = set()
        for reference in references:
            if len(slots) >= MAX_PREVIEWS:
                break
            result = self.resolver.resolve(reference)
            if result.status == "resolved" and result.entity is not None:
                if result.entity.key not in seen:
                    seen.add(result.entity.key)
                    slots.append(_Slot(entity=result.entity))
            elif result.status == "ambiguous" and result.candidates:
                slots.append(_Slot(reference=reference, candidates=result.candidates))
        return slots

    def _compose(self, author_id: int, slots: list[_Slot]) -> tuple[list[discord.Embed], SelectionView | None]:
        embeds: list[discord.Embed | None] = []
        ambiguous: dict[int, tuple[Reference, tuple[Entity, ...]]] = {}
        shown: set[int] = set()
        for index, slot in enumerate(slots):
            if slot.entity is not None:
                embeds.append(build_embed(slot.entity))
                shown.add(slot.entity.key)
            else:
                embeds.append(prompt_embed(slot.reference, len(slot.candidates)))  # type: ignore[arg-type]
                ambiguous[index] = (slot.reference, slot.candidates)  # type: ignore[assignment]
        view = None
        if ambiguous:
            view = SelectionView(author_id, embeds, ambiguous)
            view.shown = shown
        return [e for e in embeds if e is not None], view

    async def _build(self, message: discord.Message, references: list[Reference]):
        try:
            slots = await asyncio.to_thread(self._lookup, references)
        except (OSError, sqlite3.Error) as exc:
            if not self._unavailable_logged:
                log.error("Entity database unavailable, entity linking paused: %s", exc)
                self._unavailable_logged = True
            return None
        self._unavailable_logged = False
        if not slots:
            return None
        return self._compose(message.author.id, slots)

    # ------------------------------------------------------------------ events
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        content = message.content
        if not content or "[" not in content:           # cheapest possible exit
            return
        try:
            await self.handle_message(message)
        except Exception:
            log.exception("Entity linking failed on message %s", getattr(message, "id", None))

    async def handle_message(self, message: discord.Message) -> bool:
        """Reply to ``message`` if it references entities. Returns True when a reply was sent."""
        if not self._eligible(message):
            return False
        references = parse_references(message.content)
        if not references:
            return False
        if not await self._enabled_in(message.channel, message.guild.id):
            return False
        if self._on_cooldown(message.author.id) or not self._can_reply(message):
            return False
        async with self._semaphore:
            built = await self._build(message, references)
            if built is None:
                return False
            if self.grace:
                await asyncio.sleep(self.grace)
            if message.id in self._deleted:             # removed by a filter or by the author
                return False
            embeds, view = built
            try:
                sent = await self.bot.discord_api.call(
                    "entity_reply", message.channel.id,
                    lambda: message.reply(embeds=embeds, view=view, mention_author=False,
                                          allowed_mentions=NO_MENTIONS),
                    cache_missing=False,
                )
            except DeferredDiscordRequest:
                return False
            except discord.NotFound:
                return False                            # original message vanished
            except discord.Forbidden:
                log.info("Missing permission to reply in channel %s", message.channel.id)
                return False
            except discord.HTTPException:
                log.warning("Entity reply failed in channel %s", message.channel.id, exc_info=True)
                return False
        if view is not None:
            view.message = sent
        self._track(message.id, _Reply(sent, signature_of(references), view))
        if message.id in self._deleted:                 # deleted while we were sending
            await self._remove_reply(message.id)
        return True

    @commands.Cog.listener()
    async def on_message_edit(self, before: discord.Message, after: discord.Message) -> None:
        if before.content == after.content or not self._eligible(after):
            return
        try:
            await self.handle_edit(after)
        except Exception:
            log.exception("Entity linking failed on edited message %s", getattr(after, "id", None))

    async def handle_edit(self, message: discord.Message) -> None:
        tracked = self._replies.get(message.id)
        references = parse_references(message.content)
        if tracked is None:
            if references and message.edited_at is not None:
                await self.handle_message(message)
            return
        signature = signature_of(references)
        if signature == tracked.signature:
            return
        built = await self._build(message, references) if references else None
        if built is None:
            await self._remove_reply(message.id)
            return
        embeds, view = built
        if tracked.view is not None:
            tracked.view.stop()
        try:
            await tracked.message.edit(embeds=embeds, view=view, allowed_mentions=NO_MENTIONS)
        except discord.NotFound:
            self._replies.pop(message.id, None)
            return
        except discord.HTTPException:
            log.warning("Could not update entity reply for message %s", message.id, exc_info=True)
            return
        if view is not None:
            view.message = tracked.message
        tracked.signature, tracked.view = signature, view

    @commands.Cog.listener()
    async def on_raw_message_delete(self, payload: discord.RawMessageDeleteEvent) -> None:
        await self._forget(payload.message_id)

    @commands.Cog.listener()
    async def on_raw_bulk_message_delete(self, payload: discord.RawBulkMessageDeleteEvent) -> None:
        for message_id in payload.message_ids:
            await self._forget(message_id)

    # ------------------------------------------------------------------ bookkeeping
    def _track(self, message_id: int, reply: _Reply) -> None:
        self._replies[message_id] = reply
        self._replies.move_to_end(message_id)
        while len(self._replies) > TRACKED_REPLIES:
            self._replies.popitem(last=False)

    async def _forget(self, message_id: int) -> None:
        self._deleted[message_id] = None
        while len(self._deleted) > TRACKED_DELETIONS:
            self._deleted.popitem(last=False)
        await self._remove_reply(message_id)

    async def _remove_reply(self, message_id: int) -> None:
        tracked = self._replies.pop(message_id, None)
        if tracked is None:
            return
        if tracked.view is not None:
            tracked.view.stop()
        try:
            await tracked.message.delete()
        except discord.HTTPException:
            log.debug("Could not delete entity reply for message %s", message_id)
