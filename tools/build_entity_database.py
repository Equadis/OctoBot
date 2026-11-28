#!/usr/bin/env python3
"""Build ``data/entities.sqlite`` from verified, committed source snapshots.

Sources (priority order, see docs/entity-linking.md):
  1. Official OctoWoW database snapshots: docs/sim/data/items/*.json, docs/sim/data/talents/*.json,
     data/sources/official-*.json (written by tools/crawl_official_quests.py and
     tools/crawl_official_lists.py).
  2. Curated aliases: data/sources/entity-aliases.json (every target id is checked against the build).

The database is written to a temporary file next to the target, validated, then moved into place
with ``os.replace`` so a running bot never sees a partial file.  Nothing is fetched here: the build
is reproducible from the repository alone.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from octobot.entity_linking.database import SCHEMA, SCHEMA_VERSION, official_url  # noqa: E402
from octobot.entity_linking.parser import normalize  # noqa: E402

ITEMS = ROOT / "docs" / "sim" / "data" / "items"
TALENTS = ROOT / "docs" / "sim" / "data" / "talents"
SOURCES = ROOT / "data" / "sources"
DEFAULT_OUT = ROOT / "data" / "entities.sqlite"
SCHOOLS = {0: "Physical", 1: "Holy", 2: "Fire", 3: "Nature", 4: "Frost", 5: "Shadow", 6: "Arcane"}
CLASS_NAMES = {
    "druid": "Druid", "hunter": "Hunter", "mage": "Mage", "paladin": "Paladin", "priest": "Priest",
    "rogue": "Rogue", "shaman": "Shaman", "warlock": "Warlock", "warrior": "Warrior",
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf8"))


def head_of(name: str) -> str:
    return normalize(name.split(",", 1)[0]) if "," in name else normalize(name)


class Builder:
    def __init__(self, conn: sqlite3.Connection, stamp: str):
        self.conn, self.stamp = conn, stamp
        self.next_id = 1
        self.ids: dict[tuple[str, int], int] = {}
        self.report: dict[str, dict] = {}

    def add(self, kind, ref, name, *, source, icon=None, quality=None, level=None, rank=None, data=None, url=None):
        name = " ".join(str(name).split())
        if not name or (kind, ref) in self.ids:
            return None
        row_id = self.next_id
        self.next_id += 1
        self.ids[(kind, ref)] = row_id
        norm = normalize(name)
        self.conn.execute(
            "INSERT INTO entities(id,type,ref,name,norm,head,icon,quality,level,rank,url,source,updated,data)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (row_id, kind, ref, name, norm, head_of(name), icon, quality, level, rank,
             url or official_url(kind, ref), source, self.stamp,
             json.dumps(data or {}, ensure_ascii=False, separators=(",", ":"))),
        )
        self.conn.execute("INSERT INTO search(rowid, norm) VALUES (?, ?)", (row_id, norm))
        return row_id

    # ------------------------------------------------------------------ items
    def items(self) -> None:
        catalogue = load(ITEMS / "catalogue.json")
        details = load(ITEMS / "details.json")
        supplement = load(ITEMS / "details-supplement.json")
        details = {**details, **{str(k): v for k, v in supplement.items()}}
        stats = {"catalogue": len(catalogue), "withTooltip": 0, "missingIcon": 0}
        for item in catalogue:
            detail = details.get(str(item["id"]))
            data: dict = {}
            icon = item.get("icon") or None
            if not icon:
                stats["missingIcon"] += 1
            for key in ("armor", "dps", "speed", "classs", "subclass", "slot", "reqlevel"):
                if item.get(key) not in (None, 0):
                    data[key] = item[key]
            if detail:
                stats["withTooltip"] += 1
                data = {
                    "tooltip": detail["tooltipText"],
                    "reqLevel": detail.get("requiredLevel", 0),
                    "slot": detail.get("slot"),
                    "classMask": detail.get("classMask"),
                    "raceMask": detail.get("raceMask"),
                }
            name = detail["name"] if detail else item["name"]
            self.add("item", item["id"], name, source="official:octowow.st/db (item catalogue + tooltips)",
                     icon=icon, quality=item.get("quality"), level=item.get("level"), data=data)
        self.report["item"] = stats

    # ------------------------------------------------------------------ talents and their spells
    def talents(self) -> None:
        spells = talents = 0
        for path in sorted(TALENTS.glob("*.json")):
            doc = load(path)
            klass = CLASS_NAMES.get(doc["classId"], doc["classId"].title())
            trees = {t["index"]: t["name"] for t in doc["trees"]}
            by_id = {t["id"]: t for t in doc["talents"]}
            source = f"official:{doc['source']['url']}"
            for talent in doc["talents"]:
                ids, texts = talent["spellIds"], talent["descriptions"]
                requires = by_id.get(talent["requires"]) if talent.get("requires") is not None else None
                info = {
                    "class": klass, "tree": trees.get(talent["tree"]), "row": talent["row"] + 1,
                    "maxRanks": talent["maxRanks"], "ranks": texts,
                    "requires": ({"name": requires["name"], "ranks": talent.get("requiresRanks")} if requires else None),
                }
                if ids and self.add("talent", ids[0], talent["name"], source=source, icon=talent.get("icon"),
                                    level=None, data=info):
                    talents += 1
                for number, (spell_id, text) in enumerate(zip(ids, texts), 1):
                    rank = f"Rank {number}" if len(ids) > 1 else None
                    if self.add("spell", spell_id, talent["name"], source=source, icon=talent.get("icon"), rank=rank,
                                data={"class": klass, "tree": trees.get(talent["tree"]), "description": text,
                                      "talent": True}):
                        spells += 1
        self.report["talent"] = {"talents": talents}
        self.report["spell(talent ranks)"] = {"spells": spells}

    # ------------------------------------------------------------------ quests
    def quests(self) -> None:
        path = SOURCES / "official-quests.json"
        if not path.exists():
            self.report["quest"] = {"error": "official-quests.json missing"}
            return
        doc = load(path)
        zones = load(SOURCES / "quest-zones.json")["zones"] if (SOURCES / "quest-zones.json").exists() else {}
        details = {}
        detail_path = SOURCES / "official-quest-details.json"
        if detail_path.exists():
            details = load(detail_path)["quests"]
        item_names = {ref for (kind, ref) in self.ids if kind == "item"}
        names = {r["ref"]: r["name"] for r in self.conn.execute("SELECT ref, name FROM entities WHERE type='item'")}
        added = enriched = 0
        for q in doc["quests"]:
            data = {"minLevel": q["reqlevel"], "side": q["side"], "xp": q["xp"]}
            zone = zones.get(str(q["category"]))
            if zone:
                data["zone"] = zone
            for key in ("itemrewards", "itemchoices"):
                if q.get(key):
                    data[key] = [{"id": i, "name": names.get(i), "count": c} for i, c in (p for p in q[key] if len(p) == 2) if i in item_names]
            detail = details.get(str(q["id"]))
            if detail and not detail.get("missing"):
                enriched += 1
                for key in ("start", "end", "objective", "rewards", "races"):
                    if detail.get(key):
                        data[key] = detail[key]
            if self.add("quest", q["id"], q["name"], source="official:octowow.st/db (quest listing)",
                        level=q["level"], data=data):
                added += 1
        self.report["quest"] = {
            "listed": len(doc["quests"]), "added": added, "withDetailPage": enriched,
            "saturatedCategories": len(doc.get("saturated", [])), "failedCategories": len(doc.get("failed", [])),
            "retrievedAt": doc.get("retrievedAt"),
        }

    # ------------------------------------------------------------------ spells, recipes, sets, factions
    def lists(self) -> None:
        """Listings captured by tools/crawl_official_lists.py (data/sources/official-lists.json)."""
        path = SOURCES / "official-lists.json"
        if not path.exists():
            self.report["lists"] = {"error": "official-lists.json missing"}
            return
        doc = load(path)
        source = "official:octowow.st/db (listing)"
        items = {r["ref"]: (r["name"], r["quality"]) for r in self.conn.execute(
            "SELECT ref, name, quality FROM entities WHERE type='item'")}
        tooltips = {int(r["ref"]): json.loads(r["data"]).get("tooltip") for r in self.conn.execute(
            "SELECT ref, data FROM entities WHERE type='item'")}
        added = {"spell": 0, "recipe": 0, "enchant": 0, "set": 0, "faction": 0}

        def reagents(row):
            return [{"id": i, "name": items.get(i, (None,))[0], "count": c} for i, c in (p for p in row.get("reagents", []) if len(p) == 2) if i in items]

        for row in doc.get("spells", []):
            data = {"class": row["class"], "school": SCHOOLS.get(row.get("school"))}
            if self.add("spell", row["id"], row["name"], source=source, rank=row["rank"] or None,
                        level=row["level"] or None, data={k: v for k, v in data.items() if v}):
                added["spell"] += 1
        for kind, key in (("recipe", "recipes"), ("enchant", "enchants")):
            for row in doc.get(key, []):
                data = {"profession": row["profession"]}
                if reagents(row):
                    data["reagents"] = reagents(row)
                if self.add(kind, row["id"], row["name"], source=source, rank=row["rank"] or None, data=data):
                    added[kind] += 1
        for row in doc.get("itemsets", []):
            pieces = [{"id": i, "name": items[i][0]} for i in row["pieces"] if i in items]
            qualities = [items[i][1] for i in row["pieces"] if i in items and items[i][1] is not None]
            bonuses = []
            for i in row["pieces"]:
                text = tooltips.get(i) or ""
                found = re.findall(r"^\((\d+)\) Set: (.+)$", text, re.M)
                if found:
                    bonuses = [{"count": int(n), "text": t.strip()} for n, t in found]
                    break
            data = {"pieces": pieces, "size": len(row["pieces"]), **({"bonuses": bonuses} if bonuses else {})}
            if self.add("set", row["id"], row["name"], source=source, quality=max(qualities) if qualities else None,
                        data=data):
                added["set"] += 1
        for row in doc.get("factions", []):
            data = {k: v for k, v in (("group", row.get("group")), ("side", row.get("side"))) if v}
            if self.add("faction", row["id"], row["name"], source=source, data=data):
                added["faction"] += 1
        self.report["lists"] = {
            "added": added, "retrievedAt": doc.get("retrievedAt"),
            "saturatedCategories": doc.get("saturated", []), "failedCategories": doc.get("failed", []),
        }

    # ------------------------------------------------------------------ aliases
    def aliases(self) -> None:
        path = SOURCES / "entity-aliases.json"
        if not path.exists():
            return
        count = 0
        for entry in load(path)["aliases"]:
            row_id = self.ids.get((entry["type"], entry["id"]))
            if row_id is None:
                raise SystemExit(f"alias target missing from build: {entry}")
            for alias in entry["names"]:
                self.conn.execute("INSERT INTO aliases(norm, entity_id, alias) VALUES (?,?,?)",
                                  (normalize(alias), row_id, alias))
                count += 1
        self.report["aliases"] = {"count": count}


def build(out: Path) -> dict:
    out.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix="entities-", suffix=".tmp", dir=out.parent)
    os.close(fd)
    tmp = Path(tmp_name)
    conn = sqlite3.connect(tmp)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(SCHEMA)
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        builder = Builder(conn, stamp)
        builder.items()
        builder.talents()
        builder.quests()
        builder.lists()
        builder.aliases()
        counts = {r[0]: r[1] for r in conn.execute("SELECT type, COUNT(*) FROM entities GROUP BY type")}
        meta = {
            "schema_version": str(SCHEMA_VERSION), "built_at": stamp, "counts": json.dumps(counts),
            "coverage": json.dumps(builder.report, ensure_ascii=False),
            "sqlite_version": sqlite3.sqlite_version,
        }
        conn.executemany("INSERT INTO meta VALUES (?,?)", meta.items())
        conn.execute("INSERT INTO search(search) VALUES('optimize')")
        conn.commit()
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit("integrity_check failed")
        conn.execute("VACUUM")
        conn.close()
        os.replace(tmp, out)  # atomic swap; readers keep the old inode until they reopen
    finally:
        conn.close()
        if tmp.exists():
            tmp.unlink()
    return {"counts": counts, "coverage": builder.report, "bytes": out.stat().st_size}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    result = build(args.out)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
