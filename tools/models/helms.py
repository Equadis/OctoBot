"""Helm models for OctoWoW's Goblin and Blood Elf (README step 7).

    python tools/models/helms.py <Data folder> <out folder> <display id> [<display id> ...]

Zam has helm model files for races 1 to 8 only. The client keeps one helm model per race and sex, named after the item's model with a race
suffix (Item\\ObjectComponents\\Head\\<model>_GoM.m2, _GoF, _BeM, _BeF). This looks up each display id in ItemDisplayInfo.dbc, converts the four
race models with m2v274, and writes them under the out folder with invented file ids (from FIRST_HELM_ID up) plus helms.json mapping
display id -> {(race, gender): model file id}. Zam's own helm item data can then be patched with those entries (see viewer_test.py).
Output stays local; nothing derived from client files is published (see the rules in README.md).
"""
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import m2v274  # noqa: E402
import octo_mpq  # noqa: E402

FIRST_HELM_ID = 9500000
STRIDE = 20          # file ids reserved per converted model (model, skin, skel, textures)
RACES = {(9, 0): 'GoM', (9, 1): 'GoF', (10, 0): 'BeM', (10, 1): 'BeF'}


class DisplayInfo:
    def __init__(self, client):
        data = client.read('DBFilesClient/ItemDisplayInfo.dbc')
        _, n, fields, size, strings = struct.unpack_from('<4s4I', data, 0)
        base = 20 + n * size
        self.rows = {}
        for i in range(n):
            row = struct.unpack_from(f'<{fields}I', data, 20 + i * size)
            self.rows[row[0]] = row
        self._data, self._base = data, base

    def string(self, offset):
        return self._data[self._base + offset:self._data.index(b'\0', self._base + offset)].decode('latin1') if offset else ''

    def model(self, display_id):
        """The left model name of a display id, without extension (helms use the left slot), or None."""
        row = self.rows.get(display_id)
        name = self.string(row[1]) if row else ''
        return os.path.splitext(name)[0] if name else None


class HelmConverter:
    def __init__(self, client):
        self.client = client
        self.info = DisplayInfo(client)
        self.next_id = FIRST_HELM_ID
        self.done = {}              # model path -> ids dict

    def convert(self, display_id):
        """Returns ({"race:gender": model file id}, {relative path: bytes}) for one helm display id; races without a client model are left out."""
        base = self.info.model(display_id)
        if not base:
            return {}, {}
        found, files = {}, {}
        for (race, gender), suffix in RACES.items():
            path = f'Item/ObjectComponents/Head/{base}_{suffix}.m2'
            if path not in self.done:
                data = self.client.read(path)
                if data is None:
                    self.done[path] = None
                else:
                    first = self.next_id
                    self.next_id += STRIDE
                    out, ids = m2v274.convert(data, first)
                    self.done[path] = (out, ids)
            entry = self.done[path]
            if entry:
                found[f'{race}:{gender}'] = entry[1]['model']
                files.update(entry[0])
        return found, files


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    converter = HelmConverter(octo_mpq.Client(argv[0]))
    mapping = {}
    for display_id in map(int, argv[2:]):
        found, files = converter.convert(display_id)
        mapping[str(display_id)] = found
        for rel, blob in files.items():
            path = os.path.join(argv[1], rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as handle:
                handle.write(blob)
        print(display_id, converter.info.model(display_id), found)
    with open(os.path.join(argv[1], 'helms.json'), 'w') as handle:
        json.dump(mapping, handle, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
