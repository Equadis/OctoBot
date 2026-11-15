"""BLP to WebP converter. The real-file test needs a client Data folder: set OCTO_DATA_DIR (for example D:/Octowow/Data), else it is skipped."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import blp  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')


class Rejects(unittest.TestCase):
    def test_not_a_blp(self):
        with self.assertRaises(ValueError):
            blp.blp_to_webp(b'RIFF0000WEBP')


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class RealFiles(unittest.TestCase):
    def test_goblin_skin_decodes(self):
        import octo_mpq
        data = octo_mpq.Client(DATA).read('Character\\Goblin\\Male\\GoblinMaleSkin00_100.blp')
        webp, w, h, alpha = blp.blp_to_webp(data)
        self.assertEqual((w, h), (512, 512))
        self.assertEqual(webp[:4], b'RIFF')


if __name__ == '__main__':
    unittest.main()
