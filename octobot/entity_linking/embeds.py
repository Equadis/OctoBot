"""Render an ``Entity`` as a compact Discord embed. Only facts present in the data are shown."""
from __future__ import annotations

import re

import discord

from .models import Entity

ICON_URL = "https://octowow.st/db/images/icons/large/{}.png"
QUALITY_COLORS = {
    0: 0x9D9D9D,  # Poor
    1: 0xFFFFFF,  # Common
    2: 0x1EFF00,  # Uncommon
    3: 0x0070DD,  # Rare
    4: 0xA335EE,  # Epic
    5: 0xFF8000,  # Legendary
    6: 0xE6CC80,  # Artifact
}
QUALITY_NAMES = {0: "Poor", 1: "Common", 2: "Uncommon", 3: "Rare", 4: "Epic", 5: "Legendary", 6: "Artifact"}
QUEST_COLOR = 0xFFD100
SPELL_COLOR = 0x69CCF0
DEFAULT_COLOR = 0x99AAB5
MAX_DESCRIPTION = 1500          # per embed; three embeds stay well under Discord's 6000 total
MAX_FIELD = 300
SIDES = {1: "Alliance", 2: "Horde"}
_ICON_NAME = re.compile(r"^[a-z0-9_\-]+$", re.IGNORECASE)
_MARKDOWN = re.compile(r"([\\*_`~|>\[\]])")


def clip(text: str, limit: int) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[: max(0, limit - 1)].rstrip() + "…"


def plain(text: str) -> str:
    """Escape Discord markdown so game text can never format (or ping) unexpectedly."""
    return _MARKDOWN.sub(r"\\\1", text).replace("@", "@​")


def _base(entity: Entity, color: int) -> discord.Embed:
    embed = discord.Embed(title=clip(entity.label(), 250), url=entity.url, color=color)
    if entity.icon and _ICON_NAME.match(entity.icon):
        embed.set_thumbnail(url=ICON_URL.format(entity.icon.lower()))
    return embed


def item_embed(entity: Entity) -> discord.Embed:
    quality = entity.quality if entity.quality in QUALITY_COLORS else None
    embed = _base(entity, QUALITY_COLORS.get(quality, DEFAULT_COLOR))
    data = entity.data
    lines: list[str] = []
    tooltip = data.get("tooltip")
    if tooltip:
        raw = [ln.strip() for ln in tooltip.splitlines() if ln.strip()]
        if raw and raw[0].casefold() == entity.name.casefold():
            raw = raw[1:]
        for ln in raw:
            lines.append(f"*{plain(ln)}*" if ln.startswith('"') else plain(ln))
    else:
        if quality is not None:
            lines.append(QUALITY_NAMES[quality])
        if entity.level:
            lines.append(f"Item Level {entity.level}")
        if data.get("armor"):
            lines.append(f"{data['armor']} Armor")
        if data.get("dps") and data.get("speed"):
            lines.append(f"Speed {data['speed']:.2f} · {data['dps']:.1f} damage per second")
        if data.get("reqlevel"):
            lines.append(f"Requires Level {data['reqlevel']}")
    if lines:
        embed.description = clip("\n".join(lines), MAX_DESCRIPTION)
    return embed


def _names(entries: list[dict]) -> str:
    parts = []
    for entry in entries[:8]:
        label = entry.get("name") or f"Item {entry['id']}"
        parts.append(plain(label) + (f" ×{entry['count']}" if entry.get("count", 1) > 1 else ""))
    extra = len(entries) - 8
    return ", ".join(parts) + (f" (+{extra} more)" if extra > 0 else "")


def quest_embed(entity: Entity) -> discord.Embed:
    embed = _base(entity, QUEST_COLOR)
    data = entity.data
    if data.get("objective"):
        embed.description = clip(plain(data["objective"]), 450)
    facts = []
    if entity.level is not None:
        facts.append(f"Level {entity.level}")
    if data.get("minLevel"):
        facts.append(f"Requires {data['minLevel']}")
    if data.get("side") in SIDES:
        facts.append(SIDES[data["side"]])
    if data.get("zone"):
        facts.append(plain(data["zone"]))
    if data.get("xp"):
        facts.append(f"{data['xp']:,} XP")
    if facts:
        embed.add_field(name="Quest", value=" · ".join(facts), inline=False)
    npcs = []
    if data.get("start", {}).get("name"):
        npcs.append(f"Start: {plain(data['start']['name'])}")
    if data.get("end", {}).get("name"):
        npcs.append(f"End: {plain(data['end']['name'])}")
    if npcs:
        embed.add_field(name="NPCs", value=" · ".join(npcs), inline=False)
    if data.get("itemrewards"):
        embed.add_field(name="Rewards", value=clip(_names(data["itemrewards"]), MAX_FIELD), inline=False)
    elif data.get("rewards"):
        embed.add_field(name="Rewards", value=clip(", ".join(plain(r) for r in data["rewards"]), MAX_FIELD), inline=False)
    if data.get("itemchoices"):
        embed.add_field(name="Choose one", value=clip(_names(data["itemchoices"]), MAX_FIELD), inline=False)
    return embed


def spell_embed(entity: Entity) -> discord.Embed:
    embed = _base(entity, SPELL_COLOR)
    data = entity.data
    meta = [plain(str(v)) for v in (data.get("class"), data.get("tree"), data.get("school")) if v]
    if entity.level:
        meta.append(f"Level {entity.level}")
    if meta:
        embed.add_field(name="Spell", value=" · ".join(meta), inline=False)
    if data.get("description"):
        embed.description = clip(plain(data["description"]), MAX_DESCRIPTION)
    return embed


def talent_embed(entity: Entity) -> discord.Embed:
    embed = _base(entity, SPELL_COLOR)
    data = entity.data
    facts = [plain(str(v)) for v in (data.get("class"), data.get("tree")) if v]
    if data.get("row"):
        facts.append(f"Tier {data['row']}")
    if data.get("maxRanks"):
        facts.append(f"{data['maxRanks']} rank" + ("s" if data["maxRanks"] > 1 else ""))
    if facts:
        embed.add_field(name="Talent", value=" · ".join(facts), inline=False)
    ranks = data.get("ranks") or []
    first_line = lambda text: text.split("\n", 1)[0]  # noqa: E731 - later lines repeat "Higher chance than ..."
    if len(ranks) == 1:
        embed.description = clip(plain(first_line(ranks[0])), MAX_DESCRIPTION)
    elif ranks:
        budget = max(120, MAX_DESCRIPTION // len(ranks))
        embed.description = "\n".join(
            f"**{i}** {clip(plain(first_line(text)), budget)}" for i, text in enumerate(ranks, 1)
        )
    requires = data.get("requires")
    if requires:
        needs = plain(requires["name"])
        if requires.get("ranks"):
            needs += f" ({requires['ranks']})"
        embed.add_field(name="Requires", value=needs, inline=False)
    return embed


def _materials(entries: list[dict]) -> str:
    return clip(_names(entries), MAX_FIELD)


def recipe_embed(entity: Entity) -> discord.Embed:
    embed = _base(entity, DEFAULT_COLOR)
    data = entity.data
    if data.get("profession"):
        embed.add_field(name="Profession", value=plain(data["profession"]), inline=False)
    if data.get("reagents"):
        embed.add_field(name="Materials", value=_materials(data["reagents"]), inline=False)
    return embed


def set_embed(entity: Entity) -> discord.Embed:
    embed = _base(entity, QUALITY_COLORS.get(entity.quality, DEFAULT_COLOR))
    data = entity.data
    lines = []
    if data.get("pieces"):
        lines.append(", ".join(plain(p["name"]) for p in data["pieces"][:12]))
        if data.get("size", 0) > len(data["pieces"][:12]):
            lines[-1] += f" (+{data['size'] - len(data['pieces'][:12])} more)"
    for bonus in data.get("bonuses", [])[:8]:
        lines.append(f"({bonus['count']}) {plain(bonus['text'])}")
    if lines:
        embed.description = clip("\n".join(lines), MAX_DESCRIPTION)
    return embed


def faction_embed(entity: Entity) -> discord.Embed:
    embed = _base(entity, DEFAULT_COLOR)
    bits = [plain(entity.data["group"])] if entity.data.get("group") else []
    side = SIDES.get(entity.data.get("side"))
    if side and side.casefold() not in (b.casefold() for b in bits):
        bits.append(side)
    if bits:
        embed.description = " · ".join(bits)
    return embed


def generic_embed(entity: Entity) -> discord.Embed:
    embed = _base(entity, DEFAULT_COLOR)
    if entity.level is not None:
        embed.description = f"Level {entity.level}"
    return embed


BUILDERS = {
    "item": item_embed, "quest": quest_embed, "spell": spell_embed, "talent": talent_embed,
    "recipe": recipe_embed, "enchant": recipe_embed, "set": set_embed, "faction": faction_embed,
}


def build_embed(entity: Entity) -> discord.Embed:
    return BUILDERS.get(entity.type, generic_embed)(entity)


def embed_size(embed: discord.Embed) -> int:
    return len(embed)
