"""validate_overlay.py on a tiny synthetic overlay: references must resolve, the skin catalogue must agree with its choices files."""
import io
import json
import os
import sys
import tempfile
import unittest

from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import validate_overlay  # noqa: E402


def webp():
    out = io.BytesIO()
    Image.new('RGBA', (4, 4), (10, 20, 30, 255)).save(out, 'WEBP', lossless=True)
    return out.getvalue()


def build(folder, catalogue_choice=9950001, with_texture=True):
    def put(key, data):
        path = os.path.join(folder, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(data if isinstance(data, bytes) else json.dumps(data).encode())
    files = {}
    if with_texture:
        put('textures/9900001.webp', webp())
        put('textures/9900002.webp', webp())
    put('skins/choices/1.json', {'TextureFiles': {'9970001': [{'FileDataId': 9900001}]},
                                 'Choices': [{'Id': 9950001, 'Elements': [{'Material': {'MaterialResourcesID': 9970001}}]}]})
    put('skins/catalogue.json', {'skins': [{'id': 'skin-1', 'variants': [{'body': 1, 'gender': 0, 'choiceId': catalogue_choice, 'textureFileId': 9900001, 'texture': {}}],
                                           'thumbnails': {'-': 9900002}}]})
    for base, _, names in os.walk(folder):
        for n in names:
            p = os.path.join(base, n)
            files[os.path.relpath(p, folder).replace(os.sep, '/')] = {'bytes': os.path.getsize(p)}
    json.dump({'files': files}, open(os.path.join(folder, 'manifest.json'), 'w'))


class Validate(unittest.TestCase):
    def test_a_consistent_overlay_passes(self):
        with tempfile.TemporaryDirectory() as folder:
            build(folder)
            report = validate_overlay.validate(folder)
            self.assertEqual((report['missing'], report['unsound'], report['orphans']), ([], [], []))

    def test_a_catalogue_choice_missing_from_the_choices_file_is_reported(self):
        with tempfile.TemporaryDirectory() as folder:
            build(folder, catalogue_choice=9950999)
            self.assertTrue(any('9950999' in m for m in validate_overlay.validate(folder)['missing']))

    def test_missing_texture_files_are_reported(self):
        with tempfile.TemporaryDirectory() as folder:
            build(folder, with_texture=False)
            missing = validate_overlay.validate(folder)['missing']
            self.assertTrue(any('texture 9900001' in m for m in missing) and any('thumbnail' in m for m in missing), missing)


if __name__ == '__main__':
    unittest.main()
