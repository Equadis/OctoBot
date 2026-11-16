"""Custom OctoWoW helm appearances for every race (README step 7, extended beyond the Goblin and Blood Elf).

    python tools/models/custom_helms.py <Data folder> <out folder> <display id> [<display id> ...]
    python tools/models/custom_helms.py <Data folder> <out folder> --ids-file ids.json

Zam's Classic library has no entry for many OctoWoW helm display ids (for example 67102, the Outland-red look of Crown of Ten Storms), so the
Dressing Room showed "no preview". The client does have them: one model per race and sex named after the item's model plus a race suffix
(Item\\ObjectComponents\\Head\\<model>_HuM.m2 ... _BeF.m2) and the item's texture named in ItemDisplayInfo.dbc.

For each display id this writes, under the out folder:
    meta/armor/1/<display id>.json     a complete item record in the shape Zam's viewer reads (Zam has none for these ids)
    m2/ skin/ skel/                    the helm models converted with m2v274, one per race and sex the client has
    textures/                          the item's own texture and the textures its models name, as lossless WebP

File ids are invented from FIRST_MODEL_ID and FIRST_TEXTURE_ID upward, in sorted order, so a rerun gives the same ids and they never meet the
body (9,000,000+), customisation (9,100,000+) or Goblin and Blood Elf helm (9,500,000+) ranges.
Output stays local; nothing derived from client files is published (see the rules in README.md).
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

FIRST_MODEL_ID = 9700000
MODEL_STRIDE = 10            # model, skin and skel use three ids; the rest are spare
FIRST_TEXTURE_ID = 9900000
RACE_SUFFIX = {1: 'Hu', 2: 'Or', 3: 'Dw', 4: 'Ni', 5: 'Sc', 6: 'Ta', 7: 'Gn', 8: 'Tr', 9: 'Go', 10: 'Be'}
SEX_SUFFIX = {0: 'M', 1: 'F'}
HEAD_FOLDER = 'Item/ObjectComponents/Head/'
# Zam's records name a helm's own texture under texture type 2 (an "object skin"); the models list it as a type 2 slot with no file.
OBJECT_SKIN_TYPE = 2


class CustomHelms:
    def __init__(self, client, first_model=FIRST_MODEL_ID, first_texture=FIRST_TEXTURE_ID):
        self.client = client
        self.info = helms.DisplayInfo(client)
        self.next_model = first_model
        self.next_texture = first_texture
        self.textures = {}          # client texture path (upper case) -> file id
        self.missing_textures = []
        self.failed = {}            # model path -> why it was left out
        self.skipped = {}           # display id -> why it has no record

    def _texture_id(self, path):
        key = path.upper().replace('/', '\\')
        if key not in self.textures:
            self.textures[key] = self.next_texture
            self.next_texture += 1
        return self.textures[key]

    def build(self, display_id):
        """Returns (record, files) for one display id, or None (the reason is kept in self.skipped)."""
        base = self.info.model(display_id)
        if not base:
            self.skipped[display_id] = 'the display id has no model name in ItemDisplayInfo.dbc'
            return None
        entries, files, hide = [], {}, {'HideGeosetMale': [], 'HideGeosetFemale': []}
        for race, race_suffix in sorted(RACE_SUFFIX.items()):
            for sex, sex_suffix in sorted(SEX_SUFFIX.items()):
                path = f'{HEAD_FOLDER}{base}_{race_suffix}{sex_suffix}.m2'
                data = self.client.read(path)
                if data is None:
                    continue
                first = self.next_model
                try:
                    out, ids = m2v274.convert(data, first, texture_id_for=self._texture_id)
                except (ValueError, KeyError, struct.error, NotImplementedError) as error:
                    self.failed[path] = f'{type(error).__name__}: {error}'
                    continue
                self.next_model += MODEL_STRIDE
                files.update(out)
                entries.append({'FileDataId': ids['model'], 'Gender': sex, 'Class': 0, 'Race': race, 'ExtraData': -1})
                field = 'HideGeosetMale' if sex == 0 else 'HideGeosetFemale'
                for group in self.info.hide_groups(display_id, race, sex):
                    hide[field].append({'RaceId': race, 'GeosetGroup': group, 'RaceBitSelection': 0})
        if not entries:
            self.skipped[display_id] = f'the client has no {base}_<race><sex>.m2 model'
            return None
        row = self.info.rows[display_id]
        texture_name = self.info.string(row[3])
        textures = None
        if texture_name:
            path = f'{HEAD_FOLDER}{texture_name}.blp'
            if self.client.read(path) is None:
                self.missing_textures.append(path)
            else:
                textures = {str(OBJECT_SKIN_TYPE): self._texture_id(path)}
        record = {
            'Model': 0, 'Textures': textures, 'Textures2': None, 'TextureFiles': None,
            'ModelFiles': {str(display_id): entries},
            'Item': {'Flags': 0, 'InventoryType': 1, 'ItemClass': 4, 'ItemSubClass': 0,
                     'HideGeosetMale': hide['HideGeosetMale'] or None, 'HideGeosetFemale': hide['HideGeosetFemale'] or None,
                     'GeosetGroup': [0] * 6, 'AttachGeosetGroup': [0] * 6, 'GeosetGroupOverride': 0, 'ItemVisual': 0, 'ParticleColor': None},
            'Creature': None, 'Character': None, 'ItemEffects': None, 'Equipment': None, 'ComponentTextures': None,
            'ComponentModels': {'0': display_id}, 'StateKits': None, 'Decor': None, 'Scale': 1,
        }
        return record, files

    def texture_files(self):
        """{relative path: bytes} for every texture assigned so far; textures the client lacks are listed in missing_textures."""
        out = {}
        for path, tex_id in sorted(self.textures.items(), key=lambda kv: kv[1]):
            data = self.client.read(path.replace('\\', '/'))
            if data is None:
                if path not in self.missing_textures:
                    self.missing_textures.append(path)
                continue
            out[f'textures/{tex_id}.webp'] = blp.blp_to_webp(data)[0]
        return out


def build_all(client, display_ids, write, log=print):
    """Converts every display id and hands each file to write(relative path, bytes). Returns a summary for the manifest."""
    converter = CustomHelms(client)
    built = {}
    for display_id in sorted(set(display_ids)):
        result = converter.build(display_id)
        if result is None:
            continue
        record, files = result
        for rel, blob in files.items():
            write(rel, blob)
        write(f'meta/armor/1/{display_id}.json', json.dumps(record, sort_keys=True).encode())
        built[str(display_id)] = {'model': converter.info.model(display_id), 'races': len(record['ModelFiles'][str(display_id)]),
                                  'texture': bool(record['Textures'])}
    for rel, blob in converter.texture_files().items():
        write(rel, blob)
    summary = {'display_ids': built, 'skipped': {str(k): v for k, v in converter.skipped.items()}, 'failed_models': converter.failed,
               'missing_textures': converter.missing_textures, 'textures': len(converter.textures)}
    log(f'custom helms: {len(built)} display ids built, {len(converter.skipped)} skipped, {len(converter.failed)} unusable models, '
        f'{len(converter.textures)} textures ({len(converter.missing_textures)} missing)')
    return summary


def main(argv):
    ids, args, i = [], [], 0
    while i < len(argv):
        if argv[i] == '--ids-file':
            ids += [int(x) for x in json.load(open(argv[i + 1]))]
            i += 2
        else:
            args.append(argv[i])
            i += 1
    if len(args) < 2 or not (ids or args[2:]):
        print(__doc__)
        return 2
    ids += [int(x) for x in args[2:]]
    client = octo_mpq.Client(args[0])

    def write(rel, blob):
        path = os.path.join(args[1], rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as handle:
            handle.write(blob)
    summary = build_all(client, ids, write)
    with open(os.path.join(args[1], 'custom-helms.json'), 'w') as handle:
        json.dump(summary, handle, indent=1, sort_keys=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
