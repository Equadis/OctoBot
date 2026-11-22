import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("chronicle_casts", ROOT / "tools/sim/import-chronicle-casts.py")
chronicle = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(chronicle)


def varint(value):
    encoded = bytearray()
    while value >= 128:
        encoded.append((value & 127) | 128)
        value >>= 7
    encoded.append(value)
    return bytes(encoded)


def blob(data):
    return varint(len(data)) + data


def data_field(number, data):
    return varint(number * 8 + 2) + blob(data)


def scalar_field(number, value):
    return varint(number * 8) + varint(value)


def cast(spell_id, caster, synthetic=False):
    spell = scalar_field(1, spell_id) + data_field(2, b"Holy Strike")
    return data_field(1, scalar_field(4, int(synthetic))) + data_field(3, spell) + data_field(4, caster)


def frame(*events, encounter=b"pull"):
    return blob(encounter) + varint(1) + varint(len(events)) + blob(b"".join(map(blob, events)))


INSTANCE = {
    "tenant_slug": "octo", "realm_name": "N'Zoth", "unlisted": False,
    "slug": "sample", "id": "sample-id", "name": "Blackwing Lair",
    "versions": {"wow_build": "7272", "wow_client": "1.18.1"},
    "encounters": [{"id": "pull", "start_time": "2026-11-20T00:00:00Z"}],
    "players": {"a": {"class": "PALADIN", "level": 60}, "b": {"class": "HUNTER"}},
}


class ChronicleCastImportTests(unittest.TestCase):
    def test_observed_ids_preserved_without_rank_inference_or_caster_identifiers(self):
        data = frame(cast(10332, b"a"), cast(10333, b"a"), cast(10333, b"a"),
                     cast(10333, b"a", synthetic=True), cast(10333, b"b"))
        rows = chronicle.summarise(INSTANCE, data)
        self.assertEqual([(r["spellId"], r["casts"], r["distinctCasters"]) for r in rows],
                         [(10332, 1, 1), (10333, 2, 1)])
        self.assertEqual(rows[0]["reportedCasterLevels"], [60])
        self.assertTrue(all("rank" not in r and "caster" not in r for r in rows))

    def test_all_casts_reported_with_mapping_status_and_nothing_dropped(self):
        known = {10333: {"paladin:holy-strike"}, 5: {"paladin:a", "paladin:b"}, 7: {"hunter:other"}}
        def spell_cast(spell_id, caster, label):
            spell = scalar_field(1, spell_id) + data_field(2, label)
            return data_field(1, scalar_field(4, 0)) + data_field(3, spell) + data_field(4, caster)
        data = frame(spell_cast(10333, b"a", b"Holy Strike"), spell_cast(10333, b"a", b"Holy Strike"),
                     spell_cast(5, b"a", b"Dual"), spell_cast(999, b"a", b"Mystery"),
                     spell_cast(7, b"a", b"Wrong class"), spell_cast(10333, b"npc", b"Holy Strike"),
                     cast(10333, b"a", synthetic=True))
        report = chronicle.summarise_all(INSTANCE, data, known)
        got = {r["spellId"]: (r["status"], r["casts"], r["abilityKeys"]) for r in report["rows"]}
        self.assertEqual(got[10333], ("mapped", 2, ["paladin:holy-strike"]))
        self.assertEqual(got[5][0], "ambiguous")
        self.assertEqual(got[999][0], "unmapped")
        self.assertEqual(got[7][0], "unmapped")
        self.assertEqual(report["skipped"], {"synthetic": 1, "non_player": 1})

    def test_damage_stream_counts_hits_per_class_spell_and_skips_pets(self):
        def hit(caster, spell_id, label, amount):
            spell = scalar_field(1, spell_id) + data_field(2, label)
            return data_field(3, caster) + data_field(4, label) + scalar_field(7, amount) + data_field(10, spell)
        players = {"0xA": {"class": "PALADIN"}, "0xB": {"class": "HUNTER"}}
        data = frame(hit(b"0xA", 10333, b"Holy Strike", 500), hit(b"0xA", 10333, b"Holy Strike", 700),
                     hit(b"0xB", 10333, b"Holy Strike", 9), hit(b"0xPET", 10333, b"Holy Strike", 1))
        report = chronicle.summarise_damage(players, data, {10333: {"paladin:holy-strike"}})
        got = {(r["classId"], r["spellId"]): (r["status"], r["hits"], r["totalAmount"]) for r in report["rows"]}
        self.assertEqual(got[("paladin", 10333)], ("mapped", 2, 1200))
        self.assertEqual(got[("hunter", 10333)][0], "unmapped")
        self.assertEqual(report["skippedNonPlayerEvents"], 1)
        self.assertEqual(report["unit"], "hits (not casts)")

    def test_observed_spells_file_closes_known_gaps_without_claiming_ranks(self):
        import json
        base = ROOT / "docs/sim/data/rotations"
        observed = json.loads((base / "chronicle-observed-spells.json").read_text())
        self.assertEqual(observed["schema"], "octosim-chronicle-observed-v1")
        self.assertNotIn("0x", json.dumps(observed))
        keys = {r["key"] for r in json.loads((base / "ability-evidence.json").read_text())["records"]}
        pairs = {(c["abilityKey"], c["spellId"]) for c in observed["observedCandidates"]}
        self.assertIn(("paladin:holy-strike", 10333), pairs)
        self.assertNotIn(("hunter:steady-shot", 3668), pairs)
        self.assertEqual([(c["abilityKey"], c["spellId"]) for c in observed["disputedObserved"]], [("hunter:steady-shot", 3668)])
        self.assertTrue({k for k, _ in pairs} <= keys)
        self.assertTrue(all("rank" not in c for c in observed["observedCandidates"]))
        known = chronicle.load_known_spells(base / "ability-evidence.json", base / "chronicle-observed-spells.json")
        self.assertIn("paladin:holy-strike", known[10333])
        without = chronicle.load_known_spells(base / "ability-evidence.json")
        self.assertNotIn(10333, without)

    def test_known_spells_load_from_evidence_file(self):
        known = chronicle.load_known_spells(ROOT / "docs/sim/data/rotations/ability-evidence.json")
        self.assertIn("warrior:bloodthirst", known[12331])

    def test_rejects_truncated_or_mismatched_stream_and_unlisted_report(self):
        with self.assertRaises(ValueError):
            chronicle.summarise(INSTANCE, frame(cast(10333, b"a"))[:-1])
        with self.assertRaisesRegex(ValueError, "outside the report"):
            chronicle.summarise(INSTANCE, frame(cast(10333, b"a"), encounter=b"other"))
        with self.assertRaisesRegex(ValueError, "public OctoWoW"):
            chronicle.summarise(dict(INSTANCE, unlisted=True), frame())
