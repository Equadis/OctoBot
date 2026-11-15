"""Checks the version 256 M2 reader against real client files.
The files are not in the repository. Point OCTO_M2_DIR at a folder holding extracted models (see tools/models/README.md);
without it these tests are skipped."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import m2v256  # noqa: E402

FOLDER = os.environ.get('OCTO_M2_DIR')
MODELS = {'Character__Goblin__Male__GoblinMale.m2': 'GoblinMale', 'Character__BloodElf__Male__BloodElfMale.m2': 'BloodElfMale'}


class RejectsOtherFormats(unittest.TestCase):
    def test_wrong_magic(self):
        with self.assertRaises(m2v256.M2Error):
            m2v256.M2(b'MD21' + bytes(300))

    def test_wrong_version(self):
        with self.assertRaises(m2v256.M2Error):
            m2v256.M2(b'MD20' + (264).to_bytes(4, 'little') + bytes(300))


@unittest.skipUnless(FOLDER, 'set OCTO_M2_DIR to run against extracted client models')
class AgainstClientFiles(unittest.TestCase):
    def test_every_consistency_rule_passes(self):
        for file, name in MODELS.items():
            path = os.path.join(FOLDER, file)
            if not os.path.exists(path):
                continue
            model = m2v256.M2(open(path, 'rb').read())
            ok, bad = model.check()
            self.assertEqual(bad, [], file)
            self.assertTrue(model.name.endswith(name))
            view = model.view()
            self.assertEqual(len(view['triangles']) % 3, 0)
            self.assertEqual(sum(s['index_count'] for s in view['submeshes']), len(view['triangles']))


if __name__ == '__main__':
    unittest.main()
