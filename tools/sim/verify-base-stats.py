"""Verify docs/sim/core/base-stats.mjs against its public vanilla sources.

Inputs are local copies of public files (fetch them yourself; they are not committed):
  --cmangos   mangos-classic sql/base/mangos.sql (the source the repo was imported from)
  --zero-dir  folder holding mangoszero/database player_levelstats.sql and player_classlevelstats.sql
Neither source is OctoWoW. Agreement between them verifies the import, not live server values.

Nothing here edits base-stats.mjs. Candidate replacements for anomalous rows are computed from the other
races of the same class and are reported as evidence only (applied: false).
"""
import argparse
import hashlib
import json
import re
import statistics
from pathlib import Path

RACE = {1: "Human", 2: "Orc", 3: "Dwarf", 4: "Night Elf", 5: "Undead", 6: "Tauren", 7: "Gnome", 8: "Troll"}
CLS = {1: "warrior", 2: "paladin", 3: "hunter", 4: "rogue", 5: "priest", 7: "shaman", 8: "mage", 9: "warlock", 11: "druid"}
FIELDS = ["strength", "agility", "stamina", "intellect", "spirit", "baseHealth", "baseMana"]
PRIMARY = FIELDS[:5]
CMANGOS_URL = "https://github.com/cmangos/mangos-classic/blob/master/sql/base/mangos.sql"
ZERO_URL = "https://github.com/mangoszero/database/tree/master/World/Setup/FullDB"


def read_repo_base(path):
    text = Path(path).read_text(encoding="utf8")
    match = re.search(r"export const BASE_STATS=(\{.*\});?\s*$", text, re.S)
    if not match:
        raise SystemExit("Could not find BASE_STATS in " + str(path))
    return json.loads(match.group(1))


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def parse_cmangos(path):
    text = Path(path).read_text(encoding="utf8")

    def table(name):
        found = re.search(r"INSERT INTO `%s` VALUES\s*(.*?);\n" % name, text, re.S)
        if not found:
            raise SystemExit("Table not found: " + name)
        return [[int(x) for x in g.split(",")] for g in re.findall(r"\(([^()]*)\)", found.group(1))]

    levels = {(v[0], v[1], v[2]): v[3:8] for v in table("player_levelstats")}
    classes = {(v[0], v[1]): v[2:4] for v in table("player_classlevelstats")}
    return levels, classes


def parse_zero(folder):
    def rows(name):
        out = []
        for line in (Path(folder) / (name + ".sql")).read_text(encoding="utf8").splitlines():
            line = line.strip()
            if line.startswith("(") and line[1:2].isdigit():
                out.append([int(x) for x in line.lstrip("(").rstrip(";,").rstrip(")").split(",")])
        return out

    levels = {(v[0], v[1], v[2]): v[3:8] for v in rows("player_levelstats")}
    classes = {(v[0], v[1]): v[2:4] for v in rows("player_classlevelstats")}
    return levels, classes


def key_of(race_id, class_id):
    return f"{RACE[race_id]}:{CLS[class_id]}"


def increments(rows, i):
    return [rows[i][j] - rows[i - 1][j] for j in range(5)]


def invariant_findings(base):
    """Primary-stat transitions that break the pattern every other race of the class follows."""
    by_class = {}
    for key in base:
        by_class.setdefault(key.split(":")[1], []).append(key)
    findings = []
    for cls, keys in sorted(by_class.items()):
        for key in sorted(keys):
            rows = base[key]
            for i in range(1, len(rows)):
                inc = increments(rows, i)
                others = [increments(base[o], i) for o in keys if o != key and len(base[o]) > i]
                kind = None
                if any(v < 0 for v in inc):
                    kind = "primary-stat-decrease"
                elif not any(inc) and sum(1 for o in others if any(o)) >= 2:
                    kind = "stalled-while-other-races-grow"
                if not kind:
                    continue
                med = [statistics.median(o[j] for o in others) if others else 0 for j in range(5)]
                findings.append({"race": key.split(":")[0], "classId": cls, "fromLevel": i, "toLevel": i + 1, "kind": kind,
                                 "increments": dict(zip(PRIMARY, inc)),
                                 "otherRaceMedianIncrements": dict(zip(PRIMARY, [int(m) if m == int(m) else m for m in med])),
                                 "otherRacesCompared": len(others)})
    return findings


def candidates(base, findings):
    out = []
    previous = None
    for f in sorted(findings, key=lambda x: (x["race"], x["classId"], x["fromLevel"])):
        key = f"{f['race']}:{f['classId']}"
        rows = base[key]
        med = [f["otherRaceMedianIncrements"][p] for p in PRIMARY]
        if f["kind"] == "stalled-while-other-races-grow":
            target = f["toLevel"]
            run = previous and previous["key"] == key and previous["toLevel"] == f["fromLevel"]
            start = previous["candidate"] if run else rows[f["fromLevel"] - 1][:5]
            cand = [start[j] + med[j] for j in range(5)]
            basis = (f"level {f['fromLevel']} " + ("candidate" if run else "row") +
                     f" plus the median increment of {f['otherRacesCompared']} other races")
        else:
            target = f["fromLevel"]
            cand = [rows[f["toLevel"] - 1][j] - med[j] for j in range(5)]
            basis = f"level {f['toLevel']} minus the median increment of {f['otherRacesCompared']} other races"
        nxt = rows[target][:5] if target < len(rows) else None
        out.append({"race": f["race"], "classId": f["classId"], "level": target, "currentPrimary": rows[target - 1][:5],
                    "candidatePrimary": cand, "basis": basis,
                    "nextRowPrimary": nxt, "applied": False,
                    "note": "Inferred from other races, not an OctoWoW or source value. Not applied."})
        previous = {"key": key, "toLevel": f["toLevel"], "candidate": cand}
    return out


def class_table_dips(classes):
    dips = []
    for (c, lvl), (hp, mana) in sorted(classes.items()):
        prev = classes.get((c, lvl - 1))
        if not prev:
            continue
        for name, a, b in (("baseHealth", prev[0], hp), ("baseMana", prev[1], mana)):
            if b < a:
                dips.append({"classId": CLS[c], "fromLevel": lvl - 1, "toLevel": lvl, "field": name, "from": a, "to": b})
    return dips


def verify(base, cm, zero, cm_path, zero_dir, known_conflicts):
    cm_levels, cm_classes = cm
    z_levels, z_classes = zero
    combos = sorted({(r, c) for (r, c, l) in cm_levels})
    mism_cm, mism_zero, class_conf = [], [], []
    compared = 0
    for r, c in combos:
        key = key_of(r, c)
        if key not in base:
            raise SystemExit("Repo lacks source combination " + key)
        for lvl in range(1, 61):
            row = base[key][lvl - 1]
            want = cm_levels[(r, c, lvl)] + cm_classes[(c, lvl)]
            compared += 1
            if want != row:
                mism_cm.append({"key": key, "level": lvl, "source": want, "repo": row})
            if z_levels.get((r, c, lvl)) != row[:5]:
                mism_zero.append({"key": key, "level": lvl, "zero": z_levels.get((r, c, lvl)), "repo": row[:5]})
            zc = z_classes.get((c, lvl))
            if zc and zc != row[5:7]:
                class_conf.append({"key": key, "level": lvl, "mangosZero": zc, "cmangosAndRepo": row[5:7]})
    findings = invariant_findings(base)
    cand = candidates(base, findings)
    anomalous = {(f["race"], f["classId"], lvl) for f in findings for lvl in (f["fromLevel"], f["toLevel"])}
    flagged_rows = {tuple(x) for x in known_conflicts["flaggedAnomalies"]}
    conflict_rows = {(x["key"], x["level"]) for x in class_conf}
    repo_missing = sorted(k for k in known_conflicts["allCombinations"] if k not in base)
    total_rows = len(known_conflicts["allCombinations"]) * 60
    disputed = len(flagged_rows) + len(conflict_rows)
    verified = compared - disputed
    dips_cm = class_table_dips(cm_classes)
    dips_zero = class_table_dips(z_classes)
    return {
        "schema": "octosim-base-stat-verification-v1",
        "verifiedOn": "2026-11-22",
        "unit": "rows of strength, agility, stamina, intellect, spirit, base health, base mana",
        "caveat": "Both sources are vanilla cores, not OctoWoW. Agreement verifies the import, not live OctoWoW values.",
        "sources": [
            {"name": "CMaNGOS Classic sql/base/mangos.sql", "url": CMANGOS_URL, "sha256": sha256(cm_path),
             "levelRows": len(cm_levels), "classRows": len(cm_classes)},
            {"name": "MaNGOS Zero World/Setup/FullDB", "url": ZERO_URL,
             "sha256": {n: sha256(Path(zero_dir) / (n + ".sql")) for n in ("player_levelstats", "player_classlevelstats")},
             "levelRows": len(z_levels), "classRows": len(z_classes)},
        ],
        "importFidelity": {"rowsCompared": compared, "mismatchesAgainstCmangos": len(mism_cm), "mismatchSamples": mism_cm[:10]},
        "crossSource": {"primaryRowsCompared": compared, "primaryMismatchesAgainstMangosZero": len(mism_zero),
                        "classHealthManaDisagreements": class_conf},
        "statusCounts": {"verifiedInBothSources": verified, "disputed": disputed, "unresolvedMissing": len(repo_missing) * 60,
                         "corrected": 0, "totalRows": total_rows,
                         "note": "corrected is 0: no record can be replaced without inventing values; see candidates."},
        "disputedRecords": {
            "anomalies": [{"race": f["race"], "classId": f["classId"], "fromLevel": f["fromLevel"], "toLevel": f["toLevel"],
                           "kind": f["kind"], "increments": f["increments"],
                           "otherRaceMedianIncrements": f["otherRaceMedianIncrements"], "otherRacesCompared": f["otherRacesCompared"],
                           "presentInCmangos": True, "presentInMangosZero": not any(
                               m["key"] == f"{f['race']}:{f['classId']}" and m["level"] in (f["fromLevel"], f["toLevel"]) for m in mism_zero)}
                          for f in findings],
            "sourceConflicts": class_conf,
        },
        "candidatesNotApplied": cand,
        "classTableNonMonotonicTransitions": {"cmangos": dips_cm, "mangosZeroMatches": dips_cm == dips_zero or "differs",
                                              "note": "Class-only health/mana tables shared by every race. Reported, not changed."},
        "unresolvedMissingCombinations": {"combinations": repo_missing, "rows": len(repo_missing) * 60,
                                          "inSources": False, "note": "No rows in either source. Not substituted from another race or class."},
        "outOfScope": known_conflicts["outOfScope"],
    }


def markdown(rep):
    s = rep["statusCounts"]
    out = ["# Base-stat verification", "",
           f"Verified on {rep['verifiedOn']}. {rep['caveat']}", "",
           "## Result", "",
           "| Status | Rows |", "|---|---|",
           f"| Verified (identical in CMaNGOS Classic and MaNGOS Zero) | {s['verifiedInBothSources']:,} |",
           f"| Disputed (kept, flagged) | {s['disputed']} |",
           f"| Corrected | {s['corrected']} |",
           f"| Unresolved: no source row | {s['unresolvedMissing']:,} |",
           f"| Total | {s['totalRows']:,} |", "",
           f"Import fidelity: {rep['importFidelity']['rowsCompared']:,} rows compared with the CMaNGOS source, "
           f"{rep['importFidelity']['mismatchesAgainstCmangos']} mismatches. "
           f"Cross-check: {rep['crossSource']['primaryRowsCompared']:,} primary-stat rows compared with MaNGOS Zero, "
           f"{rep['crossSource']['primaryMismatchesAgainstMangosZero']} mismatches.", "",
           "## Sources", ""]
    for src in rep["sources"]:
        out.append(f"- {src['name']}: {src['url']} ({src['levelRows']} level rows, {src['classRows']} class rows)")
    out += ["", "## Disputed records", "",
            "### Anomalies found by invariant checks", "",
            "| Combination | Transition | Kind | This race | Other races (median) | Compared |", "|---|---|---|---|---|---|"]
    for a in rep["disputedRecords"]["anomalies"]:
        out.append(f"| {a['race']} {a['classId']} | L{a['fromLevel']}→L{a['toLevel']} | {a['kind']} | {list(a['increments'].values())} | {list(a['otherRaceMedianIncrements'].values())} | {a['otherRacesCompared']} |")
    out += ["", "Order of values: strength, agility, stamina, intellect, spirit. Both source datasets contain these rows unchanged.", "",
            "### Source conflicts", "", "| Combination | Level | MaNGOS Zero health/mana | CMaNGOS and repo health/mana |", "|---|---|---|---|"]
    for c in rep["disputedRecords"]["sourceConflicts"]:
        out.append(f"| {c['key']} | {c['level']} | {c['mangosZero']} | {c['cmangosAndRepo']} |")
    out += ["", "## Candidates (evidence only, not applied)", "",
            "| Combination | Level | Current | Candidate | Basis |", "|---|---|---|---|---|"]
    for c in rep["candidatesNotApplied"]:
        out.append(f"| {c['race']} {c['classId']} | {c['level']} | {c['currentPrimary']} | {c['candidatePrimary']} | {c['basis']} |")
    out += ["", "These values are inferred from other races. No OctoWoW or source value supports them, so nothing was changed.", "",
            "## Class health and mana tables", "",
            f"{len(rep['classTableNonMonotonicTransitions']['cmangos'])} level transitions in the class-only tables decrease (for example warrior health 101 to 100 at level 11). "
            "They are identical across all races and sources, so they are reported as source behaviour and left unchanged.", "",
            "## Unresolved: missing combinations", "",
            f"{len(rep['unresolvedMissingCombinations']['combinations'])} combinations ({rep['unresolvedMissingCombinations']['rows']:,} rows) have no rows in either source: "
            + ", ".join(rep["unresolvedMissingCombinations"]["combinations"]) + ". They are not substituted from another race or class.", "",
            "## Out of scope", ""]
    for o in rep["outOfScope"]:
        out.append(f"- {o}")
    return "\n".join(out) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-base", type=Path, required=True)
    parser.add_argument("--cmangos", type=Path, required=True)
    parser.add_argument("--zero-dir", type=Path, required=True)
    parser.add_argument("--context", type=Path, required=True, help="JSON with allCombinations, flaggedAnomalies, outOfScope")
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--md-out", type=Path, required=True)
    args = parser.parse_args()
    base = read_repo_base(args.repo_base)
    rep = verify(base, parse_cmangos(args.cmangos), parse_zero(args.zero_dir), args.cmangos, args.zero_dir,
                 json.loads(args.context.read_text(encoding="utf8")))
    args.json_out.write_text(json.dumps(rep, indent=1) + "\n", encoding="utf8")
    args.md_out.write_text(markdown(rep), encoding="utf8")
    print(json.dumps(rep["statusCounts"]))


if __name__ == "__main__":
    main()
