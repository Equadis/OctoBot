import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("verify_base", ROOT / "tools/sim/verify-base-stats.py")
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)


def grow(start, steps):
    rows = [list(start)]
    for step in steps:
        rows.append([a + b for a, b in zip(rows[-1], step)])
    return rows


def padded(primary_rows):
    return [r + [100 + i, 0] for i, r in enumerate(primary_rows)]


class BaseStatVerificationTests(unittest.TestCase):
    def test_cmangos_sql_parsing_reads_both_tables(self):
        sql = ("INSERT INTO `player_levelstats` VALUES (1,1,1,23,20,22,20,21),(1,1,2,24,21,23,20,21);\n"
               "INSERT INTO `player_classlevelstats` VALUES (1,1,20,0),(1,2,29,0);\n")
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "mangos.sql"
            path.write_text(sql)
            levels, classes = verify.parse_cmangos(path)
        self.assertEqual(levels[(1, 1, 2)], [24, 21, 23, 20, 21])
        self.assertEqual(classes[(1, 2)], [29, 0])

    def test_zero_sql_parsing_reads_line_based_inserts(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "player_levelstats.sql").write_text(
                "INSERT INTO `player_levelstats` (`race`, `class`) VALUES \n(1,1,1,23,20,22,20,21),\n(1,1,2,24,21,23,20,21);\n")
            (Path(d) / "player_classlevelstats.sql").write_text("INSERT INTO `player_classlevelstats` VALUES \n(1,1,20,0);\n")
            levels, classes = verify.parse_zero(d)
        self.assertEqual(len(levels), 2)
        self.assertEqual(classes[(1, 1)], [20, 0])

    def test_invariants_flag_stalls_and_decreases_but_not_ordinary_growth(self):
        step = [1, 1, 1, 0, 1]
        good = grow([20, 20, 20, 20, 20], [step] * 4)
        stalled = grow([20, 20, 20, 20, 20], [step, [0] * 5, step, step])
        decreasing = grow([20, 20, 20, 20, 20], [step, [0, 0, 0, -3, 4], step, step])
        base = {"Human:warrior": padded(good), "Dwarf:warrior": padded(good), "Orc:warrior": padded(good),
                "Troll:warrior": padded(stalled), "Undead:warrior": padded(decreasing)}
        findings = verify.invariant_findings(base)
        got = {(f["race"], f["toLevel"], f["kind"]) for f in findings}
        self.assertEqual(got, {("Troll", 3, "stalled-while-other-races-grow"), ("Undead", 3, "primary-stat-decrease")})

    def test_a_lone_race_with_no_comparison_is_not_called_an_anomaly(self):
        stalled = grow([20] * 5, [[1] * 5, [0] * 5])
        self.assertEqual(verify.invariant_findings({"Human:warrior": padded(stalled), "Dwarf:warrior": padded(stalled)}), [])

    def test_candidates_chain_through_consecutive_stalls_and_are_never_applied(self):
        step = [1, 1, 1, 0, 1]
        good = grow([20, 20, 20, 20, 20], [step] * 5)
        stalled = [good[0], good[1], good[1], good[1], good[4], good[5]]
        base = {"A:rogue": padded(good), "B:rogue": padded(good), "C:rogue": padded(good), "D:rogue": padded(stalled)}
        findings = verify.invariant_findings(base)
        cands = verify.candidates(base, findings)
        self.assertEqual([c["level"] for c in cands], [3, 4])
        self.assertEqual(cands[0]["candidatePrimary"], good[2])
        self.assertEqual(cands[1]["candidatePrimary"], good[3])
        self.assertTrue(all(c["applied"] is False for c in cands))

    def test_class_table_dips_report_decreases_only(self):
        dips = verify.class_table_dips({(1, 1): [100, 0], (1, 2): [99, 10], (1, 3): [120, 10]})
        self.assertEqual(dips, [{"classId": "warrior", "fromLevel": 1, "toLevel": 2, "field": "baseHealth", "from": 100, "to": 99}])

    def test_committed_report_is_consistent_and_reveals_no_identifiers(self):
        rep = json.loads((ROOT / "docs/sim/data/reference/base-stat-verification.json").read_text())
        s = rep["statusCounts"]
        self.assertEqual(rep["schema"], "octosim-base-stat-verification-v1")
        self.assertEqual(s["corrected"], 0)
        self.assertEqual(s["verifiedInBothSources"] + s["disputed"] + s["unresolvedMissing"] + s["corrected"], s["totalRows"])
        self.assertEqual((s["totalRows"], s["unresolvedMissing"], s["disputed"]), (3540, 1140, 7))
        self.assertEqual(rep["importFidelity"]["mismatchesAgainstCmangos"], 0)
        self.assertEqual(rep["crossSource"]["primaryMismatchesAgainstMangosZero"], 0)
        self.assertEqual(len(rep["unresolvedMissingCombinations"]["combinations"]), 19)
        self.assertTrue(all(c["applied"] is False for c in rep["candidatesNotApplied"]))
        self.assertIn("not OctoWoW", rep["caveat"])
        self.assertTrue(all(len(v) == 64 for v in [rep["sources"][0]["sha256"], *rep["sources"][1]["sha256"].values()]))


if __name__ == "__main__":
    unittest.main()
