"""Builds a small entity database for tests, using the production schema."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from octobot.entity_linking.database import SCHEMA, SCHEMA_VERSION, official_url
from octobot.entity_linking.parser import normalize

# (type, ref, name, extras)
ENTITIES = [
    ("item", 19019, "Thunderfury, Blessed Blade of the Windseeker",
     {"quality": 5, "level": 80, "icon": "inv_sword_39",
      "data": {"tooltip": "Thunderfury, Blessed Blade of the Windseeker\nBinds when picked up\nOne-Hand\nSword\n"
                          "36 - 68  Damage\nSpeed 1.90\nRequires Level 60\n\"The wind howls.\"", "reqLevel": 60}}),
    ("item", 17182, "Sulfuras, Hand of Ragnaros", {"quality": 5, "level": 80, "icon": "inv_hammer_unique_sulfuras"}),
    ("item", 1, "Dark Leather Gloves", {"quality": 2, "level": 20, "icon": "inv_gauntlets_17"}),
    ("item", 2, "Dark Leather Boots", {"quality": 2, "level": 20, "icon": "inv_boots_08"}),
    ("item", 3, "Dark Leather Belt", {"quality": 1, "level": 18}),
    ("item", 4, "Royal Seal of Eldre'Thalas", {"quality": 3, "level": 60}),
    ("item", 5, "Royal Seal of Eldre'Thalas", {"quality": 3, "level": 61}),
    ("item", 6, "Mystery Item", {"quality": 1, "icon": None}),
    ("item", 7, "Cafe Crème Coat", {"quality": 2, "level": 10}),
    ("quest", 7848, "Attunement to the Core",
     {"level": 60, "data": {"minLevel": 55, "side": 1, "xp": 6600, "zone": "Blackrock Mountain",
                            "start": {"name": "Lothos Riftwaker"}, "end": {"name": "Lothos Riftwaker"},
                            "objective": "Recover a Core Fragment."}}),
    ("quest", 1718, "The Islander", {"level": 20, "data": {"minLevel": 10, "side": 3, "xp": 500}}),
    ("quest", 100, "Test of Endurance", {"level": 10, "data": {"minLevel": 5, "side": 2}}),
    ("quest", 101, "Test of Endurance", {"level": 40, "data": {"minLevel": 30, "side": 2}}),
    ("quest", 40362, "A Historian Finds You", {"level": 48, "data": {"minLevel": 42, "side": 3}}),
    ("spell", 1752, "Sinister Strike", {"rank": "Rank 1", "data": {"class": "Rogue", "description": "An instant strike."}}),
    ("spell", 1757, "Sinister Strike", {"rank": "Rank 2", "data": {"class": "Rogue", "description": "An instant strike."}}),
    ("spell", 53, "Backstab", {"rank": "Rank 1", "data": {"class": "Rogue"}}),
    ("talent", 14162, "Improved Eviscerate",
     {"data": {"class": "Rogue", "tree": "Assassination", "row": 1, "maxRanks": 3,
               "ranks": ["Increases damage by 5%.", "Increases damage by 10%.", "Increases damage by 15%."]}}),
]
ALIASES = [("item", 19019, "TF"), ("item", 17182, "Sulf")]


def make_database(path: Path, entities=ENTITIES, aliases=ALIASES) -> Path:
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)
    ids: dict[tuple[str, int], int] = {}
    for row_id, (kind, ref, name, extras) in enumerate(entities, 1):
        norm = normalize(name)
        head = normalize(name.split(",", 1)[0])
        ids[(kind, ref)] = row_id
        conn.execute(
            "INSERT INTO entities(id,type,ref,name,norm,head,icon,quality,level,rank,url,source,updated,data)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (row_id, kind, ref, name, norm, head, extras.get("icon"), extras.get("quality"), extras.get("level"),
             extras.get("rank"), official_url(kind, ref), "test", "2026-11-28", json.dumps(extras.get("data", {}))),
        )
        conn.execute("INSERT INTO search(rowid, norm) VALUES (?, ?)", (row_id, norm))
    for kind, ref, alias in aliases:
        conn.execute("INSERT INTO aliases VALUES (?,?,?)", (normalize(alias), ids[(kind, ref)], alias))
    conn.execute("INSERT INTO meta VALUES ('schema_version', ?)", (str(SCHEMA_VERSION),))
    conn.commit()
    conn.close()
    return path
