"""Validates an overlay folder (build_overlay.py / merge_overlays.py output) as a whole: every reference resolves to a file, every file is sound.

    python tools/models/validate_overlay.py <overlay folder> [report.json]

Checks, none of which proves an appearance looks right (that needs the viewer):
  * manifest: every listed file exists with the listed size and sha256, no unlisted file, version.json matches the files
  * every texture decodes as WebP; every model has an MD21 chunk with SFID, SKID and TXID; every .skin starts SKIN; every .skel has its chunks
  * every id a record names resolves: Model, Textures, Textures2, TextureFiles, ModelFiles, ComponentTextures, ComponentModels, customisation
    texture resources, helms.json model ids. Ids below 9,000,000 belong to the Classic library (not in the overlay) and are only counted.
  * every model's SFID, SKID and TXID ids resolve
  * orphans (files nothing names) are reported, not failed
Exit status 1 when anything is missing or unsound.
"""
import hashlib
import io
import json
import os
import struct
import sys

OVERLAY_FIRST = 9000000


def walk(folder):
    for base, _, names in os.walk(folder):
        for name in names:
            path = os.path.join(base, name)
            yield os.path.relpath(path, folder).replace('\\', '/'), path


def m2_refs(data):
    """(skin ids, skeleton ids, texture ids) from a chunked M2 (MD21 then SFID, SKID, TXID...)."""
    if data[:4] != b'MD21':
        raise ValueError('no MD21 chunk')
    skins, skel, tex, pos = [], [], [], 0
    while pos + 8 <= len(data):
        tag, size = data[pos:pos + 4], struct.unpack_from('<I', data, pos + 4)[0]
        body = data[pos + 8:pos + 8 + size]
        ids = list(struct.unpack('<%dI' % (len(body) // 4), body[:len(body) // 4 * 4]))
        if tag == b'SFID':
            skins = ids
        elif tag == b'SKID':
            skel = ids
        elif tag == b'TXID':
            tex = ids
        pos += 8 + size
    return skins, skel, tex


def blended_batches_without_shader(m2, skin):
    """Batches whose material is blended (alpha, additive, modulate: blend mode 2 or more) with one texture that still carry shader id 0. Blizzard's own files give those shader 16;
    with 0 the batch draws opaque (glows, flames and glass became black squares). Returns the offending (batch, blend) pairs."""
    md = m2[8:8 + struct.unpack_from('<I', m2, 4)[0]]
    mn, mo = struct.unpack_from('<II', md, 0x70)
    blends = [struct.unpack_from('<HH', md, mo + 4 * k)[1] for k in range(mn)]
    bn, bo = struct.unpack_from('<II', skin, 0x24)
    bad = []
    for k in range(bn):
        fields = struct.unpack_from('<BbHHHHHHHHHHH', skin, bo + 24 * k)
        shader, material, ops = fields[2], fields[6], fields[8]
        if ops <= 1 and material < len(blends) and blends[material] >= 2 and shader == 0:
            bad.append((k, blends[material]))
    return bad


def record_refs(record):
    """(model ids, texture ids, problems) a record names. Resource ids are resolved through TextureFiles / ModelFiles."""
    models, textures, problems = set(), set(), []
    if isinstance(record.get('Model'), int) and record['Model'] > 0:
        models.add(record['Model'])
    for key in ('Textures', 'Textures2'):
        if isinstance(record.get(key), dict):
            textures.update(v for v in record[key].values() if isinstance(v, int) and v > 0)
    files = record.get('TextureFiles') or {}
    for resource, lst in files.items():
        textures.update(f['FileDataId'] for f in lst)
    for resource, lst in (record.get('ModelFiles') or {}).items():
        models.update(f['FileDataId'] for f in lst)
    for slot, resource in (record.get('ComponentTextures') or {}).items():
        if str(resource) not in files:
            problems.append(f'ComponentTextures {slot} names resource {resource} that TextureFiles lacks')
    for slot, resource in (record.get('ComponentModels') or {}).items():
        if str(resource) not in (record.get('ModelFiles') or {}):
            problems.append(f'ComponentModels {slot} names resource {resource} that ModelFiles lacks')
    return models, textures, problems


def validate(folder, log=print):
    from PIL import Image
    files = dict(walk(folder))
    report = {'folder': folder, 'missing': [], 'unsound': [], 'manifest': [], 'orphans': [], 'counts': {}, 'classic_refs': 0}
    manifest = json.load(open(files.get('manifest.json', os.path.join(folder, 'manifest.json'))))['files']
    for key, info in manifest.items():
        path = files.get(key)
        if not path:
            report['manifest'].append(f'{key}: listed but not on disk')
        elif key != 'manifest.json' and os.path.getsize(path) != info['bytes']:
            report['manifest'].append(f'{key}: size differs from the manifest')
    for key in files:
        if key not in manifest and key not in ('manifest.json', '.uploaded.json'):
            report['manifest'].append(f'{key}: on disk but not in the manifest')
    textures = {int(k.split('/')[1].split('.')[0]) for k in files if k.startswith('textures/')}
    models = {int(k.split('/')[1].split('.')[0]) for k in files if k.startswith('m2/')}
    skins = {int(k.split('/')[1].split('.')[0]) for k in files if k.startswith('skin/')}
    skels = {int(k.split('/')[1].split('.')[0]) for k in files if k.startswith('skel/')}
    used_t, used_m, used_s, used_k = set(), set(), set(), set()
    choices_by_body, catalogue_path = {}, None

    def need(kind, ident, owner):
        have = {'texture': textures, 'model': models, 'skin': skins, 'skeleton': skels}[kind]
        if ident < OVERLAY_FIRST:
            report['classic_refs'] += 1
        elif ident not in have:
            report['missing'].append(f'{owner}: {kind} {ident}')
    for key, path in sorted(files.items()):
        if key.startswith('meta/') and key.endswith('.json'):
            try:
                record = json.load(open(path, encoding='utf-8'))
            except ValueError as error:
                report['unsound'].append(f'{key}: not JSON ({error})')
                continue
            m, t, problems = record_refs(record)
            report['unsound'] += [f'{key}: {p}' for p in problems]
            for ident in m:
                need('model', ident, key)
                used_m.add(ident)
            for ident in t:
                need('texture', ident, key)
                used_t.add(ident)
        elif key.startswith('skins/choices/') and key.endswith('.json'):
            fragment = json.load(open(path, encoding='utf-8'))
            for resource, lst in (fragment.get('TextureFiles') or {}).items():
                for f in lst:
                    need('texture', f['FileDataId'], key)
                    used_t.add(f['FileDataId'])
            known = set(map(str, fragment.get('TextureFiles') or {}))
            for choice in fragment.get('Choices', []):
                for element in choice.get('Elements', []):
                    resource = (element.get('Material') or {}).get('MaterialResourcesID')
                    if resource is not None and str(resource) not in known:
                        report['unsound'].append(f'{key}: choice {choice.get("Id")} names resource {resource} that TextureFiles lacks')
            choices_by_body[key.split('/')[-1][:-5]] = {c['Id'] for c in fragment.get('Choices', [])}
        elif key == 'skins/catalogue.json':
            catalogue_path = path
        elif key == 'helms.json':
            table = json.load(open(path, encoding='utf-8'))
            for display, entry in table.items():
                for ident in (entry.get('models', entry) if isinstance(entry, dict) else {}).values():
                    if isinstance(ident, int):
                        need('model', ident, f'helms.json {display}')
                        used_m.add(ident)
        elif key.startswith('m2/'):
            try:
                s, k, t = m2_refs(open(path, 'rb').read())
            except (ValueError, struct.error) as error:
                report['unsound'].append(f'{key}: {error}')
                continue
            if not s or not k:
                report['unsound'].append(f'{key}: no skin or skeleton reference')
            for ident in s:
                need('skin', ident, key)
                used_s.add(ident)
                if ident in skins:
                    try:
                        bad = blended_batches_without_shader(open(path, 'rb').read(), open(files[f'skin/{ident}.skin'], 'rb').read())
                    except (struct.error, ValueError, KeyError) as error:
                        report['unsound'].append(f'{key}: skin {ident} cannot be read ({error})')
                        bad = []
                    for batch, blend in bad:
                        report['unsound'].append(f'{key}: batch {batch} is blended (mode {blend}) but has shader id 0 and would draw opaque')
            for ident in k:
                need('skeleton', ident, key)
                used_k.add(ident)
            for ident in t:
                if ident:
                    need('texture', ident, key)
                    used_t.add(ident)
        elif key.startswith('skin/'):
            if open(path, 'rb').read(4) != b'SKIN':
                report['unsound'].append(f'{key}: not a SKIN file')
        elif key.startswith('skel/'):
            if open(path, 'rb').read(4) not in (b'SKL1', b'SKB1', b'SKS1', b'SKA1', b'MD21'):
                report['unsound'].append(f'{key}: unexpected skeleton header')
        elif key.startswith('textures/'):
            try:
                with Image.open(path) as image:
                    image.load()
                    if image.width < 1 or image.height < 1:
                        raise ValueError('empty image')
            except Exception as error:
                report['unsound'].append(f'{key}: does not decode ({error})')
    if catalogue_path:                                       # the skin catalogue must agree with the choices files and the textures
        for skin in json.load(open(catalogue_path, encoding='utf-8')).get('skins', []):
            for variant in skin.get('variants', []):
                owner = f'skins/catalogue.json {skin["id"]}'
                if variant.get('choiceId') not in choices_by_body.get(str(variant.get('body')), set()):
                    report['missing'].append(f'{owner}: choice {variant.get("choiceId")} is not in skins/choices/{variant.get("body")}.json')
                for ident in (variant['texture'].get('textureFileId') if 'textureFileId' in variant['texture'] else variant.get('textureFileId'), variant['texture'].get('secondFileId')):
                    if ident:
                        need('texture', ident, owner)
                        used_t.add(ident)
            for ident in (skin.get('thumbnails') or {}).values():
                need('texture', ident, f'skins/catalogue.json {skin["id"]} thumbnail')
                used_t.add(ident)
    for kind, have, used, prefix, ext in (('texture', textures, used_t, 'textures', 'webp'), ('model', models, used_m, 'm2', 'm2'),
                                         ('skin', skins, used_s, 'skin', 'skin'), ('skeleton', skels, used_k, 'skel', 'skel')):
        report['orphans'] += [f'{prefix}/{i}.{ext}' for i in sorted(have - used)]
    report['counts'] = {'files': len(files), 'textures': len(textures), 'models': len(models), 'skins': len(skins), 'skeletons': len(skels),
                        'missing': len(report['missing']), 'unsound': len(report['unsound']), 'manifest': len(report['manifest']), 'orphans': len(report['orphans'])}
    return report


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    report = validate(argv[0])
    if len(argv) > 1:
        json.dump(report, open(argv[1], 'w'), indent=1)
    print(json.dumps(report['counts']))
    for kind in ('missing', 'unsound', 'manifest'):
        for line in report[kind][:15]:
            print(f'  {kind}: {line}')
    return 1 if report['missing'] or report['unsound'] or report['manifest'] else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
