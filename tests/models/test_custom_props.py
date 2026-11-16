"""Shoulder and weapon records. The first group needs no game files; the second compares the real client with records Zam already has."""
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import custom_props  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')
OBJ = 'Item/ObjectComponents/'


class FakeInfo:
    NAMES = {1: 'LShoulder_A.mdx', 2: 'RShoulder_A.mdx', 3: 'Shoulder_A_Blue', 4: 'Sword_A.mdx', 5: 'Sword_A_Red'}

    def __init__(self, rows):
        self.rows = rows

    def string(self, offset):
        return self.NAMES.get(offset, '')


class FakeClient:
    def __init__(self, files):
        self.files = {f.lower(): b'x' for f in files}

    def has(self, path):
        return path.lower() in self.files

    def read(self, path):
        return self.files.get(path.replace('\\', '/').lower())


def fake_convert(data, first, texture_id_for=None):
    glow = texture_id_for('SPELLS\\GLOW.BLP') if texture_id_for else first + 10
    return ({f'm2/{first}.m2': b'm', f'skin/{first + 1}.skin': b's', f'skel/{first + 2}.skel': b'k'},
            {'model': first, 'skin': first + 1, 'skel': first + 2, 'textures': {'SPELLS\\GLOW.BLP': glow}})


REAL = custom_props.PropBuilder


def make(files, rows):
    b = REAL.__new__(REAL)
    b.client, b.info = FakeClient(files), FakeInfo(rows)
    b.next_model, b.next_texture = custom_props.FIRST_MODEL_ID, custom_props.FIRST_TEXTURE_ID
    b.textures, b.failed, b.missing_textures, b.skipped = {}, {}, [], {}
    return b


def row(c1=0, c2=0, c3=0):
    values = [0] * 23
    values[1], values[2], values[3] = c1, c2, c3
    return tuple(values)


class WithoutGameFiles(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.object(custom_props.m2v274, 'convert', fake_convert)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_shoulders_get_a_left_and_right_model_and_one_shared_texture(self):
        b = make([OBJ + 'Shoulder/LShoulder_A.m2', OBJ + 'Shoulder/RShoulder_A.m2', OBJ + 'Shoulder/Shoulder_A_Blue.blp'], {10: row(1, 2, 3)})
        record, files = b.shoulder(10, 4)
        entries = record['ModelFiles']['10']
        self.assertEqual([e['ExtraData'] for e in entries], [0, 1])
        self.assertEqual(len({e['FileDataId'] for e in entries}), 2)
        self.assertEqual(record['ComponentModels'], {'0': 10, '1': 10})
        self.assertEqual(list(record['Textures']), ['2'])
        self.assertEqual(record['Item']['InventoryType'], 3)
        self.assertEqual(len(files), 6)

    def test_a_shoulder_with_one_side_missing_has_no_record(self):
        b = make([OBJ + 'Shoulder/LShoulder_A.m2'], {10: row(1, 2, 3)})
        self.assertIsNone(b.shoulder(10))
        self.assertIn('side 1', b.skipped[10])

    def test_weapons_try_the_weapon_folder_then_the_shield_folder(self):
        b = make([OBJ + 'Weapon/Sword_A.m2', OBJ + 'Weapon/Sword_A_Red.blp'], {20: row(4, 0, 5)})
        record, _ = b.prop(20, 21, 2, 7)
        self.assertEqual([e['ExtraData'] for e in record['ModelFiles']['20']], [-1])
        self.assertEqual(record['Item']['ItemSubClass'], 7)
        s = make([OBJ + 'Shield/Sword_A.m2'], {20: row(4, 0, 0)})
        record, _ = s.prop(20, 14, 4, 6)
        self.assertIsNone(record['Textures'], 'no texture named, none invented')

    def test_nothing_is_invented_when_the_client_lacks_the_data(self):
        b = make([], {20: row(4, 0, 5)})
        self.assertIsNone(b.prop(20, 21))
        self.assertIn('no usable model', b.skipped[20])
        self.assertIsNone(b.prop(99, 21))
        self.assertIsNone(make([], {20: row(0, 0, 0)}).prop(20, 21))
        named = make([OBJ + 'Weapon/Sword_A.m2'], {20: row(4, 0, 5)})
        record, _ = named.prop(20, 21)
        self.assertIsNone(record['Textures'])
        self.assertEqual(named.missing_textures, ['Sword_A_Red'])

    def test_unreadable_models_are_reported_not_fatal(self):
        def broken(data, first, texture_id_for=None):
            raise ValueError('no geometry')
        with mock.patch.object(custom_props.m2v274, 'convert', broken):
            b = make([OBJ + 'Weapon/Sword_A.m2'], {20: row(4, 0, 0)})
            self.assertIsNone(b.prop(20, 21))
        self.assertIn(OBJ + 'Weapon/Sword_A.m2', b.failed)

    def test_missing_list_is_filtered_to_shoulders_and_item_records(self):
        catalogue = [{'id': 1, 'slot': 3, 'subclass': 4}, {'id': 2, 'slot': 13, 'classs': 2, 'subclass': 7}, {'id': 3, 'slot': 5, 'subclass': 1}]
        missing = {'armor:3:900': [1], 'item:0:901': [2], 'armor:5:902': [3]}
        self.assertEqual(sorted(custom_props.wanted_from_missing(missing, catalogue)), [('prop', 901, 13, 2, 7), ('shoulder', 900, 3, 4, 4)])

    def test_id_ranges_clear_of_helms_and_body_armour_textures(self):
        self.assertGreaterEqual(custom_props.FIRST_MODEL_ID, 10100000 + 100000)
        self.assertGreaterEqual(custom_props.FIRST_TEXTURE_ID, custom_props.FIRST_MODEL_ID + 100000)

    def test_build_all_routes_records_to_the_viewers_paths(self):
        written = {}
        files = [OBJ + 'Shoulder/LShoulder_A.m2', OBJ + 'Shoulder/RShoulder_A.m2', OBJ + 'Weapon/Sword_A.m2']
        b = make(files, {10: row(1, 2, 0), 20: row(4, 0, 0)})
        with mock.patch.object(custom_props, 'PropBuilder', lambda client: b), mock.patch.object(custom_props.blp, 'blp_to_webp', lambda data: (b'w', None)):
            summary = custom_props.build_all(None, [('shoulder', 10, 3, 4, 0), ('prop', 20, 21, 2, 7)], lambda rel, blob: written.__setitem__(rel, blob), log=lambda *_: None)
        self.assertIn('meta/armor/3/10.json', written)
        self.assertIn('meta/item/20.json', written)
        self.assertEqual(sorted(summary['records']), ['meta/armor/3/10.json', 'meta/item/20.json'])


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class AgainstZamsRecords(unittest.TestCase):
    def test_shapes_match_records_zam_already_has(self):
        import octo_mpq
        b = custom_props.PropBuilder(octo_mpq.Client(DATA))
        record, _ = b.shoulder(31024, 4)                       # Pauldrons of Might
        self.assertEqual([e['ExtraData'] for e in record['ModelFiles']['31024']], [0, 1])
        self.assertEqual(sorted(record['ComponentModels']), ['0', '1'])
        self.assertEqual(list(record['Textures']), ['2'])
        for display, inventory, klass, sub in ((30606, 21, 2, 8), (20552, 26, 2, 2)):    # Thunderfury, a bow
            record, _ = b.prop(display, inventory, klass, sub)
            self.assertEqual([e['ExtraData'] for e in record['ModelFiles'][str(display)]], [-1])
            self.assertEqual(list(record['Textures']), ['2'])
        self.assertEqual(b.failed, {})
        self.assertEqual(b.missing_textures, [])
        json.dumps(record)


if __name__ == '__main__':
    unittest.main()
