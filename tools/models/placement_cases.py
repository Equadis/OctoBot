"""Builds the equipment loadouts for the placement test (placement_matrix.mjs).

    python tools/models/placement_cases.py <model overlay folder> <model-recovery-mapping.json> <out cases.json> [--bodies-only]

Every body (10 races x 2 sexes) gets shield + one-hand weapon, dual wield, a two-hand weapon, robe + cloak + shoulders + helm, a held-in-off-hand item and a ranged weapon, each with a
library (Zam) item and a client-recovered one. Three bodies (Human man, Goblin man, High Elf woman) additionally get one item of every weapon, shield and held category, library and
recovered, and a sample of recovered items whose model has blended parts (glows, flames, glass), since those are the ones that can draw wrongly. Ids come from the site's item catalogue and the
recovery audit; nothing here reads the client.
"""
import json
import os
import re
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CATALOGUE = os.path.join(HERE, '..', '..', 'docs', 'sim', 'data', 'items', 'catalogue.json')
THREE = {'hu': (1, 0), 'gb': (9, 0), 'he': (10, 1)}
VIEWS = [{'name': 'front', 'azimuth': 4.712}, {'name': 'left', 'azimuth': 0}, {'name': 'right', 'azimuth': 3.1416}]


def pick(rows, items, slot, subclass=None, klass=None, source='Verified'):
    for row in sorted(rows, key=lambda r: r['itemId']):
        item = items.get(row['itemId'])
        if not item or row['category'] != source or row['viewerSlot'] != slot or item.get('quality', 0) < 1:
            continue
        if subclass is not None and item.get('subclass') != subclass:
            continue
        if klass is not None and item.get('classs') != klass:
            continue
        return item['id']
    return None


def blended_item_displays(folder, limit):
    """Display ids of weapon-like records whose converted model has a blended batch, for a sample of the overlay."""
    out = []
    for name in sorted(os.listdir(os.path.join(folder, 'meta', 'item'))):
        text = open(os.path.join(folder, 'meta', 'item', name), encoding='utf-8').read()
        for model in re.findall(r'"FileDataId": (98\d{5})', text):
            data = open(os.path.join(folder, 'm2', f'{model}.m2'), 'rb').read()
            md = data[8:8 + struct.unpack_from('<I', data, 4)[0]]
            count, offset = struct.unpack_from('<II', md, 0x70)
            if any(struct.unpack_from('<HH', md, offset + 4 * k)[1] >= 2 for k in range(count)):
                out.append(int(name[:-5]))
                break
        if len(out) >= limit * 6:
            break
    return out[::6][:limit]


def slot_for(item, row):
    """The Dressing Room slot an item goes in: ranged 18, off hand 17 (shields and held items), otherwise main hand 16."""
    if row['viewerSlot'] == 26:
        return '18'
    return '17' if item.get('slot') in (14, 23) else '16'


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    if len(args) != 3:
        print(__doc__)
        return 2
    folder, mapping_path, out = args
    items = {i['id']: i for i in json.load(open(CATALOGUE, encoding='utf-8')) if 'slot' in i}
    rows = json.load(open(mapping_path, encoding='utf-8'))['rows']
    by_display = {}
    for row in rows:
        by_display.setdefault(row['displayId'], row)
    gear = {}
    for tag, source in (('ver', 'Verified'), ('rec', 'Recovered')):
        gear[tag] = {
            'sword': pick(rows, items, 21, 7, 2, source), 'dagger': pick(rows, items, 21, 15, 2, source),
            'shield': pick(rows, items, 22, 6, 4, source), 'twohand': pick(rows, items, 21, 8, 2, source),
            'held': pick(rows, items, 22, 0, 4, source), 'bow': pick(rows, items, 26, 2, 2, source), 'gun': pick(rows, items, 26, 3, 2, source),
            'helm': pick(rows, items, 1, None, 4, source), 'shoulder': pick(rows, items, 3, None, 4, source), 'chest': pick(rows, items, 5, None, 4, source),
            'cloak': pick(rows, items, 16, None, 4, source)}
    cases = []
    for r in range(1, 11):
        for g in (0, 1):
            for tag in ('ver', 'rec'):
                w = gear[tag]
                loadouts = {
                    'shield': {'16': w['sword'], '17': w['shield']}, 'dual': {'16': w['sword'], '17': w['dagger']}, 'twohand': {'16': w['twohand']},
                    'robe': {'1': w['helm'], '3': w['shoulder'], '5': w['chest'], '15': w['cloak']}, 'held': {'17': w['held']}}
                for name, slots in loadouts.items():
                    slots = {k: v for k, v in slots.items() if v}
                    if slots:
                        cases.append({'name': f'b{r:02d}{g}-{tag}-{name}', 'race': r, 'gender': g, 'gear': slots, 'views': VIEWS if name == 'shield' else VIEWS[:1]})
                for kind in ('bow', 'gun'):
                    if w[kind]:
                        cases.append({'name': f'b{r:02d}{g}-{tag}-{kind}', 'race': r, 'gender': g, 'gear': {'18': w[kind]}, 'ranged': True})
    if '--bodies-only' not in argv:
        seen = set()
        for row in sorted((x for x in rows if x['category'] in ('Verified', 'Recovered') and x['viewerSlot'] in (21, 22, 26)), key=lambda x: x['itemId']):
            item = items.get(row['itemId'])
            if not item or item.get('quality', 0) < 1:
                continue
            key = (item.get('classs'), item.get('subclass'), row['category'], row['viewerSlot'] == 26)
            if key in seen:
                continue
            seen.add(key)
            slot = slot_for(item, row)
            for body, (r, g) in THREE.items():
                cases.append({'name': f"c-{body}-{item['classs']}-{item['subclass']:02d}-{row['category'][:3].lower()}-{row['itemId']}", 'race': r, 'gender': g,
                              'gear': {slot: item['id']}, 'ranged': slot == '18', 'views': VIEWS[:2]})
        for display in blended_item_displays(folder, 24):
            row = by_display.get(display)
            item = items.get(row['itemId']) if row else None
            if not item:
                continue
            slot = slot_for(item, row)
            for body, (r, g) in THREE.items():
                cases.append({'name': f"x-{body}-{item['id']}", 'race': r, 'gender': g, 'gear': {slot: item['id']}, 'ranged': slot == '18', 'views': VIEWS[:2]})
    json.dump(cases, open(out, 'w'))
    print(len(cases), 'cases')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
