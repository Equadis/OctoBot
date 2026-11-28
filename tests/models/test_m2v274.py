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


class TrackTimes(unittest.TestCase):
    def test_a_key_before_its_sequence_starts_is_clamped_not_rejected(self):
        blob = m2v274.Blob(0)
        track = {'values': [1, 2], 'times': [90, 150], 'global_sequence': -1, 'interpolation': 0, 'ranges': [(0, 1)]}
        record = m2v274.write_track(blob, track, [{'start': 100}], 'int16')   # first key is 10 ticks before the sequence
        self.assertEqual(len(record), 20)
        self.assertIn(b'\x00\x00\x00\x00\x32\x00\x00\x00', bytes(blob.buf), 'times 0 and 50')


DATA = os.environ.get('OCTO_DATA_DIR')


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class BlendedBatchesGetAShader(unittest.TestCase):
    def test_the_lanterns_glow_batches_are_blended_and_get_shader_16(self):
        import struct
        import octo_mpq
        data = octo_mpq.Client(DATA).read('Item\ObjectComponents\Weapon\Misc_1H_Lantern_B_01.m2')
        files, _ = m2v274.convert(data, 9841300)
        skin = files['skin/9841301.skin']
        count, offset = struct.unpack_from('<II', skin, 0x24)
        shaders = [struct.unpack_from('<BbHHHHHHHHHHH', skin, offset + 24 * k)[2] for k in range(count)]
        self.assertEqual(sorted(shaders), [0, 0, 16, 16])   # two opaque or alpha-key batches, two additive ones


if __name__ == '__main__':
    unittest.main()
