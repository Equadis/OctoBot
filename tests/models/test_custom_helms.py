"""Custom helm records. The first group needs no game files (fake client); the second reads the real client when OCTO_DATA_DIR is set."""
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import custom_helms  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')
HEAD = 'Item/ObjectComponents/Head/'


class FakeInfo:
    rows = {500: (500, 1, 0, 2, 0)}

    def model(self, display_id):
        return 'Helm_Test_A_01' if display_id == 500 else None

    def string(self, offset):
        return 'Helm_Test_A_01Red' if offset == 2 else ''

    def hide_groups(self, display_id, race, gender):
        return [0, 3] if (race, gender) == (1, 0) else []


class FakeClient:
    def __init__(self, files):
        self.files = {k.lower(): v for k, v in files.items()}      # MPQ lookups ignore case

    def read(self, path):
        return self.files.get(path.replace('\\', '/').lower())


def fake_convert(data, first, texture_id_for=None):
    texture = texture_id_for('SPELLS\\GLOW.BLP') if texture_id_for else first + 10
    return ({f'm2/{first}.m2': b'm', f'skin/{first + 1}.skin': b's', f'skel/{first + 2}.skel': b'k'},
            {'model': first, 'skin': first + 1, 'skel': first + 2, 'textures': {'SPELLS\\GLOW.BLP': texture}})


REAL = custom_helms.CustomHelms     # kept here because one test replaces the module's name for it


def make(files):
    helper = REAL.__new__(REAL)
    helper.client, helper.info = FakeClient(files), FakeInfo()
    helper.next_model, helper.next_texture = custom_helms.FIRST_MODEL_ID, custom_helms.FIRST_TEXTURE_ID
    helper.textures, helper.missing_textures, helper.failed, helper.skipped = {}, [], {}, {}
    return helper


class WithoutGameFiles(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.object(custom_helms.m2v274, 'convert', fake_convert)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_record_has_zams_shape_with_only_the_races_the_client_has(self):
        h = make({HEAD + 'Helm_Test_A_01_HuM.m2': b'x', HEAD + 'Helm_Test_A_01_BeF.m2': b'x', HEAD + 'Helm_Test_A_01Red.blp': b'x'})
        record, files = h.build(500)
        entries = record['ModelFiles']['500']
        self.assertEqual([(e['Race'], e['Gender']) for e in entries], [(1, 0), (10, 1)])
        self.assertEqual(record['ComponentModels'], {'0': 500})
        self.assertEqual(record['Item']['InventoryType'], 1)
        self.assertEqual(sorted(files), ['m2/9700000.m2', 'm2/9700010.m2', 'skel/9700002.skel', 'skel/9700012.skel', 'skin/9700001.skin', 'skin/9700011.skin'])
        self.assertEqual([e['FileDataId'] for e in entries], [9700000, 9700010], 'ids follow sorted race order, so reruns match')

    def test_hide_rules_come_from_the_client_and_only_for_races_that_have_a_model(self):
        h = make({HEAD + 'Helm_Test_A_01_HuM.m2': b'x', HEAD + 'Helm_Test_A_01_HuF.m2': b'x'})
        record, _ = h.build(500)
        self.assertEqual(record['Item']['HideGeosetMale'], [{'RaceId': 1, 'GeosetGroup': 0, 'RaceBitSelection': 0}, {'RaceId': 1, 'GeosetGroup': 3, 'RaceBitSelection': 0}])
        self.assertIsNone(record['Item']['HideGeosetFemale'])

    def test_item_texture_is_object_skin_and_shared_model_textures_use_one_id(self):
        h = make({HEAD + 'Helm_Test_A_01_HuM.m2': b'x', HEAD + 'Helm_Test_A_01_OrM.m2': b'x', HEAD + 'Helm_Test_A_01Red.blp': b'x'})
        record, _ = h.build(500)
        self.assertEqual(sorted(h.textures.values()), [9900000, 9900001], 'the glow texture is shared by both races, not duplicated')
        self.assertEqual(record['Textures'], {'2': h.textures[(HEAD + 'Helm_Test_A_01Red.blp').upper().replace('/', '\\')]})

    def test_nothing_is_invented_when_the_client_lacks_the_data(self):
        h = make({})
        self.assertIsNone(h.build(500))
        self.assertIn('no Helm_Test_A_01', h.skipped[500])
        self.assertIsNone(h.build(999))
        self.assertIn('no model name', h.skipped[999])
        h2 = make({HEAD + 'Helm_Test_A_01_HuM.m2': b'x'})                 # model present, texture file absent
        record, _ = h2.build(500)
        self.assertIsNone(record['Textures'])
        self.assertEqual(h2.missing_textures, [HEAD + 'Helm_Test_A_01Red.blp'])

    def test_unreadable_models_are_reported_not_fatal(self):
        def broken(data, first, texture_id_for=None):
            raise ValueError('no geometry')
        with mock.patch.object(custom_helms.m2v274, 'convert', broken):
            h = make({HEAD + 'Helm_Test_A_01_HuM.m2': b'x'})
            self.assertIsNone(h.build(500))
        self.assertIn(HEAD + 'Helm_Test_A_01_HuM.m2', h.failed)

    def test_id_ranges_stay_clear_of_the_other_overlay_ranges(self):
        self.assertGreater(custom_helms.FIRST_MODEL_ID, 9500000 + 20 * 1000)
        self.assertGreater(custom_helms.FIRST_TEXTURE_ID, custom_helms.FIRST_MODEL_ID + 10 * 20 * 400)

    def test_build_all_writes_records_and_textures_through_one_callback(self):
        written = {}
        files = {HEAD + 'Helm_Test_A_01_HuM.m2': b'x', HEAD + 'Helm_Test_A_01Red.blp': b'x'}
        with mock.patch.object(custom_helms, 'CustomHelms', lambda client: make(files)), \
                mock.patch.object(custom_helms.blp, 'blp_to_webp', lambda data: (b'webp', None)):
            summary = custom_helms.build_all(None, [500, 500, 999], lambda rel, blob: written.__setitem__(rel, blob), log=lambda *_: None)
        self.assertIn('meta/armor/1/500.json', written)
        self.assertTrue(any(k.startswith('textures/') for k in written))
        self.assertEqual(list(summary['display_ids']), ['500'])
        self.assertIn('999', summary['skipped'])


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class FromClient(unittest.TestCase):
    def test_crown_of_ten_storms_outland_red_converts_for_every_race(self):
        import octo_mpq
        h = custom_helms.CustomHelms(octo_mpq.Client(DATA))
        self.assertEqual(h.info.model(67102), 'Helm_Mail_RaidShaman_B_01OutlandRed')
        record, files = h.build(67102)
        races = {(e['Race'], e['Gender']) for e in record['ModelFiles']['67102']}
        self.assertEqual(races, {(r, s) for r in range(1, 11) for s in (0, 1)})
        self.assertEqual(list(record['Textures']), ['2'])
        self.assertEqual(h.missing_textures, [])
        webp = h.texture_files()
        self.assertEqual(len(webp), 3)                     # the red helm texture and the two glow layers
        self.assertTrue(all(blob[:4] == b'RIFF' for blob in webp.values()))
        json.dumps(record)


if __name__ == '__main__':
    unittest.main()
