"""Custom OctoWoW looks for the body-armour slots that use only textures: chest, shirt, tabard, wrists, gloves, belt, legs and boots.

    python tools/models/custom_gear.py <Data folder> <out folder> <missing.json>

missing.json comes from find_missing_displays.py: {"armor:<viewer slot>:<display id>": [item ids]}. For each display id this writes a complete
item record to meta/armor/<slot>/<display id>.json in the shape Zam's viewer reads, and the textures it names as lossless WebP.

How a record is built (checked against Zam's own records for seven Classic items, one per slot: the regions, the texture files and the
genders came out identical):
  * ItemDisplayInfo.dbc names up to eight texture regions per display (upper arm, lower arm, hand, upper torso, lower torso, upper leg,
    lower leg, foot); region i is column 14 + i. A name N is a file Item\\TextureComponents\\<Region>Texture\\N_U.blp (one texture for both
    sexes) or N_M.blp and N_F.blp. They become ComponentTextures {region: texture id} and TextureFiles {texture id: [file, sex]}.
  * Geoset groups come from columns 7 to 9 as the client states them. Zam's records give gloves and boots a geoset value (1 to 3) that the
    client's table does not contain for any display, so those silhouettes may differ from the game; nothing is guessed to fill the gap.
File ids are invented from FIRST_TEXTURE_ID upward in sorted order and shared between displays that use the same file.
Output stays local; nothing derived from client files is published (see the rules in README.md).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blp  # noqa: E402
import helms  # noqa: E402
import octo_mpq  # noqa: E402

FIRST_TEXTURE_ID = 10100000
REGION_FOLDERS = ['ArmUpperTexture', 'ArmLowerTexture', 'HandTexture', 'TorsoUpperTexture', 'TorsoLowerTexture', 'LegUpperTexture', 'LegLowerTexture', 'FootTexture']
FIRST_REGION_COLUMN = 14
GEOSET_COLUMNS = (7, 8, 9)
TEXTURE_SLOTS = {4: 'shirt', 5: 'chest', 6: 'waist', 7: 'legs', 8: 'feet', 9: 'wrist', 10: 'hands', 19: 'tabard'}
UNISEX, MALE, FEMALE = 3, 0, 1


class TextureSlots:
    def __init__(self, client, first_texture=FIRST_TEXTURE_ID):
        self.client = client
        self.info = helms.DisplayInfo(client)
        self.next_texture = first_texture
        self.textures = {}              # client path (as looked up) -> file id
        self.missing = []               # texture paths the display names but the client lacks
        self.skipped = {}               # display id -> why it has no record

    def _id(self, path):
        if path not in self.textures:
            self.textures[path] = self.next_texture
            self.next_texture += 1
        return self.textures[path]

    def _region_files(self, region, name):
        """[(file id, sex)] for one named texture, or [] when the client has none of its variants."""
        base = f'Item/TextureComponents/{REGION_FOLDERS[region]}/{name}'
        if self.client.has(f'{base}_U.blp'):
            return [(f'{base}_U.blp', UNISEX)]
        male, female = self.client.has(f'{base}_M.blp'), self.client.has(f'{base}_F.blp')
        if male and female:
            return [(f'{base}_M.blp', MALE), (f'{base}_F.blp', FEMALE)]
        if male or female:                      # one sex only: both wear it
            return [(f'{base}_{"M" if male else "F"}.blp', UNISEX)]
        return []

    def build(self, display_id, inventory_type, subclass=0):
        """Returns the item record (files are written by texture_files) or None; the reason is kept in self.skipped."""
        row = self.info.rows.get(display_id)
        if row is None:
            self.skipped[display_id] = 'the display id is not in ItemDisplayInfo.dbc'
            return None
        components, files = {}, {}
        for region in range(8):
            offset = row[FIRST_REGION_COLUMN + region]
            name = self.info.string(offset) if offset else ''
            if not name:
                continue
            variants = self._region_files(region, name)
            if not variants:
                self.missing.append(f'{REGION_FOLDERS[region]}/{name}')
                continue
            entries = [{'FileDataId': self._id(path), 'Gender': sex, 'Class': 0, 'Race': 0, 'ExtraData': 0} for path, sex in variants]
            key = entries[0]['FileDataId']
            components[str(region)] = key
            files[str(key)] = entries
        if not components:
            self.skipped[display_id] = 'the client has none of the textures this display names'
            return None
        geoset = [row[GEOSET_COLUMNS[0]], row[GEOSET_COLUMNS[2]], row[GEOSET_COLUMNS[1]], 0, 0, 0]
        return {
            'Model': 0, 'Textures': None, 'Textures2': None, 'TextureFiles': files, 'ModelFiles': None,
            'Item': {'Flags': 0, 'InventoryType': inventory_type, 'ItemClass': 4, 'ItemSubClass': subclass, 'HideGeosetMale': None, 'HideGeosetFemale': None,
                     'GeosetGroup': geoset, 'AttachGeosetGroup': [0] * 6, 'GeosetGroupOverride': 0, 'ItemVisual': 0, 'ParticleColor': None},
            'Creature': None, 'Character': None, 'ItemEffects': None, 'Equipment': None,
            'ComponentTextures': components, 'ComponentModels': None, 'StateKits': None, 'Decor': None, 'Scale': 1,
        }

    def texture_files(self):
        out = {}
        for path, texture_id in sorted(self.textures.items(), key=lambda kv: kv[1]):
            data = self.client.read(path)
            if data is not None:
                out[f'textures/{texture_id}.webp'] = blp.blp_to_webp(data)[0]
        return out


def build_all(client, wanted, write, log=print):
    """wanted: [(viewer slot, display id, inventory type, subclass)]. Hands every file to write(relative path, bytes); returns a manifest summary."""
    builder = TextureSlots(client)
    built = {}
    for slot, display_id, inventory_type, subclass in sorted(set(wanted)):
        record = builder.build(display_id, inventory_type, subclass)
        if record is None:
            continue
        write(f'meta/armor/{slot}/{display_id}.json', json.dumps(record, sort_keys=True).encode())
        built[f'{slot}:{display_id}'] = len(record['ComponentTextures'])
    for rel, blob in builder.texture_files().items():
        write(rel, blob)
    summary = {'records': built, 'skipped': {str(k): v for k, v in builder.skipped.items()}, 'missing_textures': sorted(set(builder.missing)),
               'textures': len(builder.textures)}
    log(f'texture-slot gear: {len(built)} records, {len(builder.skipped)} skipped, {len(builder.textures)} textures ({len(set(builder.missing))} named but missing)')
    return summary


def wanted_from_missing(missing, catalogue):
    """Turns find_missing_displays.py output into build_all input, taking inventory type and subclass from the catalogue."""
    by_id = {item['id']: item for item in catalogue}
    wanted = []
    for key, item_ids in missing.items():
        kind, slot, display = key.split(':')
        if kind != 'armor' or int(slot) not in TEXTURE_SLOTS:
            continue
        item = next((by_id[i] for i in item_ids if i in by_id), None)
        if item:
            wanted.append((int(slot), int(display), item.get('slot', int(slot)), item.get('subclass', 0) or 0))
    return wanted


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
    with open(os.path.join(argv[1], 'custom-gear.json'), 'w') as out:
        json.dump(summary, out, indent=1, sort_keys=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
