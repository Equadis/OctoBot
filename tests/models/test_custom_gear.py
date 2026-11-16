"""Texture-slot gear records. The first group needs no game files (fake client); the second checks the real client against records Zam already has."""
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import custom_gear  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')
TEX = 'Item/TextureComponents/'


class FakeInfo:
    def __init__(self, rows):
        self.rows = rows

    def string(self, offset):
        return {1: 'Plate_A', 2: 'Cloth_B', 3: 'Single'}.get(offset, '')


class FakeClient:
    def __init__(self, files):
        self.files = {f.lower(): b'x' for f in files}

    def has(self, path):
        return path.lower() in self.files

    def read(self, path):
        return self.files.get(path.replace('\\', '/').lower())


REAL = custom_gear.TextureSlots


def make(files, rows):
    builder = REAL.__new__(REAL)
    builder.client, builder.info = FakeClient(files), FakeInfo(rows)
    builder.next_texture, builder.textures, builder.missing, builder.skipped = custom_gear.FIRST_TEXTURE_ID, {}, [], {}
    return builder


def row(**columns):
    values = [0] * 23
    values[0] = columns.pop('id', 100)
    for name, value in columns.items():
        values[int(name[1:])] = value          # c14=1 -> column 14
    return tuple(values)


class WithoutGameFiles(unittest.TestCase):
    def test_unisex_file_wins_and_regions_follow_the_display_columns(self):
        b = make([TEX + 'ArmUpperTexture/Plate_A_U.blp', TEX + 'TorsoUpperTexture/Plate_A_M.blp', TEX + 'TorsoUpperTexture/Plate_A_F.blp'],
                 {100: row(c14=1, c17=1)})
        record = b.build(100, 5, 4)
        self.assertEqual(sorted(record['ComponentTextures']), ['0', '3'])
        arm = record['TextureFiles'][str(record['ComponentTextures']['0'])]
        torso = record['TextureFiles'][str(record['ComponentTextures']['3'])]
        self.assertEqual([e['Gender'] for e in arm], [custom_gear.UNISEX])
        self.assertEqual([e['Gender'] for e in torso], [custom_gear.MALE, custom_gear.FEMALE])
        self.assertEqual(record['Item']['InventoryType'], 5)
        self.assertEqual(record['Item']['ItemSubClass'], 4)

    def test_one_sex_only_is_worn_by_both_and_missing_files_are_reported_not_invented(self):
        b = make([TEX + 'HandTexture/Single_F.blp'], {100: row(c16=3, c14=1)})
        record = b.build(100, 10)
        self.assertEqual([e['Gender'] for e in record['TextureFiles'][str(record['ComponentTextures']['2'])]], [custom_gear.UNISEX])
        self.assertEqual(b.missing, ['ArmUpperTexture/Plate_A'], 'the named upper-arm texture is not in the client')
        self.assertNotIn('0', record['ComponentTextures'])

    def test_a_display_with_no_usable_texture_has_no_record(self):
        b = make([], {100: row(c14=1)})
        self.assertIsNone(b.build(100, 5))
        self.assertIn('none of the textures', b.skipped[100])
        self.assertIsNone(b.build(999, 5))
        self.assertIn('not in ItemDisplayInfo', b.skipped[999])

    def test_geoset_values_are_the_clients_and_texture_ids_are_shared(self):
        files = [TEX + 'LegUpperTexture/Plate_A_U.blp']
        b = make(files, {100: row(c19=1, c8=1), 101: row(c19=1)})
        first, second = b.build(100, 7), b.build(101, 7)
        self.assertEqual(first['Item']['GeosetGroup'], [0, 0, 1, 0, 0, 0], 'column 8 is Zam\'s third value (seen on two leg displays)')
        self.assertEqual(sorted(b.textures.values()), [custom_gear.FIRST_TEXTURE_ID], 'two displays, one converted file')
        self.assertEqual(first['ComponentTextures'], second['ComponentTextures'])

    def test_build_all_writes_records_by_viewer_slot_and_textures_once(self):
        written = {}
        b = make([TEX + 'FootTexture/Plate_A_U.blp'], {100: row(c21=1)})
        with mock.patch.object(custom_gear, 'TextureSlots', lambda client: b), mock.patch.object(custom_gear.blp, 'blp_to_webp', lambda data: (b'webp', None)):
            summary = custom_gear.build_all(None, [(8, 100, 8, 0), (8, 100, 8, 0), (8, 555, 8, 0)], lambda rel, blob: written.__setitem__(rel, blob), log=lambda *_: None)
        self.assertEqual(sorted(written), ['meta/armor/8/100.json', f'textures/{custom_gear.FIRST_TEXTURE_ID}.webp'])
        self.assertEqual(summary['records'], {'8:100': 1})
        self.assertIn('555', summary['skipped'])

    def test_missing_list_is_filtered_to_texture_slots_and_takes_type_from_the_catalogue(self):
        catalogue = [{'id': 1, 'slot': 20, 'subclass': 1}, {'id': 2, 'slot': 1, 'subclass': 4}, {'id': 3, 'slot': 13, 'subclass': 7}]
        missing = {'armor:5:900': [1], 'armor:1:901': [2], 'item:0:902': [3], 'armor:5:903': [999]}
        self.assertEqual(custom_gear.wanted_from_missing(missing, catalogue), [(5, 900, 20, 1)], 'robe keeps inventory type 20 in the record')


# What Zam's own records say for seven Classic items, one per slot (fetched 2026-11-16): the regions it lists and the sexes per region.
ZAM = {
    (5, 31021): {'0': [3], '3': [0, 1], '4': [0, 1]},
    (9, 31020): {'1': [3]},
    (10, 31022): {'1': [3], '2': [3]},
    (6, 31019): {'5': [3]},
    (7, 31023): {'5': [3], '6': [3]},
    (8, 31025): {'6': [3], '7': [3]},
    (4, 24352): {'3': [0, 1], '4': [0, 1]},
}


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class AgainstZamsRecords(unittest.TestCase):
    def test_regions_and_sexes_match_records_zam_already_has(self):
        import octo_mpq
        builder = custom_gear.TextureSlots(octo_mpq.Client(DATA))
        for (slot, display), expected in ZAM.items():
            record = builder.build(display, slot)
            self.assertIsNotNone(record, (slot, display))
            got = {region: sorted(e['Gender'] for e in record['TextureFiles'][str(key)]) for region, key in record['ComponentTextures'].items()}
            self.assertEqual(got, expected, (slot, display))
        self.assertEqual(builder.missing, [])
        json.dumps(record)


if __name__ == '__main__':
    unittest.main()
