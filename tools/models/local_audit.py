"""Local model audit for the Dressing Room (no network, no browser).

    python tools/models/local_audit.py <Data folder> <WDB folder> [out json]

The in-browser audit (see git history of this file's parent task) asks the appearance Worker for each item's display ids and then asks
Zam's Classic model library whether the files exist. This tool answers the same question from the client instead:

  item id -> display id    from the client's item cache (WDB/itemcache.wdb; the client has no Item.dbc)
  display id -> asset names from ItemDisplayInfo.dbc (newest archive wins)
  asset names -> files      checked in every client archive, newest first (octo_mpq.Client, which reads the encrypted patches)

It reproduces the Dressing Room's item/slot list exactly (state.mjs: SLOTS, filterItems, viewerSlot). It cannot reproduce the 'estimated by
name' or 'estimated by icon' classes, because those depend on Wowhead Classic display ids and on what Zam's library holds, neither of which
is on disk. Matching by name or icon is never used here as evidence. Result classes per item and slot:

  exact       display id known, ItemDisplayInfo row found, every asset it names exists in the client for both sexes
  partial     some, but not all, of the named assets exist (a texture for one sex, a helm model for some races, ...)
  missing     display id known but the ItemDisplayInfo row or all its assets are absent from the client
  unresolved  this tool cannot tell: no display id on disk for the item (it is not in the item cache)

Output stays local (tools/models/out is git-ignored); it names client files, so do not commit or publish it.
"""
import json
import os
import re
import struct
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import octo_mpq  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CATALOGUE = os.path.join(ROOT, 'docs', 'sim', 'data', 'items', 'catalogue.json')

# docs/outfitter/state.mjs SLOTS: (dressing room slot id, name, inventory types it accepts)
SLOTS = [(1, 'Head', [1]), (3, 'Shoulder', [3]), (15, 'Back', [16]), (5, 'Chest', [5, 20]), (4, 'Shirt', [4]), (19, 'Tabard', [19]),
         (9, 'Wrist', [9]), (10, 'Hands', [10]), (6, 'Waist', [6]), (7, 'Legs', [7]), (8, 'Feet', [8]),
         (16, 'Main hand', [13, 17, 21]), (17, 'Off hand', [13, 14, 22, 23]), (18, 'Ranged', [15, 25, 26])]

# ItemDisplayInfo.dbc (23 fields): 1-2 model L/R, 3-4 model texture L/R, 5 icon, 6-8 geoset groups, 9 flags, 10 spell visual, 11 group sound,
# 12-13 helmet geoset vis (m/f), 14-21 body textures, 22 item visual. Geoset fields checked against Zam's own records (item_overlay.py oracle).
TEXTURES = {14: 'ArmUpperTexture', 15: 'ArmLowerTexture', 16: 'HandTexture', 17: 'TorsoUpperTexture',
            18: 'TorsoLowerTexture', 19: 'LegUpperTexture', 20: 'LegLowerTexture', 21: 'FootTexture'}
# Which body textures each viewer slot draws.
BODY = {5: (14, 15, 17, 18), 4: (14, 15, 17, 18), 19: (14, 15, 17, 18), 9: (15,), 10: (15, 16), 6: (18, 19), 7: (19, 20), 8: (20, 21)}
# Belts keep their texture in the torso-lower and leg-upper fields (checked against the rows: 'Leather_A_04Black_Belt_LU').
# Robes (inventory type 20) also draw the leg textures.
ROBE_EXTRA = (19, 20)
HEAD_SUFFIX = [f'{r}{s}' for r in ('Hu', 'Or', 'Dw', 'Ni', 'Sc', 'Ta', 'Gn', 'Tr', 'Go', 'Be') for s in ('M', 'F')]
WEAPON_DIRS = ('Weapon', 'Shield', 'Ammo', 'Quiver', 'Pouch')


def viewer_slot(slot_id, item):
    if slot_id == 16:
        return 21
    if slot_id == 17:
        return 22
    if slot_id == 18:
        return 26
    return 5 if item['slot'] == 20 else item['slot']


def load_itemcache(path):
    """item id -> (class, subclass, display id, quality) from the client's item cache (WDB, build 5875 layout)."""
    data = open(path, 'rb').read()
    pos, out = 20, {}
    while pos + 8 <= len(data):
        item_id, size = struct.unpack_from('<II', data, pos)
        if size == 0 or pos + 8 + size > len(data):
            break
        body = data[pos + 8:pos + 8 + size]
        cls, sub = struct.unpack_from('<II', body, 0)
        q = 8
        for _ in range(4):
            q = body.index(b'\0', q) + 1
        display, quality = struct.unpack_from('<II', body, q)
        out[item_id] = (cls, sub, display, quality)
        pos += 8 + size
    return out


class Assets:
    def __init__(self, client):
        self.client, self.cache = client, {}
        data = client.read('DBFilesClient/ItemDisplayInfo.dbc')
        _, n, fields, size, _ = struct.unpack_from('<4s4I', data, 0)
        self.rows, self._data, self._base = {}, data, 20 + n * size
        for i in range(n):
            row = struct.unpack_from(f'<{fields}I', data, 20 + i * size)
            self.rows[row[0]] = row

    def string(self, offset):
        if not offset:
            return ''
        start = self._base + offset
        return self._data[start:self._data.index(b'\0', start)].decode('latin1')

    def has(self, path):
        if path not in self.cache:
            self.cache[path] = self.client.has(path)
        return self.cache[path]

    def texture(self, folder, name, found):
        """Looks for <name>_M/_F/_U.blp (or plain <name>.blp). Returns (male ok, female ok); records paths in found."""
        base = os.path.splitext(name)[0]
        paths = {s: f'Item/TextureComponents/{folder}/{base}_{s}.blp' for s in 'MFU'}
        ok = {s: self.has(p) for s, p in paths.items()}
        for s, p in paths.items():
            if ok[s]:
                found.append(p)
        return ok['M'] or ok['U'], ok['F'] or ok['U']

    def component_texture(self, folder, name, found):
        path = f'Item/ObjectComponents/{folder}/{os.path.splitext(name)[0]}.blp'
        if self.has(path):
            found.append(path)
            return True
        return False


def check(assets, display_id, slot, inventory_type=0):
    """Returns (status, detail dict). status is exact, partial or missing."""
    row = assets.rows.get(display_id)
    if row is None:
        return 'missing', {'reason': 'display id not in ItemDisplayInfo.dbc'}
    s = assets.string
    model = [s(row[1]), s(row[2])]
    mtex = [s(row[3]), s(row[4])]
    found, wanted, have = [], [], []     # wanted/have: labelled asset checks
    detail = {'itemDisplayInfo': {'modelL': model[0], 'modelR': model[1], 'textureL': mtex[0], 'textureR': mtex[1],
                                  'geosetGroups': [row[6], row[7], row[8]], 'flags': row[9], 'helmetGeosetVis': [row[12], row[13]],
                                  'bodyTextures': {TEXTURES[i]: s(row[i]) for i in TEXTURES if s(row[i])}}}

    def need(label, ok):
        wanted.append(label)
        if ok:
            have.append(label)

    if slot in BODY:
        for i in BODY[slot] + (ROBE_EXTRA if inventory_type == 20 else ()):
            name = s(row[i])
            if name:
                male, female = assets.texture(TEXTURES[i], name, found)
                need(f'{TEXTURES[i]}:{name}:male', male)
                need(f'{TEXTURES[i]}:{name}:female', female)
        if slot == 5 and 19 not in BODY[5]:
            pass
        # Belts: the display row's model fields are not used by the 1.12 client (buckles are textures); some rows name unrelated
        # models (a shoulder or helm), so a belt's model is recorded in itemDisplayInfo but never required.
    elif slot == 1:
        if model[0]:
            base = os.path.splitext(model[0])[0]
            races = [x for x in HEAD_SUFFIX if assets.has(f'Item/ObjectComponents/Head/{base}_{x}.m2')]
            found += [f'Item/ObjectComponents/Head/{base}_{x}.m2' for x in races]
            need(f'Head model:{base}:all 20 race/sex variants', len(races) == len(HEAD_SUFFIX))
            if races and len(races) < len(HEAD_SUFFIX):
                detail['headVariantsFound'] = races
            if mtex[0]:
                ok = assets.component_texture('Head', mtex[0], found)
                need(f'Head texture:{mtex[0]}', ok)
    elif slot == 3:
        for k in (0, 1):
            if model[k]:
                base = os.path.splitext(model[k])[0]
                path = f'Item/ObjectComponents/Shoulder/{base}.m2'
                ok = assets.has(path)
                if ok:
                    found.append(path)
                need(f'Shoulder model:{base}', ok)
            if mtex[k]:
                need(f'Shoulder texture:{mtex[k]}', assets.component_texture('Shoulder', mtex[k], found))
    elif slot == 16:                    # back: the viewer slot is the inventory type (16), not the Dressing Room slot id (15)
        if mtex[0]:
            need(f'Cape texture:{mtex[0]}', assets.component_texture('Cape', mtex[0], found))
    elif slot in (21, 22, 26):
        if model[0]:
            base = os.path.splitext(model[0])[0]
            folder = next((d for d in WEAPON_DIRS if assets.has(f'Item/ObjectComponents/{d}/{base}.m2')), None)
            need(f'Weapon model:{base}', folder is not None)
            if folder:
                found.append(f'Item/ObjectComponents/{folder}/{base}.m2')
                if mtex[0]:
                    need(f'Weapon texture:{mtex[0]}', assets.component_texture(folder, mtex[0], found))
            elif mtex[0]:
                need(f'Weapon texture:{mtex[0]}', False)
    detail['required'] = wanted
    detail['present'] = have
    detail['missingAssets'] = [w for w in wanted if w not in have]
    detail['foundFiles'] = found
    if not wanted:
        detail['reason'] = 'the display row names no assets for this slot'
        return 'missing', detail
    if len(have) == len(wanted):
        return 'exact', detail
    return ('partial' if have else 'missing'), detail


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    data_dir, wdb_dir = argv[0], argv[1]
    out_path = argv[2] if len(argv) > 2 else os.path.join(ROOT, 'tools', 'models', 'out', 'outfitter-model-audit.json')
    catalogue = json.load(open(CATALOGUE, encoding='utf-8'))
    cache = load_itemcache(os.path.join(wdb_dir, 'itemcache.wdb'))
    assets = Assets(octo_mpq.Client(data_dir))
    jobs, seen = [], set()
    for slot_id, slot_name, types in SLOTS:
        items = sorted((i for i in catalogue if i.get('slot') in types and i.get('classs') in (2, 4)), key=lambda i: (i['name'].lower(), i['id']))
        for item in items:
            v = viewer_slot(slot_id, item)
            if (item['id'], v) not in seen:
                seen.add((item['id'], v))
                jobs.append((item, slot_id, slot_name, v))
    results = []
    for item, slot_id, slot_name, v in jobs:
        cached = cache.get(item['id'])
        display = cached[2] if cached else None
        row = {'itemId': item['id'], 'name': item['name'], 'inventorySlot': item['slot'], 'dressingRoomSlotId': slot_id,
               'dressingRoomSlot': slot_name, 'viewerSlot': v, 'classId': item['classs'], 'subclass': item['subclass'],
               'icon': item.get('icon'), 'dbUrl': f"https://octowow.st/db/?item={item['id']}", 'displayId': display}
        if display is None:
            row.update(kind='unresolved', reason='no display id on disk: item is not in WDB/itemcache.wdb')
        elif display == 0:
            row.update(kind='unresolved', reason='item cache lists display id 0')
        else:
            kind, detail = check(assets, display, v, item['slot'])
            row.update(kind=kind, **detail)
        results.append(row)
    results.sort(key=lambda r: (r['itemId'], r['viewerSlot']))
    counts = Counter(r['kind'] for r in results)
    flagged = [r for r in results if r['kind'] != 'exact']
    report = {
        'createdAt': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
        'source': 'local client files (tools/models/local_audit.py); no network requests',
        'scope': 'full-dressing-room', 'catalogueItems': len(catalogue), 'checked': len(results),
        'checkedItems': len({r['itemId'] for r in results}), 'itemCacheEntries': len(cache),
        'classCounts': dict(counts),
        'limits': ['"estimated by name/icon" is not reproducible locally: it depends on Wowhead Classic display ids and on what the Zam '
                   'Classic library contains. Name and icon matches are never used as evidence here.',
                   'Display ids come from the client item cache; items never seen by this client are unresolved, not missing.'],
        'flagged': flagged,
        'missing': [r for r in results if r['kind'] == 'missing'],
        'partial': [r for r in results if r['kind'] == 'partial'],
        'estimated': [],
        'unverified': [r for r in results if r['kind'] == 'unresolved'],
    }
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as handle:
        json.dump(report, handle, indent=1)
    print(json.dumps({k: report[k] for k in ('checked', 'checkedItems', 'itemCacheEntries', 'classCounts')}))
    print('wrote', out_path)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
