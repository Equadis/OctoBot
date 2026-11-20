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

    def test_rejects_truncated_or_mismatched_stream_and_unlisted_report(self):
        with self.assertRaises(ValueError):
            chronicle.summarise(INSTANCE, frame(cast(10333, b"a"))[:-1])
        with self.assertRaisesRegex(ValueError, "outside the report"):
            chronicle.summarise(INSTANCE, frame(cast(10333, b"a"), encounter=b"other"))
        with self.assertRaisesRegex(ValueError, "public OctoWoW"):
            chronicle.summarise(dict(INSTANCE, unlisted=True), frame())
