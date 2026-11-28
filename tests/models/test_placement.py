"""Equipment placement tooling: the black-patch detector and the static attachment check."""
import os
import sys
import unittest

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import artifact_scan  # noqa: E402
import placement_check  # noqa: E402


def panel():
    return Image.new('RGB', (600, 600), (30, 50, 80))


class ArtifactScan(unittest.TestCase):
    def test_a_solid_black_square_is_found(self):
        image = panel()
        ImageDraw.Draw(image).rectangle((100, 200, 160, 280), fill=(0, 0, 0))
        found = artifact_scan.black_regions(image)
        self.assertEqual(len(found), 1)
        self.assertGreaterEqual(found[0][4], 4000)

    def test_a_clean_render_and_small_dark_detail_pass(self):
        image = panel()
        ImageDraw.Draw(image).rectangle((100, 200, 120, 215), fill=(0, 0, 0))      # a small dark detail
        ImageDraw.Draw(image).rectangle((300, 300, 380, 380), fill=(20, 22, 25))   # dark but textured armour, not pure black
        self.assertEqual(artifact_scan.black_regions(image), [])

    def test_a_black_patch_with_a_picture_in_it_is_still_one_region_per_connected_part(self):
        image = panel()
        draw = ImageDraw.Draw(image)
        draw.rectangle((100, 100, 200, 200), fill=(0, 0, 0))
        draw.ellipse((130, 130, 170, 170), fill=(230, 200, 60))                  # the lantern icon drawn inside the black square
        self.assertEqual(len(artifact_scan.black_regions(image)), 1)


def attachments(shield=(-0.07, 0.55, 1.04), right=(-0.06, -0.48, 0.90), left=(-0.06, 0.47, 0.90)):
    return {0: shield, 1: right, 2: left}


class PlacementCheck(unittest.TestCase):
    def test_a_well_formed_body_passes(self):
        result = placement_check.check_body(attachments(), 2.0)
        self.assertEqual(result['problems'], [])
        self.assertAlmostEqual(result['shield_gap_over_arm_offset'], 0.33, places=1)

    def test_missing_points_are_reported(self):
        self.assertEqual(placement_check.check_body({0: (0, 0.5, 1)}, 2.0)['problems'], ['no right hand attachment', 'no left hand attachment'])

    def test_hands_on_the_wrong_sides_are_reported(self):
        problems = placement_check.check_body(attachments(shield=(-0.07, -0.55, 1.04), right=(0, 0.48, 0.9), left=(0, -0.47, 0.9)), 2.0)['problems']
        self.assertTrue(any('wrong sides' in p for p in problems))
        self.assertTrue(any('shield point is not on the left' in p for p in problems))

    def test_lopsided_hands_are_reported(self):
        problems = placement_check.check_body(attachments(left=(-0.06, 0.2, 0.9)), 2.0)['problems']
        self.assertTrue(any('apart in width' in p for p in problems))


if __name__ == '__main__':
    unittest.main()
