"""Overlay build script. The safety test needs nothing; the build test needs the client Data folder (set OCTO_DATA_DIR) and is otherwise skipped."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import build_overlay  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')
REPO = build_overlay.REPO


class Version(unittest.TestCase):
    FILES = {'m2/1.m2': {'sha256': 'aa', 'bytes': 1}, 'skin/2.skin': {'sha256': 'bb', 'bytes': 1}}

    def test_version_changes_exactly_when_a_file_changes(self):
        base = build_overlay.compute_version(self.FILES)
        self.assertRegex(base, r'^[0-9a-f]{16}$')
        self.assertEqual(base, build_overlay.compute_version(dict(reversed(list(self.FILES.items())))), 'order does not matter')
        self.assertEqual(base, build_overlay.compute_version({**self.FILES, 'version.json': {'sha256': 'zz', 'bytes': 1}}), 'version.json is not part of its own version')
        self.assertNotEqual(base, build_overlay.compute_version({**self.FILES, 'skin/2.skin': {'sha256': 'cc', 'bytes': 1}}))
        self.assertNotEqual(base, build_overlay.compute_version({**self.FILES, 'extra.json': {'sha256': 'dd', 'bytes': 1}}))


class OutputFolderRule(unittest.TestCase):
    def test_refuses_folders_inside_the_repository(self):
        for path in (os.path.join(REPO, 'docs', 'models'), REPO, os.path.join(REPO, 'tools', 'models')):
            with self.assertRaises(build_overlay.UnsafeOutput):
                build_overlay.check_output_folder(path)

    def test_a_folder_on_another_drive_is_outside_not_an_error(self):
        # os.path.commonpath raises ValueError for paths on different Windows drives; that must read as "not inside the repository".
        real = os.path.commonpath
        os.path.commonpath = lambda paths: (_ for _ in ()).throw(ValueError("Paths don't have the same drive"))
        try:
            self.assertFalse(build_overlay.is_within('D:/octo-overlay', REPO))
            build_overlay.check_output_folder('D:/octo-overlay')
        finally:
            os.path.commonpath = real

    def test_allows_the_ignored_out_folder_and_outside_folders(self):
        build_overlay.check_output_folder(os.path.join(REPO, 'tools', 'models', 'out', 'overlay'))
        build_overlay.check_output_folder(tempfile.gettempdir())


@unittest.skipUnless(DATA and os.path.isdir(DATA), 'set OCTO_DATA_DIR to the client Data folder')
class Build(unittest.TestCase):
    def test_one_body_and_a_few_helms(self):
        with tempfile.TemporaryDirectory() as out:
            manifest = build_overlay.build(DATA, out, only={(9, 0)}, helm_limit=5, log=lambda *a: None)
            self.assertEqual(list(manifest['bodies']), ['9:0'])
            self.assertEqual(manifest['verification']['9:0']['failed'], [])
            for rel in ('meta/character/17.json', 'meta/charactercustomization/17.json', 'helms.json', 'manifest.json'):
                self.assertTrue(os.path.exists(os.path.join(out, rel)), rel)
            with open(os.path.join(out, 'meta/character/17.json')) as handle:
                record = json.load(handle)
            self.assertEqual((record['Character']['Race'], record['Character']['Gender'], record['Character']['ChrModelId']), (9, 0, 17))
            body = manifest['bodies']['9:0']
            self.assertEqual(body['character_id'], 17)
            self.assertTrue(all(body[k] >= 9000000 for k in ('model_file_id', 'skin_file_id', 'skel_file_id')))

    def test_build_writes_a_version_that_matches_its_files(self):
        with tempfile.TemporaryDirectory() as out:
            manifest = build_overlay.build(DATA, out, only={(10, 0)}, with_helms=False, log=lambda *x: None)
            with open(os.path.join(out, 'version.json')) as handle:
                written = json.load(handle)
            self.assertEqual(written['version'], manifest['version'])
            self.assertEqual(written['version'], build_overlay.compute_version(manifest['files']))
            self.assertIn('version.json', manifest['files'])

    def test_ids_are_stable_between_runs(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            first = build_overlay.build(DATA, a, only={(10, 1)}, with_helms=False, log=lambda *x: None)
            second = build_overlay.build(DATA, b, only={(10, 1)}, with_helms=False, log=lambda *x: None)
            self.assertEqual({k: v['sha256'] for k, v in first['files'].items()}, {k: v['sha256'] for k, v in second['files'].items()})


if __name__ == '__main__':
    unittest.main()
