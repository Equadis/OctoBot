"""Plain data types shared by the entity-linking modules (no Discord imports)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

ENTITY_TYPES = (
    "item", "quest", "spell", "npc", "recipe", "object",
    "zone", "talent", "enchant", "set", "faction", "boss",
)
DATABASE_ROOT = "https://octowow.st/db/"
# Official database query keyword for each entity type (verified pages only).
URL_KEYS = {
    "item": "item", "quest": "quest", "spell": "spell", "npc": "npc", "boss": "npc",
    "object": "object", "zone": "zone", "faction": "faction", "set": "itemset",
    "recipe": "spell", "enchant": "spell", "talent": "spell",
}


@dataclass(frozen=True)
class Reference:
    """One ``[type:query]`` token found in a message."""
    type: str
    query: str

    @property
    def is_id(self) -> bool:
        return self.query.isdigit()


@dataclass(frozen=True)
class Entity:
    key: int                     # internal row id
    type: str
    ref: int                     # official database id
    name: str
    icon: str | None = None
    quality: int | None = None
    level: int | None = None
    rank: str | None = None
    url: str | None = None
    source: str = ""
    updated: str = ""
    data: dict[str, Any] = field(default_factory=dict)

    def label(self) -> str:
        return f"{self.name} ({self.rank})" if self.rank else self.name


@dataclass(frozen=True)
class Resolution:
    """Outcome of resolving one reference."""
    status: str                  # "resolved" | "ambiguous" | "none"
    entity: Entity | None = None
    candidates: tuple[Entity, ...] = ()
    tier: str = ""
