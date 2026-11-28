"""Select menus for ambiguous references. Only the original author may choose."""
from __future__ import annotations

import logging
from typing import Callable

import discord

from .embeds import QUALITY_NAMES, build_embed, clip
from .models import Entity, Reference

log = logging.getLogger(__name__)
SELECT_TIMEOUT_SECONDS = 120
PROMPT_COLOR = 0x99AAB5


def describe(entity: Entity) -> str:
    """Distinguishing detail for a select option (max 100 characters)."""
    bits: list[str] = []
    if entity.type == "item":
        if entity.quality in QUALITY_NAMES:
            bits.append(QUALITY_NAMES[entity.quality])
        if entity.level:
            bits.append(f"ilvl {entity.level}")
        req = entity.data.get("reqLevel") or entity.data.get("reqlevel")
        if req:
            bits.append(f"req {req}")
    elif entity.type == "quest":
        if entity.level is not None:
            bits.append(f"Level {entity.level}")
        side = {1: "Alliance", 2: "Horde"}.get(entity.data.get("side"))
        if side:
            bits.append(side)
        if entity.data.get("zone"):
            bits.append(str(entity.data["zone"]))
    else:
        if entity.rank:
            bits.append(entity.rank)
        for key in ("class", "tree"):
            if entity.data.get(key):
                bits.append(str(entity.data[key]))
        if entity.level:
            bits.append(f"Level {entity.level}")
    bits.append(f"ID {entity.ref}")
    return clip(" · ".join(bits), 100)


def prompt_embed(reference: Reference, count: int) -> discord.Embed:
    return discord.Embed(
        description=clip(f"Multiple {reference.type}s match **{discord.utils.escape_markdown(reference.query)}**. Pick one:", 200)
        + (f"\n*Showing the first {count}.*" if count >= 25 else ""),
        color=PROMPT_COLOR,
    )


class ChoiceSelect(discord.ui.Select):
    def __init__(self, slot: int, reference: Reference, candidates: tuple[Entity, ...]):
        self.slot, self.candidates = slot, {str(e.key): e for e in candidates}
        options = [
            discord.SelectOption(label=clip(e.label(), 100), value=str(e.key), description=describe(e))
            for e in candidates[:25]
        ]
        super().__init__(placeholder=clip(f"Choose a {reference.type}", 150), options=options, row=slot)

    async def callback(self, interaction: discord.Interaction) -> None:
        view: SelectionView = self.view  # type: ignore[assignment]
        if interaction.user.id != view.author_id:
            await interaction.response.send_message("Only the person who sent the message can choose.", ephemeral=True)
            return
        await view.choose(interaction, self.slot, self.candidates[self.values[0]])


class SelectionView(discord.ui.View):
    """Holds the reply's embed list; each ambiguous slot becomes a select menu."""

    def __init__(self, author_id: int, embeds: list[discord.Embed | None],
                 ambiguous: dict[int, tuple[Reference, tuple[Entity, ...]]],
                 on_resolved: Callable[[int, Entity], None] | None = None):
        super().__init__(timeout=SELECT_TIMEOUT_SECONDS)
        self.author_id = author_id
        self.embeds = embeds
        self.shown: set[int] = set()        # entity keys already displayed in this reply
        self.pending = dict(ambiguous)
        self.message: discord.Message | None = None
        self._on_resolved = on_resolved
        for slot, (reference, candidates) in sorted(ambiguous.items()):
            self.add_item(ChoiceSelect(slot, reference, candidates))

    def visible_embeds(self) -> list[discord.Embed]:
        return [e for e in self.embeds if e is not None]

    async def choose(self, interaction: discord.Interaction, slot: int, entity: Entity) -> None:
        self.pending.pop(slot, None)
        self.embeds[slot] = None if entity.key in self.shown else build_embed(entity)
        self.shown.add(entity.key)
        for item in list(self.children):
            if isinstance(item, ChoiceSelect) and item.slot == slot:
                self.remove_item(item)
        if self._on_resolved:
            self._on_resolved(slot, entity)
        embeds = self.visible_embeds()
        if not embeds:
            await interaction.response.defer()
            try:
                await interaction.delete_original_response()
            except discord.HTTPException:
                pass
            self.stop()
            return
        await interaction.response.edit_message(embeds=embeds, view=self if self.pending else None)
        if not self.pending:
            self.stop()

    async def on_timeout(self) -> None:
        """Drop unanswered prompts so stale menus do not linger."""
        if self.message is None:
            return
        for slot in list(self.pending):
            self.embeds[slot] = None
        self.pending.clear()
        try:
            embeds = self.visible_embeds()
            if embeds:
                await self.message.edit(embeds=embeds, view=None)
            else:
                await self.message.delete()
        except discord.HTTPException:
            log.debug("Could not clean up expired entity selection %s", self.message.id)

    async def on_error(self, interaction: discord.Interaction, error: Exception, item: discord.ui.Item) -> None:
        log.exception("Entity selection failed", exc_info=error)
