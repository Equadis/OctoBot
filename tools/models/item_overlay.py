"""Builds Zam-format item appearance data from the OctoWoW client, for display ids Zam's Classic library does not hold.

    python tools/models/item_overlay.py build  <Data folder> <out folder>     # converts what Zam lacks, writes files and manifest
    python tools/models/item_overlay.py oracle <Data folder>                  # checks the generator against display ids Zam DOES hold
    python tools/models/item_overlay.py extra  <Data folder> <out folder> <existing item overlay>
                                                                              # rebuilds what the existing overlay built with gaps or not at all; writes only what now
                                                                              # builds completely, with ids continuing after the existing overlay's (nothing moves)

The records have the shape Zam's viewer reads (see the samples in the oracle report): meta/armor/<slot>/<display id>.json for body armour,
shoulders and cloaks, meta/item/<display id>.json for weapons, shields and ranged. Body and cloak textures become lossless WebP under invented
texture file ids (9,700,000 up); shoulder, weapon and shield models go through m2v274 with invented model ids (9,800,000 up). Nothing is
uploaded and the folder under tools/models/out is git-ignored: converted client files must not be committed or published (README.md).

The 'oracle' mode builds each record for display ids Zam already holds and compares the structure (which regions have textures, which
sexes, the geoset group numbers, inventory type, model slots) with Zam's own record. Zam's file ids are not the client's, so ids and pixels
are not compared; that is a limit, and a structural match is not a visual match.

Not covered here: helm models for races other than Goblin and High Elf (helms.py does those two), and anything the renderer must show to
be confirmed (see README.md).
"""
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import blp  # noqa: E402
import local_audit  # noqa: E402
import m2v256  # noqa: E402
import m2v274  # noqa: E402
import octo_mpq  # noqa: E402

OUT = os.path.join(local_audit.ROOT, 'tools', 'models', 'out')
TEXTURE_FIRST, MODEL_FIRST, MODEL_STRIDE, KEY_FIRST = 9700000, 9800000, 20, 9650000
FIELD_REGION = {14: 0, 15: 1, 16: 2, 17: 3, 18: 4, 19: 5, 20: 6, 21: 7}
CAPE_REGION = 12
HELM_RACES = {1: 'Hu', 2: 'Or', 3: 'Dw', 4: 'Ni', 5: 'Sc', 6: 'Ta', 7: 'Gn', 8: 'Tr', 9: 'Go', 10: 'Be'}
ARMOR_SLOTS = (3, 4, 5, 6, 7, 8, 9, 10, 16, 19)


def used_ids(folder):
    """(next texture file id, next record key, next model id) after everything an existing overlay folder holds."""
    texture, key, model = TEXTURE_FIRST - 1, KEY_FIRST, MODEL_FIRST - MODEL_STRIDE
    textures, models = os.path.join(folder, 'textures'), os.path.join(folder, 'm2')
    for name in os.listdir(textures) if os.path.isdir(textures) else []:
        stem = name.split('.')[0]
        if stem.isdigit() and TEXTURE_FIRST <= int(stem) < MODEL_FIRST:
            texture = max(texture, int(stem))
    for name in os.listdir(models) if os.path.isdir(models) else []:
        stem = name.split('.')[0]
        if stem.isdigit() and MODEL_FIRST <= int(stem) < 9900000:
            model = max(model, int(stem))
    for root, _, files in os.walk(os.path.join(folder, 'meta')):
        for name in files:
            try:
                record = json.load(open(os.path.join(root, name), encoding='utf-8'))
            except Exception:
                continue
            if not isinstance(record, dict):
                continue
            for group in ('TextureFiles', 'ModelFiles'):
                for k in (record.get(group) or {}):
                    if str(k).isdigit() and KEY_FIRST <= int(k) < TEXTURE_FIRST:
                        key = max(key, int(k))
    return texture + 1, key, model + MODEL_STRIDE


def meta_path(slot, display_id):
    return f'meta/item/{display_id}.json' if slot in (21, 22, 26) else f'meta/armor/{slot}/{display_id}.json'


def empty_record(inventory_type, item_class, sub_class, geosets):
    return {'Model': 0, 'Textures': None, 'Textures2': None, 'TextureFiles': None, 'ModelFiles': None,
            'Item': {'Flags': 0, 'InventoryType': inventory_type, 'ItemClass': item_class, 'ItemSubClass': sub_class,
                     'HideGeosetMale': None, 'HideGeosetFemale': None, 'GeosetGroup': (list(geosets) + [0] * 6)[:6],
                     'AttachGeosetGroup': [0] * 6, 'GeosetGroupOverride': 0, 'ItemVisual': 0, 'ParticleColor': None},
            'Creature': None, 'Character': None, 'ItemEffects': None, 'Equipment': None, 'ComponentTextures': None,
            'ComponentModels': None, 'StateKits': None, 'Decor': None, 'Scale': 1}


class Builder:
    """Allocates ids and collects files. Ids follow the order display ids are built in; build in sorted order for stable output."""

    def __init__(self, client, assets, keep_files=True, after=None):
        self.client, self.assets, self.keep = client, assets, keep_files
        self.tex_ids, self.next_key, self.next_model, self.next_texture = {}, KEY_FIRST, MODEL_FIRST, TEXTURE_FIRST
        if after:
            # Continue after the ids an existing overlay already uses, so records added later never move or collide with it.
            self.next_texture, self.next_key, self.next_model = used_ids(after)
        self.files, self.failures, self.models = {}, [], {}
        import helms
        self.vis = helms.DisplayInfo(client)

    def texture_id(self, path):
        """Invented file id for a client texture path (converted once); None when the client lacks it or it will not decode."""
        if path not in self.tex_ids:
            data = self.client.read(path)
            if data is None:
                self.tex_ids[path] = None
            else:
                try:
                    webp = blp.blp_to_webp(data)[0] if self.keep else b''
                    self.tex_ids[path] = self.next_texture
                    self.next_texture += 1
                    if self.keep:
                        self.files[f'textures/{self.tex_ids[path]}.webp'] = webp
                except Exception as error:  # a texture that will not decode is reported, not hidden
                    self.failures.append(f'{path}: {type(error).__name__}: {error}')
                    self.tex_ids[path] = None
        return self.tex_ids[path]

    def model(self, path):
        """(model file id, verification result) for a client M2, converted once."""
        if path not in self.models:
            data = self.client.read(path)
            if data is None:
                self.models[path] = None
            else:
                first = self.next_model
                self.next_model += MODEL_STRIDE
                try:
                    out, ids = m2v274.convert(data, first)
                    passed, failed = m2v274.verify(data, out)
                    # A rule that sampled no animation tracks (a static prop) proves nothing and is not a failure.
                    failed = [f for f in failed if '(0 tracks sampled)' not in f]
                    skin_slot = any(t['type'] == 2 for t in m2v256.M2(data).textures())
                    for tex_path, tex_id in ids['textures'].items():     # textures the model itself names
                        raw = self.client.read(tex_path)
                        if raw is None:
                            self.models.setdefault('_missing', []).append(tex_path)
                        elif self.keep:
                            self.files[f'textures/{tex_id}.webp'] = blp.blp_to_webp(raw)[0]
                    if self.keep:
                        self.files.update(out)
                    info = {'passed': len(passed), 'failed': failed}
                    reader = m2v256.M2(data)
                    if reader.version != 256:
                        # Read with the version 256 layout; sane sizes, indices and names, but never confirmed against the game or a renderer.
                        info['note'] = f'source is M2 version {reader.version}, read with the version 256 layout (plausibility-checked only)'
                    self.models[path] = (ids['model'], info, skin_slot)
                except Exception as error:
                    self.failures.append(f'{path}: {type(error).__name__}: {error}')
                    self.models[path] = None
        return self.models[path]

    def key(self):
        self.next_key += 1
        return self.next_key

    def armor(self, display_id, slot, item):
        """Body armour record. Returns (record, notes)."""
        row, s, notes = self.assets.rows[display_id], self.assets.string, []
        record = empty_record(item['slot'], item['classs'], item['subclass'], row[6:9])
        wanted = local_audit.BODY[slot] + (local_audit.ROBE_EXTRA if item['slot'] == 20 else ())
        textures, regions = {}, {}
        for field in wanted:
            name = s(row[field])
            if not name:
                continue
            base, folder = os.path.splitext(name)[0], local_audit.TEXTURES[field]
            base_path = f'Item/TextureComponents/{folder}/{base}'
            entries = []
            unisex = self.texture_id(base_path + '_U.blp')
            if unisex:
                entries.append({'FileDataId': unisex, 'Gender': 3, 'Class': 0, 'Race': 0, 'ExtraData': 0})
            for gender, suffix, label in ((1, 'F', 'female'), (0, 'M', 'male')):
                found = self.texture_id(f'{base_path}_{suffix}.blp')
                if found:
                    entries.append({'FileDataId': found, 'Gender': gender, 'Class': 0, 'Race': 0, 'ExtraData': 0})
                elif not unisex:
                    notes.append(f'{folder} {name}: no {label} texture in the client')
            if entries:
                key = self.key()
                textures[str(key)] = entries
                regions[str(FIELD_REGION[field])] = key
        record['TextureFiles'] = textures or None
        record['ComponentTextures'] = regions or None
        return record, notes

    def cape(self, display_id, item):
        row, s = self.assets.rows[display_id], self.assets.string
        record = empty_record(item['slot'], item['classs'], item['subclass'], row[6:9])
        notes = []
        name = s(row[3])
        found = self.texture_id(f'Item/ObjectComponents/Cape/{os.path.splitext(name)[0]}.blp') if name else None
        if found:
            key = self.key()
            record['TextureFiles'] = {str(key): [{'FileDataId': found, 'Gender': 3, 'Class': 0, 'Race': 0, 'ExtraData': 0}]}
            record['ComponentTextures'] = {str(CAPE_REGION): key}
        else:
            notes.append(f'cape texture {name or "(none)"} not found')
        return record, notes

    def with_model(self, display_id, slot, item):
        """Shoulders (left and right models), weapons, shields and ranged."""
        row, s, notes = self.assets.rows[display_id], self.assets.string, []
        record = empty_record(item['slot'], item['classs'], item['subclass'], row[6:9])
        sides = (0, 1) if slot == 3 else (0,)
        key, entries, texture = None, [], None
        for side in sides:
            name = s(row[1 + side])
            if not name:
                notes.append(f'no {"left" if side == 0 else "right"} model named')
                continue
            base = os.path.splitext(name)[0]
            folders = ['Shoulder'] if slot == 3 else list(local_audit.WEAPON_DIRS)
            folder = next((d for d in folders if self.client.has(f'Item/ObjectComponents/{d}/{base}.m2')), None)
            built = self.model(f'Item/ObjectComponents/{folder}/{base}.m2') if folder else None
            if not built:
                notes.append(f'model {base} not found or not convertible')
                continue
            entries.append({'FileDataId': built[0], 'Gender': 2, 'Class': 0, 'Race': 0,
                            'ExtraData': side if slot == 3 else -1, '_verify': built[1]})
            if built[1].get('note'):
                notes.append(f'{base}: {built[1]["note"]}')
            tex = s(row[3 + side])
            if re.fullmatch(r'\d_null', os.path.splitext(tex)[0], re.I):
                tex = ''                                   # the client's 'no texture' placeholder
            if tex and texture is None and built[2]:     # an override is only needed when the model has an object-skin slot
                texture = self.texture_id(f'Item/ObjectComponents/{folder}/{os.path.splitext(tex)[0]}.blp')
                if not texture:
                    notes.append(f'texture {tex} not found')
        if entries:
            key = self.key()
            record['ModelFiles'] = {str(key): entries}
            record['ComponentModels'] = {'0': key, '1': key} if slot == 3 else {'0': key}
        if texture:
            record['Textures'] = {'2': texture}
        return record, notes


    def helm(self, display_id, item):
        """Helm record for all ten races: one model per race and sex (the client's own Head models), plus the client's hide rules."""
        row, s, notes = self.assets.rows[display_id], self.assets.string, []
        record = empty_record(item['slot'], item['classs'], item['subclass'], row[6:9])
        name = s(row[1])
        if not name:
            return record, ['no helm model named']
        base, entries, first, skin_slot = os.path.splitext(name)[0], [], None, False
        hide = {0: [], 1: []}
        for race, code in HELM_RACES.items():
            for gender, sex in ((0, 'M'), (1, 'F')):
                built = self.model(f'Item/ObjectComponents/Head/{base}_{code}{sex}.m2')
                if not built:
                    notes.append(f'no helm model for race {race} gender {gender}')
                    continue
                first = first or built
                entries.append({'FileDataId': built[0], 'Gender': gender, 'Class': 0, 'Race': race, 'ExtraData': -1, '_verify': built[1]})
                for group in self.vis.hide_groups(display_id, race, gender):
                    hide[gender].append({'RaceId': race, 'GeosetGroup': group, 'RaceBitSelection': 0})
        if entries:
            key = self.key()
            record['ModelFiles'] = {str(key): entries}
            record['ComponentModels'] = {'0': key}
            record['Item']['HideGeosetMale'] = hide[0] or None
            record['Item']['HideGeosetFemale'] = hide[1] or None
            tex = s(row[3])
            if tex and first[2]:
                texture = self.texture_id(f'Item/ObjectComponents/Head/{os.path.splitext(tex)[0]}.blp')
                if texture:
                    record['Textures'] = {'2': texture}
                else:
                    notes.append(f'texture {tex} not found')
        return record, notes

    def build(self, display_id, slot, item):
        if display_id not in self.assets.rows:
            return None, ['display id not in ItemDisplayInfo.dbc']
        if slot == 1:
            return self.helm(display_id, item)
        if slot in local_audit.BODY:
            return self.armor(display_id, slot, item)
        if slot == 16:
            return self.cape(display_id, item)
        return self.with_model(display_id, slot, item)


def jobs(displays_path):
    """Unique (viewer slot, display id) -> a representative catalogue item, sorted."""
    displays = json.load(open(displays_path))
    catalogue = json.load(open(local_audit.CATALOGUE, encoding='utf-8'))
    by_id = {i['id']: i for i in catalogue}
    found = {}
    for slot_id, _, types in local_audit.SLOTS:
        for item in catalogue:
            if item.get('slot') in types and item.get('classs') in (2, 4) and str(item['id']) in displays:
                v = local_audit.viewer_slot(slot_id, item)
                found.setdefault((v, displays[str(item['id'])]['displayId']), item)
    return sorted(found.items())


def shape(record):
    """Structure used for the oracle comparison."""
    comp = record.get('ComponentTextures') or {}
    files = record.get('TextureFiles') or {}
    regions = {r: tuple(sorted(e['Gender'] for e in files.get(str(k), []))) for r, k in comp.items()}
    mf = record.get('ModelFiles') or {}
    models = sorted((e['Gender'], e['ExtraData'], e['Race']) for v in mf.values() for e in v if e['Race'] <= 8)   # Zam has no Goblin or Blood Elf helm models
    item = record['Item']
    return {'regions': regions, 'geosets': item['GeosetGroup'], 'type': (item['InventoryType'], item['ItemClass'], item['ItemSubClass']),
            'models': models, 'componentModels': sorted((record.get('ComponentModels') or {}).keys()),
            'textures': sorted((record.get('Textures') or {}).keys()),
            'hide': sorted((g, h['RaceId'], h['GeosetGroup']) for g, k in ((0, 'HideGeosetMale'), (1, 'HideGeosetFemale')) for h in (item[k] or []) if h['RaceId'] <= 8)}


def zam_record(slot, display_id):
    cache = os.path.join(OUT, 'zam-meta', f'{slot}_{display_id}.json')
    if os.path.exists(cache):
        return json.load(open(cache))
    url = 'https://wow.zamimg.com/modelviewer/classic/' + meta_path(slot, display_id)
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'local-model-audit'}), timeout=20).read()
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    open(cache, 'wb').write(data)
    return json.loads(data)


def oracle(client, assets, displays_path, limit=None):
    presence = json.load(open(os.path.join(OUT, 'zam-presence.json')))
    builder = Builder(client, assets, keep_files=False)
    stats, mismatches = {}, []
    for (slot, display_id), item in jobs(displays_path):
        if not presence.get(f'{slot}:{display_id}'):
            continue
        record, _ = builder.build(display_id, slot, item)
        if record is None:
            continue
        mine, theirs = shape(record), shape(zam_record(slot, display_id))
        bucket = stats.setdefault(slot, {'compared': 0, 'same': 0, 'fields': {}})
        bucket['compared'] += 1
        # 'type' is excluded: Zam's belongs to its own item for the display, ours to a catalogue item that shares it.
        diff = [k for k in mine if k != 'type' and mine[k] != theirs[k]]
        for k in diff:
            bucket['fields'][k] = bucket['fields'].get(k, 0) + 1
        if diff:
            if len(mismatches) < 400:
                mismatches.append({'slot': slot, 'display': display_id, 'fields': diff, 'mine': {k: mine[k] for k in diff},
                                   'zam': {k: theirs[k] for k in diff}})
        else:
            bucket['same'] += 1
    return stats, mismatches


def extra(argv):
    """Second pass over an existing item overlay: every pair it built with gaps or not at all is built again with the current code (a fixed name
    lookup, for instance); a pair that now builds with no gap is written to <out folder> with ids that continue after the existing overlay's.
    Pairs that still have gaps are left as they were. Nothing in the existing overlay changes except the record files that are replaced."""
    if len(argv) != 3:
        print(__doc__)
        return 2
    data_dir, out_dir, existing = argv
    client = octo_mpq.Client(data_dir)
    assets = local_audit.Assets(client)
    presence = json.load(open(os.path.join(OUT, 'zam-presence.json')))
    before = {(e['slot'], e['displayId']): e for e in json.load(open(os.path.join(existing, 'manifest.json')))['built']}
    builder = Builder(client, assets, after=existing)
    done, still = [], []
    for (slot, display_id), item in jobs(os.path.join(OUT, 'item-displays.json')):
        old = before.get((slot, display_id))
        if presence.get(f'{slot}:{display_id}') is not False or (old and old['status'] == 'built'):
            continue
        record, notes = builder.build(display_id, slot, item)
        entry = {'slot': slot, 'displayId': display_id, 'exampleItem': [item['id'], item['name']], 'notes': notes, 'was': old['status'] if old else 'absent'}
        has = record is not None and bool(record['ComponentTextures'] or record['ComponentModels'] or record['Textures'])
        if has and not notes:
            entry['verify'] = [e.pop('_verify') for v in (record['ModelFiles'] or {}).values() for e in v]
            entry['status'] = 'built'
            path = os.path.join(out_dir, meta_path(slot, display_id))
            os.makedirs(os.path.dirname(path), exist_ok=True)
            json.dump(record, open(path, 'w'))
            done.append(entry)
        else:
            entry['status'] = 'unchanged'
            still.append(entry)
    for rel, blob in builder.files.items():
        path = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(blob)
    json.dump({'built': done, 'unchanged': len(still), 'failures': builder.failures, 'files': len(builder.files), 'after': existing},
              open(os.path.join(out_dir, 'manifest.json'), 'w'), indent=1)
    print(f'{len(done)} pairs now build completely ({sum(1 for e in done if e["was"] == "built with gaps")} had gaps, {sum(1 for e in done if e["was"] != "built with gaps")} were not built); '
          f'{len(still)} still have gaps; {len(builder.files)} files; failures {len(builder.failures)}')
    return 0


def main(argv):
    if len(argv) < 2 or argv[0] not in ('build', 'oracle', 'extra'):
        print(__doc__)
        return 2
    if argv[0] == 'extra':
        return extra(argv[1:])
    client = octo_mpq.Client(argv[1])
    assets = local_audit.Assets(client)
    displays_path = os.path.join(OUT, 'item-displays.json')
    if argv[0] == 'oracle':
        stats, mismatches = oracle(client, assets, displays_path)
        json.dump({'stats': stats, 'mismatches': mismatches}, open(os.path.join(OUT, 'oracle-report.json'), 'w'), indent=1)
        for slot, b in sorted(stats.items()):
            print(f'slot {slot}: {b["same"]}/{b["compared"]} structurally identical to Zam; differing fields {b["fields"]}')
        return 0
    out_dir = argv[2] if len(argv) > 2 else os.path.join(OUT, 'items-overlay')
    presence = json.load(open(os.path.join(OUT, 'zam-presence.json')))
    builder = Builder(client, assets)
    manifest = []
    for (slot, display_id), item in jobs(displays_path):
        if presence.get(f'{slot}:{display_id}') is not False:
            continue
        record, notes = builder.build(display_id, slot, item)
        entry = {'slot': slot, 'displayId': display_id, 'exampleItem': [item['id'], item['name']], 'notes': notes}
        if record is None:
            entry['status'] = 'not built'
        else:
            verify = [e.pop('_verify') for v in (record['ModelFiles'] or {}).values() for e in v]
            entry['verify'] = verify
            has = bool(record['ComponentTextures'] or record['ComponentModels'] or record['Textures'])
            entry['status'] = ('built' if has and not notes else 'built with gaps' if has else 'not built')
            if has:
                path = os.path.join(out_dir, meta_path(slot, display_id))
                os.makedirs(os.path.dirname(path), exist_ok=True)
                json.dump(record, open(path, 'w'))
        manifest.append(entry)
    for rel, blob in builder.files.items():
        path = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(blob)
    json.dump({'built': manifest, 'failures': builder.failures, 'files': len(builder.files)},
              open(os.path.join(out_dir, 'manifest.json'), 'w'), indent=1)
    from collections import Counter
    print(dict(Counter(e['status'] for e in manifest)), 'files', len(builder.files), 'failures', len(builder.failures))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
