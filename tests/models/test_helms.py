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

    def test_hide_rules_come_from_the_client_table(self):
        import octo_mpq
        converter = helms.HelmConverter(octo_mpq.Client(DATA))
        # Helm_Plate_RaidWarrior_A_01 and the Defias hood: the Goblin helm hides only the moustache piece (group 3), never the head (group 1)
        for display_id in (31260, 15372):
            self.assertEqual(converter.hide(display_id), {'9:0': [3], '9:1': [3], '10:0': [1, 2, 3], '10:1': [1, 2, 3]})
        # A cloth helm that hides hair as well, with different rules per sex and race
        self.assertEqual(converter.hide(17573), {'9:0': [0, 3], '9:1': [0], '10:0': [0, 1, 2, 3, 7], '10:1': [0, 1, 2, 3, 7]})
        self.assertEqual(converter.hide(99999999), {'9:0': [], '9:1': [], '10:0': [], '10:1': []})

    def test_the_client_table_agrees_with_zams_for_most_original_race_helms(self):
        # The reading of HelmetGeosetVisData (bit 1 << race id, columns hair, facial 1, 2, 3, ears = groups 0, 1, 2, 3, 7) was checked against Zam's own
        # rows for the eight Classic races: 89 percent of 968 combinations agreed. Sample values from that check that must keep holding.
        import octo_mpq
        info = helms.DisplayInfo(octo_mpq.Client(DATA))
        self.assertEqual(info.hide_groups(15372, 1, 0), [1, 2, 3])     # Zam: human male hood hides groups 1, 2, 3
        self.assertEqual(info.hide_groups(15372, 7, 0), [1, 2, 3])     # gnome
        self.assertEqual(info.hide_groups(15372, 8, 0), [1, 2])        # troll
        self.assertEqual(info.hide_groups(17573, 1, 0), [0, 1, 2, 3, 7])

    def test_unknown_display_id_gives_nothing(self):
        import octo_mpq
        self.assertEqual(helms.HelmConverter(octo_mpq.Client(DATA)).convert(99999999), ({}, {}))


if __name__ == '__main__':
    unittest.main()
