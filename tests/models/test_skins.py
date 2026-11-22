"""Character skins: catalogue rules, archive precedence, item cache reader and the unresolved-cause classifier.
The real-client checks need a client Data folder: set OCTO_DATA_DIR (for example D:/Octowow/Data) and OCTO_WDB_DIR, else they are skipped."""
import json
import os
import struct
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models'))
import octo_mpq  # noqa: E402
import skins  # noqa: E402
import unresolved_causes  # noqa: E402
import wdb  # noqa: E402

DATA = os.environ.get('OCTO_DATA_DIR')
WDB_DIR = os.environ.get('OCTO_WDB_DIR')


def token(item_id, name, race_mask):
    return {'id': item_id, 'name': name, 'allowed_races': race_mask, 'spells': [(56053, 0)], 'description': ''}


def texture(kind, race, sex, path):
    return {'kind': kind, 'race': race, 'sex': sex, 'path': path, 'second': None, 'archive': 'patch-4.mpq'}


class ArchivePrecedence(unittest.TestCase):
    def test_load_order_and_provenance(self):
        rank = octo_mpq.archive_rank
        self.assertGreater(rank('patch-5.mpq')[0], rank('patch-4.mpq')[0])
        self.assertGreater(rank('patch-1.mpq')[0], rank('patch.MPQ')[0])
        self.assertGreater(rank('patch.MPQ')[0], rank('model.MPQ')[0])
        self.assertGreater(rank('model.MPQ')[0], rank('base.MPQ')[0])
        for official in ('patch-1.mpq', 'patch-5.mpq', 'patch.MPQ', 'texture.MPQ'):
            self.assertTrue(rank(official)[1], official)
        for mod in ('patch-V.mpq', 'patch-L.mpq', 'patch-Z.mpq'):
            self.assertFalse(rank(mod)[1], mod)
            self.assertGreater(rank(mod)[0], rank('patch-5.mpq')[0], 'letters load after digits and override them in game')

    def test_client_leaves_out_mods(self):
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            for name in ('patch-V.mpq', 'patch-3.mpq', 'texture.MPQ'):
                open(os.path.join(folder, name), 'wb').write(b'not an archive')
            self.assertEqual(octo_mpq.Client(folder).archives, [])   # nothing valid, and the mod is never even tried
            self.assertEqual([p for p in os.listdir(folder) if octo_mpq.archive_rank(p)[1]], ['patch-3.mpq', 'texture.MPQ'])


class ItemCache(unittest.TestCase):
    def test_reads_name_display_and_the_skin_spell(self):
        fields = [68226, 1, 0, 0, 0, 0, 0, 1, 0, 0] + [0] * (wdb.SPELLS_AT - 10) + [56053, 0, 0, 0, 0, 0] + [0] * 24 + [0]
        body = struct.pack('<II', 0, 0) + b'Mark of Test\0\0\0\0' + struct.pack('<%dI' % len(fields), *fields) + b'A token\0'
        data = b'\0' * 20 + struct.pack('<II', 50999, len(body)) + body
        path = os.path.join(os.environ.get('TEMP', '.'), 'skins_test_itemcache.wdb')
        open(path, 'wb').write(data)
        try:
            item = wdb.load_items(path)[50999]
        finally:
            os.remove(path)
        self.assertEqual((item['name'], item['display'], item['allowed_races']), ('Mark of Test', 68226, 1))
        self.assertEqual(item['spells'], [(56053, 0)])


class Catalogue(unittest.TestCase):
    def setUp(self):
        self.found = {
            'tokens': {1: token(1, 'Mark of A', 1), 2: token(2, 'Mark of B', 4), 3: token(3, 'Mark of C', 2)},
            'textures': {
                'character/human/male/a.blp': texture('charsections', 1, 0, 'Character\\Human\\Male\\A.blp'),
                'character/human/female/a.blp': texture('charsections', 1, 1, 'Character\\Human\\Female\\A.blp'),
                'character/dwarf/male/b.blp': texture('charsections', 3, 0, 'Character\\Dwarf\\Male\\B.blp'),
                'character/orc/male/x.blp': texture('charsections', 2, 0, 'Character\\Orc\\Male\\X.blp'),
                'character/orc/male/spare.blp': texture('charsections', 2, 0, 'Character\\Orc\\Male\\Spare.blp'),
            },
            'thumbs': {1: {'_1': 'a', '_2': 'b'}, 2: {'-': 'c'}, 3: {'-': 'd'}}}
        self.links = {1: {'m': 'character/human/male/a.blp', 'f': 'character/human/female/a.blp', 'basis': 'name'},
                      2: {'m': 'character/dwarf/male/b.blp', 'basis': 'ordinal'}}
        self.result = {s['id']: s for s in skins.catalogue(self.found, self.links)}

    def test_complete_token_is_recovered_and_never_verified_without_proof(self):
        a = self.result['skin-1']
        self.assertEqual((a['status'], len(a['variants']), a['missing']), ('Recovered', 2, []))
        self.assertNotIn('Verified', {s['status'] for s in self.result.values()}, 'a name link is evidence, not an exact mapping')

    def test_single_sex_token_with_a_single_picture_is_recovered_for_that_sex(self):
        b = self.result['skin-2']
        self.assertEqual((b['status'], b['genders']), ('Recovered', [0]))

    def test_a_low_confidence_link_is_applied_but_never_counted_as_recovered(self):
        links = {1: {'m': 'character/human/male/a.blp', 'f': 'character/human/female/a.blp', 'basis': 'visual', 'confidence': 'low'}}
        a = {s['id']: s for s in skins.catalogue(self.found, links)}['skin-1']
        self.assertEqual((a['status'], len(a['variants']), a['mapping']['confidence']), ('Partially Recovered', 2, 'low'))
        self.assertTrue(any('look the same' in m for m in a['missing']))
        self.assertEqual(self.result['skin-1']['mapping']['confidence'], None, 'a link with no stated confidence carries none')

    def test_token_with_no_link_offers_candidates_but_applies_none(self):
        c = self.result['skin-3']
        self.assertEqual((c['status'], c['variants']), ('Partially Recovered', []))
        self.assertEqual({x['path'] for x in c['candidates']}, {'Character\\Orc\\Male\\X.blp', 'Character\\Orc\\Male\\Spare.blp'})

    def test_unlinked_textures_become_unlabelled_skins_and_linked_ones_do_not(self):
        unlabelled = [s for s in self.result.values() if s['tokenItemId'] is None]
        self.assertEqual({s['name'] for s in unlabelled}, {'Unlabelled skin: x', 'Unlabelled skin: spare'})
        self.assertTrue(all(s['status'] == 'Partially Recovered' for s in unlabelled))

    def test_a_link_to_a_texture_the_client_lacks_is_reported_not_invented(self):
        links = {1: {'m': 'character/human/male/missing.blp', 'basis': 'name'}}
        a = {s['id']: s for s in skins.catalogue(self.found, links)}['skin-1']
        self.assertEqual(a['variants'], [])
        self.assertTrue(any('not in the client' in m for m in a['missing']))

    def test_audit_counts_add_up(self):
        text = skins.audit_text(self.found, list(self.result.values()))
        self.assertIn('Skin tokens in the client item cache: 3', text)

    def test_ids_do_not_collide_with_other_overlays(self):
        for first in (skins.FIRST_TEXTURE, skins.FIRST_CHOICE, skins.FIRST_ELEMENT, skins.FIRST_RESOURCE):
            self.assertGreaterEqual(first, 9900000)
        self.assertLess(skins.FIRST_TEXTURE + 5000, skins.FIRST_CHOICE)


class Links(unittest.TestCase):
    def test_every_link_names_a_basis_and_a_texture_path(self):
        data = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'tools', 'models', 'skin_links.json'), encoding='utf-8'))
        for token_id, link in data['links'].items():
            self.assertTrue(token_id.isdigit())
            self.assertIn(link['basis'], {'name', 'ordinal', 'visual', 'name+visual'}, token_id)
            self.assertIn(link['confidence'], {'high', 'medium', 'low'}, token_id)
            self.assertTrue(link.get('m') or link.get('f'), token_id)
            for key in ('m', 'f'):
                if link.get(key):
                    self.assertTrue(link[key].lower().endswith('.blp') and '\\' not in link[key], link[key])


class Causes(unittest.TestCase):
    def test_classifier_covers_the_known_reasons(self):
        cases = {
            'the OctoWoW database page names no display id for this item': 'missing item metadata',
            'display id not in ItemDisplayInfo.dbc': 'display id not in the client',
            'no left model named; no right model named': 'missing source asset: no model named',
            'no helm model for race 1 gender 0': 'missing source asset: no helm model for the races',
            'texture Shoulder_Plate_D_02 not found': 'missing source asset: texture not found',
            'ArmUpperTexture Mail_B_06Green_Sleeve_AU: no female texture in the client': 'missing texture variant (one sex)',
            'Mace_2H_Blood_A_01: source is M2 version 257, read with the version 256 layout': 'unsupported model format',
            'something new': 'other'}
        for reason, cause in cases.items():
            self.assertEqual(unresolved_causes.classify({'reason': reason}), cause, reason)


@unittest.skipUnless(DATA and os.path.isdir(DATA) and WDB_DIR, 'set OCTO_DATA_DIR and OCTO_WDB_DIR')
class RealClient(unittest.TestCase):
    def test_skins_are_found_and_every_linked_texture_exists(self):
        client = octo_mpq.Client(DATA)
        self.assertFalse(any(os.path.basename(a.path).lower().startswith('patch-v') for a in client.archives), 'the HD pack must not be read')
        found = skins.discover(client, os.path.join(WDB_DIR, 'itemcache.wdb'))
        self.assertGreaterEqual(len(found['tokens']), 40)
        catalogue = skins.catalogue(found, skins.load_links())
        for skin in catalogue:
            if skin['tokenItemId']:
                for variant in skin['variants']:
                    self.assertTrue(client.has(variant['texture']['path']), variant['texture']['path'])
        self.assertTrue(all(t['archive'] for t in found['textures'].values()))


if __name__ == '__main__':
    unittest.main()
