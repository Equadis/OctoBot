#!/usr/bin/env python3
"""Snapshot quest data from the official OctoWoW database (https://octowow.st/db/).

Stage 1 (default): walk the site's own quest category menu (``mn_quests``), read each category's
listing (id, name, level, required level, side, XP, category) and write
``data/sources/official-quests.json``.  Listings are capped at ~300 rows per request, so categories
that hit the cap are recorded under ``saturated`` instead of being silently treated as complete.

Stage 2 (``--details N``): fetch up to N individual quest pages not yet captured and store the
facts printed on them (start/end NPC, objective text, reward names) in
``data/sources/official-quest-details.json``.  Re-run to continue; pages are cached.

Requests are spaced ~12 s apart because the site answers faster traffic with HTTP 429.
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
SOURCES = ROOT / "data" / "sources"
ROW = re.compile(r"\{id:\s*'(\d+)',name:\s*'((?:[^'\\]|\\.)*)',([^{}]*)\}")
FIELD = re.compile(r"(\w+):\s*'?(-?\d+)'?(?=,|$)")
PAIRS = re.compile(r"(itemrewards|itemchoices):\s*\[((?:\[[^\]]*\],?)*)\]")
UNESCAPE = re.compile(r"\\(.)")


def categories(locale_js: str) -> list[tuple[str, str]]:
    """Leaf categories of ``mn_quests`` as (query, label)."""
    start = locale_js.index("var mn_quests")
    end = locale_js.index("var mn_", start + 10) if "var mn_" in locale_js[start + 10:] else len(locale_js)
    body = locale_js[start:end]
    leaves: list[tuple[str, str]] = []
    # [group, "Group", , [ [zone, "Zone"], ... ]]
    for group in re.finditer(r"\[(-?\d+),\s*\"([^\"]+)\",\s*,\s*\[(.*?)\]\s*\]\s*(?=,\s*\[-?\d+,|\s*\];)", body, re.S):
        for zone in re.finditer(r"\[(-?\d+),\s*\"((?:[^\"\\]|\\.)*)\"\]", group.group(3)):
            leaves.append((f"?quests={group.group(1)}.{zone.group(1)}", f"{group.group(2)} / {zone.group(2)}"))
    return leaves


def parse_listing(page: str) -> list[dict]:
    rows = []
    for m in ROW.finditer(page):
        rest = m.group(3)
        pairs = {}
        for key, body in PAIRS.findall(rest):
            pairs[key] = [[int(n) for n in pair.split(",") if n] for pair in re.findall(r"\[([^\]]*)\]", body)]
        fields = {k: int(v) for k, v in FIELD.findall(PAIRS.sub("", rest).strip(", "))}
        if "level" not in fields:
            continue
        row = {
            "id": int(m.group(1)), "name": html.unescape(UNESCAPE.sub(r"\1", m.group(2))).strip(),
            "level": fields["level"], "reqlevel": fields.get("reqlevel", 0), "side": fields.get("side", 0),
            "xp": fields.get("xp", 0), "category": fields.get("category", 0),
            "category2": fields.get("category2", 0), "type": fields.get("type", 0),
        }
        row.update(pairs)
        rows.append(row)
    return rows


def parse_detail(page: str, quest_id: int) -> dict | None:
    if "Quick Facts" not in page:
        return None
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    facts = re.search(r'<table class="infobox">(.*?)</table>', body, re.S)
    out: dict = {"id": quest_id}
    if facts:
        text = facts.group(1)
        for label, key in (("Start", "start"), ("End", "end")):
            m = re.search(rf"<div>{label}\s*:\s*<a href=\"\?(npc|object|item)=(\d+)\">([^<]+)</a>", text)
            if m:
                out[key] = {"type": m.group(1), "id": int(m.group(2)), "name": html.unescape(m.group(3)).strip()}
        side = re.search(r"Side:\s*<span class=\"(\w+)-icon\">([^<]*)</span>", text)
        if side:
            out["races"] = html.unescape(side.group(2)).strip()
    main = re.search(r"<h1>(.*?)</h1>(.*?)<h3>", body, re.S)
    if main:
        objective = re.sub(r"<[^>]+>", " ", main.group(2))
        objective = re.sub(r"\s+", " ", html.unescape(objective)).strip()
        if objective:
            out["objective"] = objective[:600]
    rewards = re.search(r"<h3>Rewards?</h3>(.*?)<h3>", body, re.S)
    if rewards:
        names = [html.unescape(n).strip() for n in re.findall(r'<a href="\?(?:item|spell)=\d+">([^<]+)</a>', rewards.group(1))]
        if names:
            out["rewards"] = names[:12]
    return out


def crawl_listings(refresh: bool) -> dict:
    menu = entity_fetch.fetch("templates/wowhead/js/locale_enus.js", refresh=refresh)
    leaves = categories(menu)
    names = {}
    quests: dict[int, dict] = {}
    saturated, failed = [], []
    for index, (query, label) in enumerate(leaves, 1):
        try:
            rows = parse_listing(entity_fetch.fetch(query, refresh=refresh))
        except Exception as exc:  # recorded, never hidden
            failed.append({"query": query, "label": label, "error": str(exc)[:200]})
            print(f"[{index}/{len(leaves)}] FAILED {label}", file=sys.stderr)
            continue
        for row in rows:
            quests[row["id"]] = row
            names.setdefault(str(row["category"]), None)
        if len(rows) >= 299:
            saturated.append({"query": query, "label": label, "returned": len(rows)})
        print(f"[{index}/{len(leaves)}] {label}: {len(rows)}", file=sys.stderr)
    # The unfiltered listing also helps cover quests outside any menu category.
    try:
        for row in parse_listing(entity_fetch.fetch("?quests", refresh=refresh)):
            quests.setdefault(row["id"], row)
    except Exception as exc:
        failed.append({"query": "?quests", "error": str(exc)[:200]})
    return {
        "source": "https://octowow.st/db/?quests",
        "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "categories": len(leaves), "saturated": saturated, "failed": failed,
        "quests": sorted(quests.values(), key=lambda q: q["id"]),
    }


def crawl_details(limit: int) -> None:
    listing = json.loads((SOURCES / "official-quests.json").read_text(encoding="utf8"))
    path = SOURCES / "official-quest-details.json"
    done = json.loads(path.read_text(encoding="utf8")) if path.exists() else {"quests": {}}
    todo = [q["id"] for q in listing["quests"] if str(q["id"]) not in done["quests"]][:limit]
    for count, quest_id in enumerate(todo, 1):
        try:
            record = parse_detail(entity_fetch.fetch(f"?quest={quest_id}"), quest_id)
        except FileNotFoundError:
            record = None
        except Exception as exc:
            print(f"quest {quest_id}: {exc}", file=sys.stderr)
            continue
        done["quests"][str(quest_id)] = record or {"id": quest_id, "missing": True}
        if count % 25 == 0:
            done["retrievedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            path.write_text(json.dumps(done, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
            print(f"details {count}/{len(todo)}", file=sys.stderr)
    done["source"] = "https://octowow.st/db/?quest=<id>"
    done["retrievedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    path.write_text(json.dumps(done, ensure_ascii=False, separators=(",", ":")), encoding="utf8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="ignore the page cache")
    parser.add_argument("--details", type=int, default=0, metavar="N", help="fetch up to N quest detail pages")
    args = parser.parse_args()
    SOURCES.mkdir(parents=True, exist_ok=True)
    if args.details:
        crawl_details(args.details)
        return
    result = crawl_listings(args.refresh)
    (SOURCES / "official-quests.json").write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf8"
    )
    print(f"{len(result['quests'])} quests, {len(result['saturated'])} saturated, {len(result['failed'])} failed")


if __name__ == "__main__":
    main()
