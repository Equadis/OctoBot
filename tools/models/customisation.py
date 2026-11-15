"""Builds the viewer's character customisation data (README step 6) for OctoWoW's Goblin and Blood Elf from the client's own tables.

    python tools/models/customisation.py <Data folder> <race: 9 Goblin | 10 Blood Elf> <sex: 0 male | 1 female> <out json>

Reads DBFilesClient\\CharSections.dbc and CharHairGeosets.dbc (newest archive first) and writes a `meta/charactercustomization` JSON in the shape
Zam's viewer reads: options Skin Color, Face, Hair Style, Hair Color; each choice holds elements that either switch a geoset (hair style) or
point a texture target at a texture file. Texture file ids are invented (from FIRST_TEXTURE_ID up) and returned beside the JSON as
`textures` (client path -> id) so blp.py can write the matching WebPs. The layout blocks (Materials, TextureLayers, TextureSections) are the
standard character atlas layout, which Zam's own Goblin and Human files share. Facial hair, ears and other options are not built yet.
Output stays local; nothing derived from client files is published (see the rules in README.md).
"""
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import octo_mpq  # noqa: E402

FIRST_TEXTURE_ID = 9100000
OPTION_IDS = {'Skin Color': 100, 'Face': 101, 'Hair Style': 102, 'Hair Color': 103, 'Facial Hair': 104}

# Texture targets (ChrModelTextureTarget ids used by Zam's layer table)
T_SKIN, T_SKIN_EXTRA, T_FACE_LOWER, T_FACE_UPPER, T_HAIR, T_SCALP_LOWER, T_SCALP_UPPER, T_PELVIS, T_TORSO = 1, 2, 4, 5, 10, 11, 12, 13, 14

LAYOUT = {
    'Materials': [{'TextureType': 1, 'Width': 512, 'Height': 512, 'Flags': 0, 'Unk_34615_1': -1},
                  {'TextureType': 6, 'Width': 256, 'Height': 256, 'Flags': 0, 'Unk_34615_1': -1},
                  {'TextureType': 8, 'Width': 256, 'Height': 256, 'Flags': 0, 'Unk_34615_1': -1}],
    'TextureLayers': [
        {'TextureType': 1, 'Layer': 0, 'BlendMode': 1, 'ChrModelTextureTargetID': 1, 'TextureSection': -1},
        {'TextureType': 8, 'Layer': 1, 'BlendMode': 1, 'ChrModelTextureTargetID': 2, 'TextureSection': -1},
        {'TextureType': 6, 'Layer': 2, 'BlendMode': 1, 'ChrModelTextureTargetID': 10, 'TextureSection': -1},
        {'TextureType': 1, 'Layer': 3, 'BlendMode': 15, 'ChrModelTextureTargetID': 5, 'TextureSection': 9},
        {'TextureType': 1, 'Layer': 4, 'BlendMode': 15, 'ChrModelTextureTargetID': 4, 'TextureSection': 10},
        {'TextureType': 1, 'Layer': 5, 'BlendMode': 9, 'ChrModelTextureTargetID': 16, 'TextureSection': 12},
        {'TextureType': 1, 'Layer': 6, 'BlendMode': 15, 'ChrModelTextureTargetID': 13, 'TextureSection': 5},
        {'TextureType': 1, 'Layer': 7, 'BlendMode': 15, 'ChrModelTextureTargetID': 14, 'TextureSection': 3},
        {'TextureType': 1, 'Layer': 8, 'BlendMode': 15, 'ChrModelTextureTargetID': 11, 'TextureSection': 10},
        {'TextureType': 1, 'Layer': 9, 'BlendMode': 15, 'ChrModelTextureTargetID': 12, 'TextureSection': 9},
        {'TextureType': 1, 'Layer': 10, 'BlendMode': 15, 'ChrModelTextureTargetID': 7, 'TextureSection': 10},
        {'TextureType': 1, 'Layer': 11, 'BlendMode': 15, 'ChrModelTextureTargetID': 8, 'TextureSection': 9}],
    'TextureSections': [
        {'SectionType': 0, 'X': 0, 'Y': 0, 'Width': 0.5, 'Height': 0.25}, {'SectionType': 1, 'X': 0, 'Y': 0.25, 'Width': 0.5, 'Height': 0.25},
        {'SectionType': 2, 'X': 0, 'Y': 0.5, 'Width': 0.5, 'Height': 0.125}, {'SectionType': 3, 'X': 0.5, 'Y': 0, 'Width': 0.5, 'Height': 0.25},
        {'SectionType': 4, 'X': 0.5, 'Y': 0.25, 'Width': 0.5, 'Height': 0.125}, {'SectionType': 5, 'X': 0.5, 'Y': 0.375, 'Width': 0.5, 'Height': 0.25},
        {'SectionType': 6, 'X': 0.5, 'Y': 0.625, 'Width': 0.5, 'Height': 0.25}, {'SectionType': 7, 'X': 0.5, 'Y': 0.875, 'Width': 0.5, 'Height': 0.125},
        {'SectionType': 9, 'X': 0, 'Y': 0.625, 'Width': 0.5, 'Height': 0.125}, {'SectionType': 10, 'X': 0, 'Y': 0.75, 'Width': 0.5, 'Height': 0.25},
        {'SectionType': 12, 'X': 0, 'Y': 0, 'Width': 1, 'Height': 1}, {'SectionType': 13, 'X': 0, 'Y': 0, 'Width': 1, 'Height': 1}],
}


def read_dbc(data):
    """Returns (rows, string_at). Each row is a tuple of 32-bit fields."""
    magic, n, fields, size, strings = struct.unpack_from('<4s4I', data, 0)
    if magic != b'WDBC':
        raise ValueError('not a DBC file')
    base = 20 + n * size
    rows = [struct.unpack_from(f'<{fields}I', data, 20 + i * size) for i in range(n)]

    def string_at(offset):
        return data[base + offset:data.index(b'\0', base + offset)].decode('latin1') if offset else ''
    return rows, string_at


class Builder:
    def __init__(self, client):
        self.sections, self.string = read_dbc(client.read('DBFilesClient\\CharSections.dbc'))
        self.hair_geosets, _ = read_dbc(client.read('DBFilesClient\\CharHairGeosets.dbc'))
        self.facial_hair, _ = read_dbc(client.read('DBFilesClient/CharacterFacialHairStyles.dbc'))
        self.textures = {}
        self.texture_files = {}
        self._next = {'choice': 9300000, 'element': 9400000, 'resource': 9200000}

    def _new(self, kind):
        self._next[kind] += 1
        return self._next[kind]

    def _material(self, target, path):
        """A material element for one texture file; returns None when the row has no texture."""
        if not path:
            return None
        key = path.upper()
        self.textures.setdefault(key, FIRST_TEXTURE_ID + len(self.textures))
        resource = self._new('resource')
        self.texture_files[str(resource)] = [{'FileDataId': self.textures[key], 'Gender': 3, 'Class': 0, 'Race': 0, 'ExtraData': 0}]
        return {'TextureTarget': target, 'MaterialResourcesID': resource}

    def _element(self, material=None, geoset=None, variation=-1, variation_choice=0):
        return {'Id': self._new('element'), 'VariationIndex': variation, 'VariationChoiceID': variation_choice,
                'Geoset': geoset, 'SkinnedModel': None, 'Material': material, 'BoneSet': None, 'CondModelFileDataId': 0, 'ChrCustItemGeoModifyID': 0}

    def _choice(self, order, elements):
        return {'Id': self._new('choice'), 'Name': '', 'OrderIndex': order, 'CustReqId': 0, 'Elements': elements}

    def rows(self, race, sex, kind):
        return [r for r in self.sections if r[1] == race and r[2] == sex and r[3] == kind]

    def build(self, race, sex):
        skin_rows = sorted(self.rows(race, sex, 0), key=lambda r: (r[4], r[5]))
        skin_rows = [r for r in skin_rows if r[4] == 0]
        under = {r[5]: r for r in self.rows(race, sex, 4) if r[4] == 0}
        skin_choices = []
        for order, r in enumerate(skin_rows):
            elements = [e for e in (self._element(self._material(T_SKIN, self.string(r[6]))),
                                    self._element(self._material(T_SKIN_EXTRA, self.string(r[7]))) if r[7] else None) if e and e['Material']]
            u = under.get(r[5])
            if u:
                elements += [e for e in (self._element(self._material(T_PELVIS, self.string(u[6]))),
                                         self._element(self._material(T_TORSO, self.string(u[7]))) if u[7] else None) if e and e['Material']]
            skin_choices.append(self._choice(order, elements))
        colour_index = {}
        for i, r in enumerate(skin_rows):
            colour_index.setdefault(r[5], []).append(i)
        face_choices = []
        for order, v in enumerate(sorted({r[4] for r in self.rows(race, sex, 1)})):
            elements = []
            for r in self.rows(race, sex, 1):
                if r[4] != v or r[5] not in colour_index:
                    continue
                for i in colour_index[r[5]]:
                    for target, offset in ((T_FACE_LOWER, 6), (T_FACE_UPPER, 7)):
                        m = self._material(target, self.string(r[offset])) if r[offset] else None
                        if m:
                            elements.append(self._element(m, variation=i, variation_choice=skin_choices[i]['Id']))
            face_choices.append(self._choice(order, elements))
        hair_style = [self._choice(order, [self._element(geoset={'GeosetType': 0, 'GeosetID': g[4], 'Modifier': -1})])
                      for order, g in enumerate(sorted((g for g in self.hair_geosets if g[1] == race and g[2] == sex), key=lambda g: g[3]))]
        hair_rows = [r for r in self.rows(race, sex, 3) if r[4] == 0]
        hair_color = []
        for order, r in enumerate(sorted(hair_rows, key=lambda r: r[5])):
            elements = [self._element(m) for m in (self._material(T_HAIR, self.string(r[6])),
                                                    self._material(T_SCALP_LOWER, self.string(r[7])) if r[7] else None,
                                                    self._material(T_SCALP_UPPER, self.string(r[8])) if r[8] else None) if m]
            hair_color.append(self._choice(order, elements))
        # Facial hair styles pick the geosets 100 + a, 200 + b and 300 + c (a, b, c from the table; 0xCCCCCCCC means unused). On the Goblin the
        # head itself is one of the 1xx geosets, so a style must always be selected or no head is drawn.
        facial = []
        for order, r in enumerate(sorted((r for r in self.facial_hair if r[0] == race and r[1] == sex), key=lambda r: r[2])):
            geosets = [self._element(geoset={'GeosetType': kind, 'GeosetID': value, 'Modifier': -1})
                       for kind, value in ((1, r[6]), (2, r[7]), (3, r[8])) if value < 100 and (value > 0 or kind == 1)]
            facial.append(self._choice(order, geosets))
        options = []
        for name, choices in (('Skin Color', skin_choices), ('Face', face_choices), ('Hair Style', hair_style), ('Hair Color', hair_color), ('Facial Hair', facial)):
            if choices:
                options.append({'Id': OPTION_IDS[name], 'Name': name, 'OrderIndex': len(options) + 1, 'Choices': choices})
        return {'Options': options, 'TextureFiles': self.texture_files, **json.loads(json.dumps(LAYOUT)), 'HairStyleOptionId': 0}


def main(argv):
    if len(argv) != 4:
        print(__doc__)
        return 2
    builder = Builder(octo_mpq.Client(argv[0]))
    data = builder.build(int(argv[1]), int(argv[2]))
    json.dump({'customisation': data, 'textures': builder.textures}, open(argv[3], 'w'), indent=1)
    print('options:', [(o['Name'], len(o['Choices'])) for o in data['Options']], 'textures:', len(builder.textures))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
