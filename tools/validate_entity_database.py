#!/usr/bin/env python3
"""Validate data/entities.sqlite and (optionally) benchmark lookups or check live links.

    python tools/validate_entity_database.py                 # structure + invariants (offline)
    python tools/validate_entity_database.py --bench         # lookup timings over the full dataset
    python tools/validate_entity_database.py --online 6      # fetch 6 official pages (polite, ~12 s apart)

Exits non-zero when an invariant fails.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import sqlite3
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from octobot.entity_linking.database import DEFAULT_PATH, SCHEMA_VERSION, EntityDatabase  # noqa: E402
from octobot.entity_linking.models import ENTITY_TYPES, Reference  # noqa: E402
from octobot.entity_linking.parser import normalize  # noqa: E402
from octobot.entity_linking.resolver import Resolver  # noqa: E402

URL = re.compile(r"^https://octowow\.st/db/\?(item|quest|spell|npc|object|zone|faction|itemset)=\d+$")
failures: list[str] = []


def check(condition: bool, message: str) -> None:
    print(("ok   " if condition else "FAIL ") + message)
    if not condition:
        failures.append(message)


def structure(path: Path) -> None:
    conn = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    check(conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok", "sqlite integrity_check")
    meta = dict(conn.execute("SELECT key, value FROM meta"))
    check(meta.get("schema_version") == str(SCHEMA_VERSION), f"schema_version {meta.get('schema_version')}")
    total = conn.execute("SELECT COUNT(*) FROM entities").fetchone()[0]
    check(total > 0, f"{total} entities")
    counts = dict(conn.execute("SELECT type, COUNT(*) FROM entities GROUP BY type"))
    print("     counts:", counts)
    check(set(counts) <= set(ENTITY_TYPES), "only known entity types")
    check(conn.execute("SELECT COUNT(*) FROM search").fetchone()[0] == total, "search index covers every entity")
    check(conn.execute("SELECT COUNT(*) FROM entities WHERE name='' OR norm=''").fetchone()[0] == 0, "no empty names")
    bad = [r for r in conn.execute("SELECT url FROM entities") if not URL.match(r[0] or "")]
    check(not bad, f"every URL is an official octowow.st/db page ({len(bad)} bad)")
    mismatch = 0
    for kind, ref, url in conn.execute("SELECT type, ref, url FROM entities"):
        if not url.endswith(f"={ref}"):
            mismatch += 1
    check(mismatch == 0, "URL id equals entity id")
    check(conn.execute("SELECT COUNT(*) FROM aliases a LEFT JOIN entities e ON e.id=a.entity_id WHERE e.id IS NULL"
                       ).fetchone()[0] == 0, "aliases point at real entities")
    check(conn.execute("SELECT COUNT(*) FROM entities WHERE type='item' AND quality NOT BETWEEN 0 AND 6"
                       ).fetchone()[0] == 0, "item quality within 0-6")
    unsafe = conn.execute("SELECT COUNT(*) FROM entities WHERE icon IS NOT NULL AND icon NOT GLOB '[A-Za-z0-9_-]*'"
                          ).fetchone()[0]
    check(unsafe == 0, "icon names are plain file names")
    coverage = json.loads(meta.get("coverage", "{}"))
    print("     coverage:", json.dumps(coverage))
    for label, node in (("quest", coverage.get("quest", {})), ("lists", coverage.get("lists", {}))):
        failed = node.get("failedCategories")
        failed = len(failed) if isinstance(failed, list) else failed
        if failed:
            print(f"WARN {label}: {failed} source categories were not captured; coverage is partial")
    conn.close()


def representative(path: Path) -> None:
    resolver = Resolver(EntityDatabase(path))
    cases = [("item", "19019", "Thunderfury"), ("item", "TF", "Thunderfury"), ("item", "thunderfurry", "Thunderfury"),
             ("quest", "610", "Duncan"), ("quest", "40362", "Historian")]   # 40362: custom OctoWoW id
    for kind, query, expect in cases:
        result = resolver.resolve(Reference(kind, query))
        got = result.entity.name if result.entity else None
        check(bool(got and expect.lower() in got.lower()), f"[{kind}:{query}] -> {got or result.status}")


def bench(path: Path) -> None:
    db = EntityDatabase(path)
    rng = random.Random(7)
    names = [r["name"] for r in db._query("SELECT name FROM entities WHERE type='item' ORDER BY RANDOM() LIMIT 400")]
    def typo(name: str) -> str:
        i = rng.randrange(1, max(2, len(name) - 1))
        return name[:i] + name[i + 1:]
    sets = {
        "exact": [(("item", n)) for n in names[:200]],
        "id": [(("item", str(r["ref"]))) for r in db._query("SELECT ref FROM entities WHERE type='item' LIMIT 200")],
        "partial": [("item", n.split()[-1]) for n in names[:200] if len(n.split()[-1]) > 3],
        "fuzzy": [("item", typo(n)) for n in names[:200] if len(n) > 8],
    }
    for label, queries in sets.items():
        times = []
        for kind, query in queries:
            resolver = Resolver(db)                         # fresh cache: measure the real lookup
            start = time.perf_counter()
            resolver.resolve(Reference(kind, query))
            times.append((time.perf_counter() - start) * 1000)
        times.sort()
        print(f"bench {label:8} n={len(times):3} median={statistics.median(times):6.2f}ms "
              f"p95={times[int(len(times) * .95) - 1]:6.2f}ms max={times[-1]:6.2f}ms")


def online(path: Path, count: int) -> None:
    import entity_fetch
    db = EntityDatabase(path)
    rows = db._query("SELECT type, ref, name, url FROM entities WHERE type IN ('item','quest') ORDER BY RANDOM() LIMIT ?",
                     (count,))
    for row in rows:
        try:
            page = entity_fetch.fetch(row["url"], refresh=True)
        except Exception as exc:  # network trouble is reported, not hidden
            check(False, f"{row['url']} unreachable: {exc}")
            continue
        title = re.search(r"<title>(.*?)</title>", page, re.S)
        title = title.group(1) if title else ""
        check(normalize(row["name"]) in normalize(title), f"{row['url']} title {title!r} matches {row['name']!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_PATH)
    parser.add_argument("--bench", action="store_true")
    parser.add_argument("--online", type=int, default=0, metavar="N")
    args = parser.parse_args()
    structure(args.db)
    representative(args.db)
    if args.bench:
        bench(args.db)
    if args.online:
        online(args.db, args.online)
    if failures:
        print(f"\n{len(failures)} check(s) failed")
        sys.exit(1)
    print("\nall checks passed")


if __name__ == "__main__":
    main()
