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
        self.assertEqual(names, ['Skin Color', 'Face', 'Hair Style', 'Hair Color'])
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


if __name__ == '__main__':
    unittest.main()
