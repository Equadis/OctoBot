"""Donation-shop character skins: discovery, catalogue, audit and overlay build (nothing is uploaded).

    python tools/models/skins.py discover <Data folder> <itemcache.wdb> <out folder>
    python tools/models/skins.py build    <Data folder> <itemcache.wdb> <out folder>

How the skins work in this client (found by reading it, see tools/models/README.md "Character skins"):
  * The shop sells "Mark of ..." tokens. They are items that all cast the same spell (56053); the client cache says "This token will alter your
    character's skin, while leaving the haircut, hair color, and facial features unchanged." Which skin a token gives is decided by the server,
    so the client names the tokens but does not link them to textures.
  * The skins themselves are ordinary race models with a different body texture. Two places hold them: CharSections.dbc rows flagged 1 (not
    selectable at character creation) and baked NPC textures (Textures\\BakedNpcTextures\\*shop.blp, each with a CreatureDisplayInfoExtra and a
    CreatureDisplayInfo row, ids 20962 to 20999). Both are whole body textures that already contain the face.
  * Shop thumbnails (Interface\\ShopFrame\\entries\\<token>[_1|_2].blp) show each token on a character; they are the evidence used to link tokens to
    textures by eye (skin_links.json records the basis of every link).
`discover` writes discovery.json and audit.md; `build` also converts the textures and thumbnails (WebP, invented file ids from 9,900,000), writes
the catalogue, one customisation fragment per body, a manifest and version.json. The out folder must be under tools/models/out or outside the
repository: converted client files are never committed or published without OctoWoW's agreement (see README.md).
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import blp  # noqa: E402
import build_overlay  # noqa: E402
import customisation as C  # noqa: E402
import octo_mpq  # noqa: E402
import wdb  # noqa: E402

TOKEN_SPELL = 56053
RACES = {1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead', 6: 'Tauren', 7: 'Gnome', 8: 'Troll', 9: 'Goblin', 10: 'High Elf'}
SEX_NAMES = ('male', 'female')
FIRST_TEXTURE, FIRST_CHOICE, FIRST_ELEMENT, FIRST_RESOURCE = 9900000, 9950000, 9960000, 9970000
BAKED_DIR = 'Textures\\BakedNpcTextures\\'
THUMB_DIR = 'Interface\\ShopFrame\\entries\\'
STATUSES = ('Verified', 'Recovered', 'Partially Recovered', 'Unresolved')


def norm(path):
    return path.replace('\\', '/').lower()


def chr_model_id(race, sex):
    return race * 2 - 1 + sex


def races_of(mask):
    return [r for r in RACES if mask & (1 << (r - 1))]


def stem(path):
    return os.path.splitext(os.path.basename(norm(path)))[0]


def discover(client, itemcache):
    """Everything the client says about skins. Returns a plain dict (JSON-able)."""
    items = wdb.load_items(itemcache)
    tokens = {i['id']: i for i in items.values() if any(s[0] == TOKEN_SPELL for s in i['spells'])}
    sections, string = C.read_dbc(client.read('DBFilesClient\\CharSections.dbc'))

    def text(offset):
        try:
            return string(offset)
        except ValueError:
            return ''
    textures = {}                                              # normalised client path -> record
    for r in sections:
        if r[3] == 0 and r[9] & 1 and r[1] in RACES:           # section 0 = skin, flag 1 = not selectable at creation
            for slot, offset in ((1, 6), (2, 7)):
                path = text(r[offset])
                if path and slot == 1:
                    textures[norm(path)] = {'kind': 'charsections', 'race': r[1], 'sex': r[2], 'path': path, 'second': text(r[7]) or None,
                                            'rowId': r[0], 'colour': r[5], 'archive': client.which(path)}
    extras, estr = C.read_dbc(client.read('DBFilesClient\\CreatureDisplayInfoExtra.dbc'))
    displays, _ = C.read_dbc(client.read('DBFilesClient\\CreatureDisplayInfo.dbc'))
    by_extra = {d[3]: d for d in displays}
    for r in extras:
        try:
            bake = estr(r[-1])
        except ValueError:
            continue
        if bake.lower().endswith('shop.blp') or re.search(r'shop\d\.blp$', bake.lower()):
            path = BAKED_DIR + bake
            display = by_extra.get(r[0])
            textures[norm(path)] = {'kind': 'baked-npc', 'race': r[1], 'sex': r[2], 'path': path, 'second': None, 'extendedDisplayId': r[0],
                                    'creatureDisplayId': display[0] if display else None, 'modelDataId': display[1] if display else None,
                                    'archive': client.which(path)}
    thumbs = {}
    for token in tokens:
        found = {}
        for suffix in ('', '_1', '_2'):
            path = f'{THUMB_DIR}{token}{suffix}.blp'
            if client.has(path):
                found[suffix or '-'] = path
        thumbs[token] = found
    return {'tokens': tokens, 'textures': textures, 'thumbs': thumbs}


def load_links():
    data = json.load(open(os.path.join(HERE, 'skin_links.json'), encoding='utf-8'))
    return {int(k): v for k, v in data['links'].items()}


def catalogue(found, links):
    """The skin records. Pure data: no files are read here."""
    textures, tokens, thumbs = found['textures'], found['tokens'], found['thumbs']
    used, skins = set(), []
    for token_id, item in sorted(tokens.items()):
        races = races_of(item['allowed_races'])
        link = links.get(token_id, {})
        variants, missing = [], []
        for sex, key in enumerate(('m', 'f')):
            if not link.get(key):
                continue
            record = textures.get(norm(link[key]))
            if not record:
                missing.append(f'{SEX_NAMES[sex]} texture {link[key]} is not in the client')
                continue
            used.add(norm(link[key]))
            variants.append({'gender': sex, 'texture': record})
        both = '1' in {s.lstrip('_') for s in thumbs[token_id]}                 # the shop shows both sexes for a gender-neutral token
        wanted = {0, 1} if both else {s for s in (0, 1) if any(v['gender'] == s for v in variants)}
        have = {v['gender'] for v in variants}
        for sex in sorted(wanted - have):
            missing.append(f'no {SEX_NAMES[sex]} texture linked' if link else f'no texture linked for the {SEX_NAMES[sex]} look')
        candidates = [] if variants else sorted(
            ({'path': t['path'], 'kind': t['kind'], 'sex': t['sex']} for k, t in textures.items() if t['race'] in races), key=lambda c: c['path'].lower())
        if variants and not missing:
            status = 'Recovered'
        elif variants:
            status = 'Partially Recovered'
        else:
            status = 'Partially Recovered' if candidates else 'Unresolved'
        skins.append({
            'id': f'skin-{token_id}', 'name': item['name'], 'source': 'OctoWoW client (patch archives, item cache)', 'tokenItemId': token_id,
            'tokenSpellId': TOKEN_SPELL, 'races': races, 'category': RACES[races[0]] if len(races) == 1 else 'Other',
            'genders': sorted(wanted or have), 'mechanism': 'texture', 'variants': variants, 'candidates': candidates,
            'mapping': {'basis': link.get('basis') if variants else None, 'note': link.get('note'), 'alternates': link.get('alternates', [])},
            'thumbnails': thumbs[token_id], 'missing': missing, 'status': status,
            'verification': {'automated': bool(variants), 'visual': 'compared with the shop thumbnail by eye (not in game)'
                             if variants and 'visual' in (link.get('basis') or '') else 'none'}})
    for key, t in sorted(textures.items()):
        if key in used or t['race'] not in RACES:
            continue
        skins.append({
            'id': f'skin-u-{t["race"]}-{t["sex"]}-{stem(t["path"])}', 'name': f'Unlabelled skin: {stem(t["path"])}',
            'source': 'OctoWoW client (' + (t['archive'] or '?') + ')', 'tokenItemId': None, 'tokenSpellId': None, 'races': [t['race']],
            'category': RACES[t['race']], 'genders': [t['sex']], 'mechanism': 'texture', 'variants': [{'gender': t['sex'], 'texture': t}],
            'candidates': [], 'mapping': {'basis': None, 'note': 'A skin the client holds but no shop token is linked to; its in-game name is unknown.',
                                            'alternates': []}, 'thumbnails': {}, 'missing': ['shop token (name) unknown'],
            'status': 'Partially Recovered', 'verification': {'automated': True, 'visual': 'none'}})
    return skins


def audit_text(found, skins):
    n = lambda status: sum(1 for s in skins if s['status'] == status)       # noqa: E731
    tokens = [s for s in skins if s['tokenItemId']]
    lines = ['# Character skins audit', '',
             f'Skin tokens in the client item cache: {len(tokens)}. Texture-only skins found in the client: {len(found["textures"])} '
             f'({sum(1 for t in found["textures"].values() if t["kind"] == "charsections")} CharSections rows flagged 1, '
             f'{sum(1 for t in found["textures"].values() if t["kind"] == "baked-npc")} baked shop textures).', '',
             f'Tokens with a linked texture: {sum(1 for s in tokens if s["variants"])}; with candidates only: '
             f'{sum(1 for s in tokens if not s["variants"] and s["candidates"])}; unresolved: {sum(1 for s in tokens if not s["variants"] and not s["candidates"])}.',
             f'Statuses: ' + ', '.join(f'{s} {n(s)}' for s in STATUSES), '',
             '## Tokens', '', '| token | name | races | status | basis | missing |', '|---|---|---|---|---|---|']
    for s in tokens:
        lines.append(f'| {s["tokenItemId"]} | {s["name"]} | {", ".join(RACES[r] for r in s["races"])} | {s["status"]} | '
                     f'{s["mapping"]["basis"] or "-"} | {"; ".join(s["missing"]) or "-"} |')
    return '\n'.join(lines) + '\n'


def convert(client, found, skins, out, log=print):
    """Writes textures, thumbnails, fragments, catalogue, manifest and version.json under out."""
    build_overlay.check_output_folder(out)
    out_dir = out
    manifest = {'files': {}, 'missing': []}
    ids = {}

    def texture_id(path):
        key = norm(path)
        if key in ids:
            return ids[key]
        data = client.read(path)
        if data is None:
            manifest['missing'].append(path)
            return None
        webp = blp.blp_to_webp(data)[0]
        ids[key] = FIRST_TEXTURE + len(ids)
        build_overlay.write(out, f'textures/{ids[key]}.webp', webp, manifest)
        return ids[key]
    def thumbnail_id(path):
        """The shop picture cropped to its card (the BLP is a 256 square with the card in one corner and transparent elsewhere)."""
        key = norm(path)
        if key in ids:
            return ids[key]
        data = client.read(path)
        if data is None:
            manifest['missing'].append(path)
            return None
        from PIL import Image
        image = Image.open(io.BytesIO(blp.blp_to_webp(data)[0])).convert('RGBA')
        box = image.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
        if box:
            image = image.crop(box)
        out = io.BytesIO()
        image.save(out, 'WEBP', lossless=True, quality=100, method=4)
        ids[key] = FIRST_TEXTURE + len(ids)
        build_overlay.write(out_dir, f'textures/{ids[key]}.webp', out.getvalue(), manifest)
        return ids[key]
    counters = {'choice': FIRST_CHOICE, 'element': FIRST_ELEMENT, 'resource': FIRST_RESOURCE}

    def new(kind):
        counters[kind] += 1
        return counters[kind]
    fragments = {}
    for skin in skins:
        for variant in skin['variants']:
            race, sex = variant['texture']['race'], variant['gender']
            body = chr_model_id(race, sex)
            fragment = fragments.setdefault(body, {'option': 'Skin Color', 'Choices': [], 'TextureFiles': {}})
            elements = []
            main = texture_id(variant['texture']['path'])
            second = texture_id(variant['texture']['second']) if variant['texture'].get('second') else None
            for target, file_id in ((1, main), (2, second)):
                if not file_id:
                    continue
                resource = new('resource')
                fragment['TextureFiles'][str(resource)] = [{'FileDataId': file_id, 'Gender': 3, 'Class': 0, 'Race': 0, 'ExtraData': 0}]
                elements.append({'Id': new('element'), 'VariationIndex': -1, 'VariationChoiceID': 0, 'Geoset': None, 'SkinnedModel': None,
                                 'Material': {'TextureTarget': target, 'MaterialResourcesID': resource}, 'BoneSet': None, 'CondModelFileDataId': 0,
                                 'ChrCustItemGeoModifyID': 0})
            if race == 10:                                  # the Blood Elf eye glow geoset (see customisation.py)
                elements.append({'Id': new('element'), 'VariationIndex': -1, 'VariationChoiceID': 0,
                                 'Geoset': {'GeosetType': 17, 'GeosetID': 2, 'Modifier': -1}, 'SkinnedModel': None, 'Material': None,
                                 'BoneSet': None, 'CondModelFileDataId': 0, 'ChrCustItemGeoModifyID': 0})
            choice = {'Id': new('choice'), 'Name': skin['name'], 'OrderIndex': 1000 + len(fragment['Choices']), 'CustReqId': 0, 'Elements': elements}
            fragment['Choices'].append(choice)
            variant['body'], variant['choiceId'] = body, choice['Id']
            variant['textureFileId'] = main
            variant['texture'] = {k: v for k, v in variant['texture'].items() if k != 'second'} | {'secondFileId': second}
        thumbs = {}
        for suffix, path in skin['thumbnails'].items():
            file_id = thumbnail_id(path)
            if file_id:
                thumbs[suffix] = file_id
        skin['thumbnails'] = thumbs
    for body, fragment in sorted(fragments.items()):
        build_overlay.write(out, f'skins/choices/{body}.json', json.dumps(fragment, separators=(',', ':')).encode(), manifest)
    summary = {'version': 1, 'skins': skins}
    build_overlay.write(out, 'skins/catalogue.json', json.dumps(summary, separators=(',', ':')).encode(), manifest)
    version = build_overlay.compute_version(manifest['files'])
    build_overlay.write(out, 'version.json', json.dumps({'version': version, 'files': len(manifest['files']) + 1}).encode(), manifest)
    manifest['version'] = version
    manifest['totals'] = {'files': len(manifest['files']), 'bytes': sum(f['bytes'] for f in manifest['files'].values())}
    json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
    log(f'{len(skins)} skins, {len(ids)} textures, {len(fragments)} bodies, version {version}, missing {len(manifest["missing"])}')
    return manifest


def main(argv):
    if len(argv) != 4 or argv[0] not in ('discover', 'build'):
        print(__doc__)
        return 2
    client = octo_mpq.Client(argv[1])
    found = discover(client, argv[2])
    skins = catalogue(found, load_links())
    out = build_overlay.check_output_folder(argv[3])
    os.makedirs(out, exist_ok=True)
    json.dump({'found': {'tokens': {str(k): v for k, v in found['tokens'].items()}, 'textures': found['textures'], 'thumbs': {str(k): v for k, v in found['thumbs'].items()}},
               'skins': skins}, open(os.path.join(out, 'discovery.json'), 'w'), indent=1)
    open(os.path.join(out, 'audit.md'), 'w', encoding='utf-8').write(audit_text(found, skins))
    print(audit_text(found, skins).split('## Tokens')[0])
    if argv[0] == 'build':
        convert(client, found, skins, os.path.join(out, 'overlay'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
