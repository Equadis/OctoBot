"""Custom OctoWoW looks for shoulders, weapons, shields and ranged weapons: slots that wear a 3D model with one texture.

    python tools/models/custom_props.py <Data folder> <out folder> <missing.json>

missing.json comes from find_missing_displays.py. For each display id this writes an item record in the shape Zam's viewer reads
(meta/armor/3/<id>.json for shoulders, meta/item/<id>.json for the rest), the converted models and the textures.

How a record is built (checked against Zam's records for Pauldrons of Might, Thunderfury and a bow: same number of models, same ExtraData for
left and right, same texture type):
  * ItemDisplayInfo.dbc names a left and a right model (columns 1 and 2) and a texture (column 3). Shoulders: Item\\ObjectComponents\\Shoulder\\<name>.m2
    for each side, ExtraData 0 and 1. Weapons, shields and ranged: Item\\ObjectComponents\\Weapon\\ or ...\\Shield\\<name>.m2, one model, ExtraData -1.
  * The model's own "object skin" slot (texture type 2) is filled from the display's texture, written as Textures {"2": id}. Textures the model
    names itself (spell glows, reflections) are converted and shared.
File ids: models from FIRST_MODEL_ID, textures from FIRST_TEXTURE_ID, in sorted order. Output stays local; nothing is published.
"""
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blp  # noqa: E402
import helms  # noqa: E402
import m2v274  # noqa: E402
import octo_mpq  # noqa: E402

FIRST_MODEL_ID = 10200000
MODEL_STRIDE = 10
FIRST_TEXTURE_ID = 10300000
OBJECT_SKIN_TYPE = 2
WEAPON_FOLDERS = ('Weapon', 'Shield')
SHOULDER_SLOT = 3
PROP_SLOTS = {13, 14, 15, 17, 21, 22, 23, 25, 26}          # inventory types that use meta/item/<id>.json


class PropBuilder:
    def __init__(self, client, first_model=FIRST_MODEL_ID, first_texture=FIRST_TEXTURE_ID):
        self.client = client
        self.info = helms.DisplayInfo(client)
        self.next_model, self.next_texture = first_model, first_texture
        self.textures = {}
        self.failed = {}
        self.missing_textures = []
        self.skipped = {}

    def _texture_id(self, path):
        key = path.upper().replace('/', '\\')
        if key not in self.textures:
            self.textures[key] = self.next_texture
            self.next_texture += 1
        return self.textures[key]

    def _convert(self, path):
        """(file ids, files) for one client model, or None (the reason is kept in self.failed)."""
        data = self.client.read(path)
        if data is None:
            return None
        first = self.next_model
        try:
            files, ids = m2v274.convert(data, first, texture_id_for=self._texture_id)
        except (ValueError, KeyError, struct.error, NotImplementedError) as error:
            self.failed[path] = f'{type(error).__name__}: {error}'
            return None
        self.next_model += MODEL_STRIDE
        return ids, files

    def _name(self, column, display_id):
        offset = self.info.rows[display_id][column]
        name = self.info.string(offset) if offset else ''
        return name.rsplit('.', 1)[0] if name else ''

    def _item_texture(self, display_id, folders):
        name = self._name(3, display_id)
        if not name:
            return None
        for folder in folders:
            path = f'Item/ObjectComponents/{folder}/{name}.blp'
            if self.client.has(path):
                return self._texture_id(path)
        self.missing_textures.append(name)
        return None

    def _record(self, display_id, inventory_type, item_class, subclass, entries, texture):
        return {
            'Model': 0, 'Textures': {str(OBJECT_SKIN_TYPE): texture} if texture else None, 'Textures2': None, 'TextureFiles': None,
            'ModelFiles': {str(display_id): entries},
            'Item': {'Flags': 0, 'InventoryType': inventory_type, 'ItemClass': item_class, 'ItemSubClass': subclass, 'HideGeosetMale': None,
                     'HideGeosetFemale': None, 'GeosetGroup': [0] * 6, 'AttachGeosetGroup': [0] * 6, 'GeosetGroupOverride': 0, 'ItemVisual': 0, 'ParticleColor': None},
            'Creature': None, 'Character': None, 'ItemEffects': None, 'Equipment': None, 'ComponentTextures': None,
            'ComponentModels': None, 'StateKits': None, 'Decor': None, 'Scale': 1,
        }

    def shoulder(self, display_id, subclass=0):
        if display_id not in self.info.rows:
            self.skipped[display_id] = 'the display id is not in ItemDisplayInfo.dbc'
            return None
        entries, files = [], {}
        for side, column in ((0, 1), (1, 2)):
            name = self._name(column, display_id)
            result = self._convert(f'Item/ObjectComponents/Shoulder/{name}.m2') if name else None
            if result is None:
                self.skipped[display_id] = f'the client has no usable shoulder model for side {side}'
                return None
            ids, out = result
            files.update(out)
            entries.append({'FileDataId': ids['model'], 'Gender': 2, 'Class': 0, 'Race': 0, 'ExtraData': side})
        record = self._record(display_id, SHOULDER_SLOT, 4, subclass, entries, self._item_texture(display_id, ('Shoulder',)))
        record['ComponentModels'] = {'0': display_id, '1': display_id}
        return record, files

    def prop(self, display_id, inventory_type, item_class=2, subclass=0):
        if display_id not in self.info.rows:
            self.skipped[display_id] = 'the display id is not in ItemDisplayInfo.dbc'
            return None
        name = self._name(1, display_id)
        if not name:
            self.skipped[display_id] = 'the display id names no model'
            return None
        result = None
        for folder in WEAPON_FOLDERS:
            result = self._convert(f'Item/ObjectComponents/{folder}/{name}.m2')
            if result:
                break
        if result is None:
            self.skipped[display_id] = f'the client has no usable model {name}'
            return None
        ids, files = result
        entries = [{'FileDataId': ids['model'], 'Gender': 2, 'Class': 0, 'Race': 0, 'ExtraData': -1}]
        record = self._record(display_id, inventory_type, item_class, subclass, entries, self._item_texture(display_id, WEAPON_FOLDERS))
        record['ComponentModels'] = {'0': display_id}
        return record, files

    def texture_files(self):
        out = {}
        for path, texture_id in sorted(self.textures.items(), key=lambda kv: kv[1]):
            data = self.client.read(path.replace('\\', '/'))
            if data is None:
                self.missing_textures.append(path)
            else:
                out[f'textures/{texture_id}.webp'] = blp.blp_to_webp(data)[0]
        return out


def wanted_from_missing(missing, catalogue):
    """[(path of the record, display id, inventory type, item class, subclass)] from find_missing_displays.py output."""
    by_id = {item['id']: item for item in catalogue}
    wanted = []
    for key, item_ids in missing.items():
        kind, slot, display = key.split(':')
        item = next((by_id[i] for i in item_ids if i in by_id), None)
        if not item:
            continue
        inventory = item.get('slot')
        if kind == 'armor' and int(slot) == SHOULDER_SLOT:
            wanted.append(('shoulder', int(display), SHOULDER_SLOT, 4, item.get('subclass', 0) or 0))
        elif kind == 'item' and inventory in PROP_SLOTS:
            wanted.append(('prop', int(display), inventory, item.get('classs', 2) or 2, item.get('subclass', 0) or 0))
    return wanted


def build_all(client, wanted, write, log=print):
    builder = PropBuilder(client)
    built = {}
    for kind, display_id, inventory, item_class, subclass in sorted(set(wanted)):
        result = builder.shoulder(display_id, subclass) if kind == 'shoulder' else builder.prop(display_id, inventory, item_class, subclass)
        if result is None:
            continue
        record, files = result
        for rel, blob in files.items():
            write(rel, blob)
        path = f'meta/armor/{SHOULDER_SLOT}/{display_id}.json' if kind == 'shoulder' else f'meta/item/{display_id}.json'
        write(path, json.dumps(record, sort_keys=True).encode())
        built[path] = len(record['ModelFiles'][str(display_id)])
    for rel, blob in builder.texture_files().items():
        write(rel, blob)
    summary = {'records': built, 'skipped': {str(k): v for k, v in builder.skipped.items()}, 'failed_models': builder.failed,
               'missing_textures': sorted(set(builder.missing_textures)), 'textures': len(builder.textures)}
    log(f'shoulders and weapons: {len(built)} records, {len(builder.skipped)} skipped, {len(builder.failed)} unusable models, {len(builder.textures)} textures')
    return summary


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, '..', '..', 'docs', 'sim', 'data', 'items', 'catalogue.json'), encoding='utf8') as handle:
        catalogue = json.load(handle)
    with open(argv[2]) as handle:
        wanted = wanted_from_missing(json.load(handle), catalogue)

    def write(rel, blob):
        path = os.path.join(argv[1], rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as out:
            out.write(blob)
    summary = build_all(octo_mpq.Client(argv[0]), wanted, write)
    with open(os.path.join(argv[1], 'custom-props.json'), 'w') as out:
        json.dump(summary, out, indent=1, sort_keys=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
