"""Helm conversion. Needs the client Data folder: set OCTO_DATA_DIR (for example D:/Octowow/Data), else the tests are skipped."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import helms  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class FromClient(unittest.TestCase):
    def test_display_id_maps_to_model_and_converts_for_all_four_bodies(self):
        import octo_mpq
        converter = helms.HelmConverter(octo_mpq.Client(DATA))
        self.assertEqual(converter.info.model(31260), 'Helm_Plate_RaidWarrior_A_01')
        found, files = converter.convert(31260)
        self.assertEqual(sorted(found), ['10:0', '10:1', '9:0', '9:1'])
        self.assertEqual(len(set(found.values())), 4)
        self.assertEqual(len(files), 12)          # model, skin and skel for each body

    def test_unknown_display_id_gives_nothing(self):
        import octo_mpq
        self.assertEqual(helms.HelmConverter(octo_mpq.Client(DATA)).convert(99999999), ({}, {}))


if __name__ == '__main__':
    unittest.main()
