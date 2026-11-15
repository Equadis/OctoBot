"""Checks the modern-format writer by converting real client files and reading the output back.
The files are not in the repository. Point OCTO_M2_DIR at a folder holding extracted models (see tools/models/README.md);
without it these tests are skipped."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import m2v274  # noqa: E402

FOLDER = os.environ.get('OCTO_M2_DIR')
MODELS = ['Character__Goblin__Male__GoblinMale.m2', 'Character__Goblin__Female__GoblinFemale.m2',
          'Character__BloodElf__Male__BloodElfMale.m2', 'Character__BloodElf__Female__BloodElfFemale.m2']


class Quaternions(unittest.TestCase):
    def test_compressed_form_round_trips(self):
        import struct
        for q in [(0, 0, 0, 1), (0.5, -0.5, 0.5, -0.5), (-0.1, 0.2, -0.3, 0.9273618495495703)]:
            out = struct.unpack('<4h', m2v274.encode_quat(q))
            back = [(v + 32768 if v < 0 else v - 32767) / 32767.0 for v in out]
            for a, b in zip(q, back):
                self.assertAlmostEqual(a, b, places=3)


@unittest.skipUnless(FOLDER and os.path.isdir(FOLDER), 'set OCTO_M2_DIR to a folder of extracted client models')
class RealModels(unittest.TestCase):
    def test_conversion_reads_back(self):
        for name in MODELS:
            path = os.path.join(FOLDER, name)
            if not os.path.exists(path):
                continue
            data = open(path, 'rb').read()
            files, ids = m2v274.convert(data)
            ok, bad = m2v274.verify(data, files)
            self.assertEqual(bad, [], name)
            self.assertEqual(len(files), 3)


if __name__ == '__main__':
    unittest.main()
