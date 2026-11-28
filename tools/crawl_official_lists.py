#!/usr/bin/env python3
"""Snapshot spell, recipe/enchant, item-set and faction listings from the official OctoWoW database.

Writes ``data/sources/official-lists.json``.  Each listing page is cached by ``entity_fetch`` and
requests are spaced out because the site rate-limits (HTTP 429).  Categories that hit the site's
~300-row listing cap are recorded under ``saturated`` rather than treated as complete.
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import entity_fetch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "sources" / "official-lists.json"
B = chr(92)  # backslash, kept out of the regex literals below for readability

CLASSES = {  # class skill-menu id -> (name, [skill line ids]); ids come from the site's mn_spells menu
    11: ("Druid", [574, 134, 573]), 3: ("Hunter", [50, 261, 163, 51]), 8: ("Mage", [237, 8, 6]),
    2: ("Paladin", [594, 267, 184]), 5: ("Priest", [613, 56, 78]), 4: ("Rogue", [253, 38, 633, 40, 39]),
    7: ("Shaman", [375, 373, 374]), 9: ("Warlock", [355, 354, 593]), 1: ("Warrior", [26, 256, 257]),
}
RECIPE_SKILLS = {171: "Alchemy", 164: "Blacksmithing", 202: "Engineering", 165: "Leatherworking",
                 197: "Tailoring", 185: "Cooking", 129: "First Aid", 755: "Jewelcrafting"}
ENCHANT_SKILLS = {333: "Enchanting"}
SCHOOLS = {0: "Physical", 1: "Holy", 2: "Fire", 3: "Nature", 4: "Frost", 5: "Shadow", 6: "Arcane"}

STRING = r"'((?:[^'" + B + B + r"]|" + B + B + r".)*)'"
SPELL_ROW = re.compile(r"{name:\s*" + STRING + r",([^{}]*)}")
SET_ROW = re.compile(r"{name:\s*" + STRING + r",pieces:\s*\[([\d,]*)\]((?:,[^{}]*)?)}")
FACTION_ROW = re.compile(r"{id:\s*(\d+),name:\s*" + STRING + r"((?:,[^{}]*)?)}")
NUMBER = re.compile(r"(\w+):\s*'?(-?\d+)'?(?=,|$)")
TEXT = re.compile(r"(\w+):\s*" + STRING)
PAIR_LIST = re.compile(r"(reagents|source):\s*\[((?:\[[^\]]*\],?)*)\]")


def unescape(text: str) -> str:
    return html.unescape(re.sub(B + B + r"(.)", r"\1", text)).strip()


def parse_spells(page: str) -> list[dict]:
    rows = []
    for m in SPELL_ROW.finditer(page):
        rest = m.group(2)
        extra = {k: [[int(n) for n in p.split(",") if n] for p in re.findall(r"\[([^\]]*)\]", body)]
                 for k, body in PAIR_LIST.findall(rest)}
        rest_plain = PAIR_LIST.sub("", rest)
        numbers = {k: int(v) for k, v in NUMBER.findall(re.sub(TEXT, "", rest_plain))}
        texts = {k: unescape(v) for k, v in TEXT.findall(rest_plain)}
        if "id" not in numbers:
            continue
        name = unescape(m.group(1)).lstrip("@")
        rows.append({"id": numbers["id"], "name": name, "level": numbers.get("level", 0),
                     "school": numbers.get("school"), "rank": texts.get("rank", ""), **extra})
    return rows


def parse_sets(page: str) -> list[dict]:
    rows = []
    for m in SET_ROW.finditer(page):
        raw = unescape(m.group(1))
        quality = 6 - int(raw[0]) if raw[:1].isdigit() else None   # same leading-digit encoding as item names
        name = raw[1:] if quality is not None else raw
        numbers = {k: int(v) for k, v in NUMBER.findall(m.group(3).lstrip(","))}
        rows.append({"id": numbers["id"], "name": name, "quality": quality,
                     "pieces": [int(p) for p in m.group(2).split(",") if p], "type": numbers.get("type")})
    return rows


def parse_factions(page: str) -> list[dict]:
    rows = []
    for m in FACTION_ROW.finditer(page):
        texts = {k: unescape(v) for k, v in TEXT.findall(m.group(3))}
        numbers = {k: int(v) for k, v in NUMBER.findall(TEXT.sub("", m.group(3)).lstrip(","))}
        rows.append({"id": int(m.group(1)), "name": unescape(m.group(2)), "group": texts.get("group"),
                     "side": int(texts["side"]) if texts.get("side", "").isdigit() else numbers.get("side")})
    return rows


def collect(refresh: bool) -> dict:
    result: dict = {"source": "https://octowow.st/db/", "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "spells": [], "recipes": [], "enchants": [], "itemsets": [], "factions": [],
                    "saturated": [], "failed": []}

    def listing(query: str, label: str, parser):
        try:
            rows = parser(entity_fetch.fetch(query, refresh=refresh))
        except Exception as exc:
            result["failed"].append({"query": query, "label": label, "error": str(exc)[:200]})
            print(f"FAILED {label}", file=sys.stderr)
            return []
        if parser is parse_spells and len(rows) >= 299:   # only spell listings are capped (~300 rows)
            result["saturated"].append({"query": query, "label": label, "returned": len(rows)})
        print(f"{label}: {len(rows)}", file=sys.stderr)
        return rows

    result["itemsets"] = listing("?itemsets", "item sets", parse_sets)
    result["factions"] = listing("?factions", "factions", parse_factions)
    for class_id, (class_name, lines) in CLASSES.items():
        for line in lines:
            for row in listing(f"?spells=7.{class_id}.{line}", f"{class_name} skill {line}", parse_spells):
                result["spells"].append({**row, "class": class_name})
    for skill, name in RECIPE_SKILLS.items():
        for row in listing(f"?spells=11.{skill}", name, parse_spells):
            result["recipes"].append({**row, "profession": name})
    for skill, name in ENCHANT_SKILLS.items():
        for row in listing(f"?spells=11.{skill}", name, parse_spells):
            result["enchants"].append({**row, "profession": name})
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="ignore the page cache")
    args = parser.parse_args()
    result = collect(args.refresh)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8")
    print({k: len(v) for k, v in result.items() if isinstance(v, list)})


if __name__ == "__main__":
    main()
