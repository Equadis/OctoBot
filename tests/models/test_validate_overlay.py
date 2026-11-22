"""validate_overlay.py on a tiny synthetic overlay: references must resolve, the skin catalogue must agree with its choices files."""
import io
import json
import os
import struct
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


def tiny_model(blend, ops, shader):
    """A chunked M2 with one material of the given blend mode, and a skin with one batch using it."""
    header = bytearray(0x130)
    struct.pack_into('<4sI', header, 0, b'MD20', 274)
    struct.pack_into('<II', header, 0x70, 1, 0x130)           # materials: one (flags, blend)
    md = bytes(header) + struct.pack('<HH', 0, blend)
    m2 = b'MD21' + struct.pack('<I', len(md)) + md
    skin = bytearray(64)
    struct.pack_into('<II', skin, 0x24, 1, 64)
    skin += struct.pack('<BbHHHHHHHHHHH', 16, 0, shader, 0, 0, 65535, 0, 0, ops, 0, 0, 0, 0)
    return m2, bytes(skin)


class BlendedBatches(unittest.TestCase):
    def test_a_blended_single_texture_batch_needs_a_shader(self):
        self.assertEqual(validate_overlay.blended_batches_without_shader(*tiny_model(4, 1, 0)), [(0, 4)])
        self.assertEqual(validate_overlay.blended_batches_without_shader(*tiny_model(2, 1, 0)), [(0, 2)])

    def test_the_cases_that_are_fine(self):
        for blend, ops, shader in ((4, 1, 16), (0, 1, 0), (1, 1, 0), (4, 2, 0)):
            self.assertEqual(validate_overlay.blended_batches_without_shader(*tiny_model(blend, ops, shader)), [], (blend, ops, shader))


if __name__ == '__main__':
    unittest.main()
