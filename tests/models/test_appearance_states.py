"""Why a pair has no complete preview (appearance_states.py), the stray-space fix in the display table, the overlay patch tool and id allocation."""
import hashlib
import json
import os
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import appearance_states as st  # noqa: E402
import item_overlay  # noqa: E402
import local_audit  # noqa: E402
import overlay_patch  # noqa: E402


class FakeAssets:
    """The three things appearance_states asks of local_audit.Assets: rows, string() and has()."""

    def __init__(self, rows, files=()):
        self.rows, self.files = rows, set(files)

    def string(self, value):
        return value

    def has(self, path):
        return path in self.files


def display(**fields):
    """A display row as a list of 23 values: 0 id, 1-2 models, 3-4 model textures, 14-21 body textures (strings; '' for none)."""
    row = [0] * 23
    for key, value in fields.items():
        row[int(key[1:])] = value
    for i in list(range(1, 6)) + list(range(14, 22)):
        row[i] = row[i] if isinstance(row[i], str) else ''
    return row


def pair(slot, display_id, name='Some Item'):
    return {'itemId': 1, 'name': name, 'viewerSlot': slot, 'displayId': display_id}


class Classify(unittest.TestCase):
    def test_display_id_zero_in_the_item_cache_is_a_placeholder_with_no_appearance(self):
        outcome = st.classify_unresolved(pair(1, None, 'Radiant Veil'), FakeAssets({}), cache_display=0)
        self.assertEqual(outcome[:2], ('Invisible', 'display-id-0'))
        self.assertEqual(st.classify_unresolved(pair(1, None), FakeAssets({}), cache_display=None)[:2], ('Unresolved', 'no-display-id'))

    def test_an_empty_display_row_is_invisible_and_named_by_what_the_item_is(self):
        assets = FakeAssets({7: display(), 8: display(), 9: display(), 10: display()})
        self.assertEqual(st.classify_unresolved(pair(3, 7, 'Hidden Mail Shoulders'), assets)[:2], ('Invisible', 'hidden-by-design'))
        self.assertEqual(st.classify_unresolved(pair(16, 7, "The Emperor's New Cape"), assets)[:2], ('Invisible', 'hidden-by-design'))
        self.assertEqual(st.classify_unresolved(pair(5, 8, 'Test Chest 2'), assets)[:2], ('Invisible', 'placeholder'))
        self.assertEqual(st.classify_unresolved(pair(21, 9, 'OLDCeremonial Club'), assets)[:2], ('Invisible', 'deprecated'))
        self.assertEqual(st.classify_unresolved(pair(19, 10, 'Tabard of the Ashbringer'), assets)[:2], ('Invisible', 'row-empty'))

    def test_the_clients_no_texture_placeholder_counts_as_nothing(self):
        assets = FakeAssets({5: display(f3='2_Null')})
        self.assertEqual(st.named_fields(assets, 5), {})

    def test_a_missing_row_is_missing_unless_the_item_is_a_test_placeholder(self):
        self.assertEqual(st.classify_unresolved(pair(21, 2042, 'Branch of the Great Tree'), FakeAssets({}))[:2], ('Missing', 'no-display-row'))
        self.assertEqual(st.classify_unresolved(pair(5, 68075, 'Test Chest 1'), FakeAssets({}))[:2], ('Invisible', 'placeholder'))

    def test_assets_the_client_does_not_hold_are_missing(self):
        assets = FakeAssets({1: display(f14='Mail_X_Sleeve_AU', f17='Mail_X_Chest_TU')})
        self.assertEqual(st.classify_unresolved(pair(5, 1, 'Black Night Elf Breastplate'), assets)[:2], ('Missing', 'files-missing'))

    def test_a_row_for_another_kind_of_slot_is_unresolved_metadata_not_invisible(self):
        boots = FakeAssets({2: display(f20='Cloth_B_Boot_LL', f21='Cloth_B_Boot_FO')})
        self.assertEqual(st.classify_unresolved(pair(10, 2, "Thief's Mitts"), boots)[:2], ('Unresolved', 'other-slot'))
        weapon_for_helm = FakeAssets({3: display(f1='Axe_1H_Flint_A_01.mdx')}, files=['Item/ObjectComponents/Weapon/Axe_1H_Flint_A_01.m2'])
        self.assertEqual(st.classify_unresolved(pair(1, 3, 'Crystalfall Cap'), weapon_for_helm)[:2], ('Unresolved', 'other-slot'))

    def test_a_weapon_model_for_a_weapon_is_not_other_slot(self):
        assets = FakeAssets({4: display(f1='Axe_1H_Flint_A_01.mdx')}, files=['Item/ObjectComponents/Weapon/Axe_1H_Flint_A_01.m2'])
        self.assertEqual(st.classify_unresolved(pair(21, 4, 'An Axe'), assets)[:2], ('Missing', 'files-missing'))


class Partial(unittest.TestCase):
    def row(self, slot, **extra):
        return {**pair(slot, 5), 'clientMissing': [], 'overlayNotes': [], **extra}

    def test_a_single_shoulder_model_is_the_whole_appearance(self):
        self.assertEqual(st.partial_state(self.row(3, overlayNotes=['no left model named']))[:2], ('Recovered', 'single-shoulder'))
        self.assertEqual(st.partial_state(self.row(3, overlayNotes=['no left model named', 'no right model named']))[:2], ('Incomplete', 'other'))

    def test_a_texture_missing_for_one_sex_is_incomplete_and_says_which(self):
        row = self.row(5, overlayNotes=['ArmUpperTexture X: no female texture in the client'], clientMissing=['ArmUpperTexture:X:female'])
        self.assertEqual(st.partial_state(row)[:2], ('Incomplete', 'sex-texture'))
        self.assertEqual(st.gaps_of(row)['sexes'], ['female'])
        both = self.row(5, overlayNotes=['A: no female texture in the client', 'A: no male texture in the client'])
        self.assertEqual(st.gaps_of(both)['sexes'], ['female', 'male'])

    def test_helms_for_some_races_and_missing_textures(self):
        self.assertEqual(st.partial_state(self.row(1, overlayNotes=['no helm model for race 1 gender 0']))[:2], ('Incomplete', 'helm-races'))
        self.assertEqual(st.partial_state(self.row(3, overlayNotes=['texture Shoulder_X not found']))[:2], ('Incomplete', 'texture-missing'))

    def test_a_version_257_model_is_complete_only_when_it_was_looked_at(self):
        note = 'Mace_2H_Blood_A_01: source is M2 version 257, read with the version 256 layout (plausibility-checked only)'
        checked = dict(self.row(21, overlayNotes=[note]), displayId=40046)
        unchecked = dict(self.row(21, overlayNotes=[note]), displayId=999999)
        self.assertEqual(st.partial_state(checked)[:2], ('Recovered', 'm2-v257-verified'))
        self.assertEqual(st.partial_state(unchecked)[:2], ('Incomplete', 'm2-v257-unchecked'))


class Table(unittest.TestCase):
    def test_only_pairs_with_a_state_are_listed_with_the_sexes_that_lack_something(self):
        rows = [{'itemId': 1, 'viewerSlot': 5, 'state': None},
                {'itemId': 2, 'viewerSlot': 5, 'state': 'incomplete', 'cause': 'sex-texture', 'stateWhy': 'no female texture', 'gapSexes': ['female']},
                {'itemId': 3, 'viewerSlot': 3, 'state': 'invisible', 'cause': 'hidden-by-design', 'stateWhy': 'hidden', 'gapSexes': []}]
        table = st.states_file(rows)
        self.assertEqual(sorted(table['items']), ['2:5', '3:3'])
        self.assertEqual(table['items']['2:5']['sexes'], ['female'])
        self.assertNotIn('sexes', table['items']['3:3'])


class DisplayTable(unittest.TestCase):
    def test_a_stray_space_in_a_name_is_dropped(self):
        blob = b'\0 Cosmetic_A_01_Sleeve_AU\0Axe_1H_Horde_A_02Blue \0'
        assets = local_audit.Assets.__new__(local_audit.Assets)
        assets._data, assets._base = blob, 0
        self.assertEqual(assets.string(1), 'Cosmetic_A_01_Sleeve_AU')
        self.assertEqual(assets.string(1 + len(' Cosmetic_A_01_Sleeve_AU') + 1), 'Axe_1H_Horde_A_02Blue')
        self.assertEqual(assets.string(0), '')


class Patch(unittest.TestCase):
    def test_ids_continue_after_an_existing_overlay(self):
        with tempfile.TemporaryDirectory() as folder:
            os.makedirs(os.path.join(folder, 'textures'))
            os.makedirs(os.path.join(folder, 'm2'))
            os.makedirs(os.path.join(folder, 'meta', 'armor', '5'))
            for name in ('9700000.webp', '9707065.webp', '9900100.webp'):       # the last is a skin texture and must not count
                open(os.path.join(folder, 'textures', name), 'wb').write(b'x')
            for name in ('9800000.m2', '9848740.m2', '9900001.m2'):
                open(os.path.join(folder, 'm2', name), 'wb').write(b'x')
            json.dump({'TextureFiles': {'9657538': []}, 'ModelFiles': {'9657539': []}}, open(os.path.join(folder, 'meta', 'armor', '5', '1.json'), 'w'))
            texture, key, model = item_overlay.used_ids(folder)
            self.assertEqual((texture, key, model), (9707066, 9657539, 9848760))
            self.assertEqual(item_overlay.used_ids(os.path.join(folder, 'nothing')), (9700000, 9650000, 9800000))

    def test_a_patch_replaces_adds_and_drops_and_the_base_is_untouched(self):
        with tempfile.TemporaryDirectory() as root:
            base, patch, out = (os.path.join(root, n) for n in ('base', 'patch', 'out'))
            for folder, files in ((base, {'a.json': b'old', 'b.json': b'same', 'gone.webp': b'orphan'}), (patch, {'a.json': b'new', 'c.json': b'added', '.remove.json': b'["gone.webp"]'})):
                for name, data in files.items():
                    os.makedirs(os.path.dirname(os.path.join(folder, name)), exist_ok=True)
                    open(os.path.join(folder, name), 'wb').write(data)
            self.assertEqual(overlay_patch.main([base, patch, out]), 0)
            self.assertEqual(open(os.path.join(out, 'a.json'), 'rb').read(), b'new')
            self.assertEqual(open(os.path.join(out, 'b.json'), 'rb').read(), b'same')
            self.assertTrue(os.path.exists(os.path.join(out, 'c.json')))
            self.assertFalse(os.path.exists(os.path.join(out, 'gone.webp')))
            self.assertFalse(os.path.exists(os.path.join(out, '.remove.json')))
            self.assertEqual(open(os.path.join(base, 'a.json'), 'rb').read(), b'old')
            manifest = json.load(open(os.path.join(out, 'manifest.json')))
            self.assertEqual(manifest['files']['a.json']['sha256'], hashlib.sha256(b'new').hexdigest())
            self.assertNotIn('gone.webp', manifest['files'])
            self.assertEqual(json.load(open(os.path.join(out, 'version.json')))['version'], manifest['version'])


if __name__ == '__main__':
    unittest.main()
