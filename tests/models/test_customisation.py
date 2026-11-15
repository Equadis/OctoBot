"""Customisation builder. Needs the client Data folder: set OCTO_DATA_DIR (for example D:/Octowow/Data), else the tests are skipped."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import customisation  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class FromClientTables(unittest.TestCase):
    def build(self, race, sex):
        import octo_mpq
        builder = customisation.Builder(octo_mpq.Client(DATA))
        return builder, builder.build(race, sex)

    def test_goblin_male_options_and_ids(self):
        builder, data = self.build(9, 0)
        names = [o['Name'] for o in data['Options']]
        self.assertEqual(names, ['Skin Color', 'Face', 'Hair Style', 'Hair Color', 'Features'])
        ids = [e['Id'] for o in data['Options'] for c in o['Choices'] for e in c['Elements']]
        self.assertEqual(len(ids), len(set(ids)))
        for key in ('Materials', 'TextureLayers', 'TextureSections'):
            self.assertTrue(data[key])
        for files in data['TextureFiles'].values():
            self.assertGreaterEqual(files[0]['FileDataId'], customisation.FIRST_TEXTURE_ID)

    def test_every_material_has_texture_files(self):
        builder, data = self.build(10, 1)
        for o in data['Options']:
            for c in o['Choices']:
                for e in c['Elements']:
                    if e['Material']:
                        self.assertIn(str(e['Material']['MaterialResourcesID']), data['TextureFiles'])


    def test_option_names_follow_the_body(self):
        import octo_mpq
        client = octo_mpq.Client(DATA)
        names = {(r, g): [o['Name'] for o in customisation.Builder(client).build(r, g)['Options']][-1] for r, g in ((9, 0), (9, 1), (10, 0), (10, 1))}
        self.assertEqual(names, {(9, 0): 'Features', (9, 1): 'Features', (10, 0): 'Facial Hair', (10, 1): 'Earrings'})

    def test_npc_only_skins_and_missing_textures_are_left_out(self):
        import octo_mpq
        client = octo_mpq.Client(DATA)
        builder = customisation.Builder(client)
        data = builder.build(10, 0)
        self.assertEqual(len(data['Options'][0]['Choices']), 11)
        self.assertEqual(len(builder.missing), 5)
        for path in builder.missing:
            self.assertFalse(client.has(path))

    def test_blood_elf_skins_switch_the_eye_glow_geoset_on(self):
        _, data = self.build(10, 1)
        for choice in data['Options'][0]['Choices']:
            self.assertTrue(any(e['Geoset'] == {'GeosetType': 17, 'GeosetID': 2, 'Modifier': -1} for e in choice['Elements']))


if __name__ == '__main__':
    unittest.main()
