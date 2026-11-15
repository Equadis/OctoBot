"""Reader for the old single-file character model format (M2, magic MD20, version 256) used by the OctoWoW client.

Status (see README.md, step 2): geometry, the skin view, submeshes, texture units and texture definitions are read and checked
against internal consistency rules (every index in range, every array inside the file, arrays that should tile do tile).
Bones, animation sequences and their tracks are located but NOT yet decoded. `check()` lists what is verified.

    python tools/models/m2v256.py <model.m2>      # prints a summary and runs the consistency checks
"""
import struct
import sys

# (name, element size in bytes, verified). Order follows the header. Sizes marked unverified are best guesses from the format notes.
HEADER_ARRAYS = [
    ('global_sequences', 4, True), ('sequences', 0, False), ('animation_lookup', 2, True), ('playable_animation_lookup', 4, True),
    ('bones', 0, False), ('key_bone_lookup', 2, True), ('vertices', 48, True), ('views', 44, True),
    ('colors', 0, False), ('textures', 16, True), ('transparency', 0, False), ('uv_animations', 0, False), ('texture_replace', 2, False),
    ('render_flags', 4, False), ('bone_lookup', 2, False), ('texture_lookup', 2, False), ('texture_unit_lookup', 2, False),
    ('transparency_lookup', 2, False), ('uv_anim_lookup', 2, False),
]
FIRST_ARRAY_FIELD = 0x14          # 0x08 name (count, offset), 0x10 global flags, then (count, offset) pairs
TEXTURE_TYPES = {0: 'file', 1: 'body skin', 2: 'object skin (cape)', 6: 'hair', 8: 'fur', 11: 'creature skin 1', 12: 'creature skin 2', 13: 'creature skin 3'}


class M2Error(ValueError):
    pass


class M2:
    def __init__(self, data):
        self.data = data
        if data[:4] != b'MD20':
            raise M2Error('not an MD20 model')
        self.version = self._u32(4)
        if self.version != 256:
            raise M2Error(f'version {self.version}, expected 256')
        name_len, name_ofs = self._u32(8), self._u32(12)
        self.name = data[name_ofs:name_ofs + name_len].rstrip(b'\0').decode('latin1')
        self.global_flags = self._u32(0x10)
        self.arrays = {}
        pos = FIRST_ARRAY_FIELD
        for name, size, verified in HEADER_ARRAYS:
            self.arrays[name] = {'count': self._u32(pos), 'offset': self._u32(pos + 4), 'size': size, 'verified': verified}
            pos += 8
        self.header_end = pos

    def _u32(self, o):
        return struct.unpack_from('<I', self.data, o)[0]

    def array(self, name):
        a = self.arrays[name]
        end = a['offset'] + a['count'] * a['size']
        if a['count'] and end > len(self.data):
            raise M2Error(f"{name} runs past the end of the file")
        return a

    # ---- geometry ----
    def vertices(self):
        """[(position, bone_weights, bone_indices, normal, uv1, uv2)] for every vertex (48 bytes each)."""
        a = self.array('vertices')
        out = []
        for k in range(a['count']):
            v = struct.unpack_from('<3f4B4B3f2f2f', self.data, a['offset'] + k * 48)
            out.append((v[0:3], v[3:7], v[7:11], v[11:14], v[14:16], v[16:18]))
        return out

    def view(self):
        """The embedded skin view (the first and only one stored): index lookup, triangles, submeshes, texture units."""
        a = self.array('views')
        if a['count'] < 1:
            raise M2Error('no view')
        n_idx, o_idx, n_tri, o_tri, n_prop, o_prop, n_sub, o_sub, n_tex, o_tex, lod = struct.unpack_from('<11I', self.data, a['offset'])
        indices = struct.unpack_from(f'<{n_idx}H', self.data, o_idx)
        triangles = struct.unpack_from(f'<{n_tri}H', self.data, o_tri)
        submeshes = []
        for k in range(n_sub):
            f = struct.unpack_from('<10H3f', self.data, o_sub + k * 32)
            submeshes.append({'id': f[0], 'vertex_start': f[2], 'vertex_count': f[3], 'index_start': f[4], 'index_count': f[5],
                              'bone_count': f[6], 'bone_start': f[7], 'bone_influences': f[8], 'root_bone': f[9], 'position': f[10:13]})
        texture_units = []
        for k in range(n_tex):
            f = struct.unpack_from('<12H', self.data, o_tex + k * 24)
            texture_units.append({'flags': f[0], 'shading': f[1], 'submesh': f[2], 'submesh2': f[3], 'color': struct.unpack('<h', struct.pack('<H', f[4]))[0],
                                  'render_flags': f[5], 'texture_unit': f[6], 'mode': f[7], 'texture': f[8], 'texture_unit2': f[9],
                                  'transparency': f[10], 'uv_animation': f[11]})
        return {'indices': indices, 'triangles': triangles, 'submeshes': submeshes, 'texture_units': texture_units, 'lod': lod,
                'bone_properties_offset': o_prop, 'bone_properties_count': n_prop}

    def textures(self):
        a = self.array('textures')
        out = []
        for k in range(a['count']):
            kind, flags, n, o = struct.unpack_from('<4I', self.data, a['offset'] + k * 16)
            out.append({'type': kind, 'type_name': TEXTURE_TYPES.get(kind, f'type {kind}'), 'flags': flags,
                        'file': self.data[o:o + n].rstrip(b'\0').decode('latin1') if n > 1 else ''})
        return out

    # ---- consistency checks ----
    def check(self):
        """Returns (passed, failed) lists of human-readable rule names."""
        ok, bad = [], []

        def rule(name, condition):
            (ok if condition else bad).append(name)
        size = len(self.data)
        for name, a in self.arrays.items():
            rule(f'{name}: inside the file', a['count'] == 0 or (a['offset'] < size and (a['size'] == 0 or a['offset'] + a['count'] * a['size'] <= size)))
        verts = self.vertices()
        bones = self.arrays['bones']['count']
        rule('vertices: bone indices below the bone count (influencing bones only)',
             all(b < bones for v in verts for b, w in zip(v[2], v[1]) if w))
        rule('vertices: bone weights sum to about 255', all(abs(sum(v[1]) - 255) <= 4 for v in verts))
        view = self.view()
        rule('view: index lookup values are valid vertices', all(i < len(verts) for i in view['indices']))
        rule('view: triangle values are valid lookup positions', all(t < len(view['indices']) for t in view['triangles']))
        rule('view: triangles come in threes', len(view['triangles']) % 3 == 0)
        subs = view['submeshes']
        rule('submeshes: vertex ranges inside the index lookup', all(s['vertex_start'] + s['vertex_count'] <= len(view['indices']) for s in subs))
        rule('submeshes: triangle ranges inside the triangle list', all(s['index_start'] + s['index_count'] <= len(view['triangles']) for s in subs))
        rule('submeshes: triangle ranges tile the triangle list in order',
             sum(s['index_count'] for s in subs) == len(view['triangles']) and all(a['index_start'] + a['index_count'] == b['index_start'] for a, b in zip(subs, subs[1:])))
        textures = self.textures()
        lookup = self.array('texture_lookup')
        rule('texture units: submesh index valid', all(t['submesh'] < len(subs) for t in view['texture_units']))
        rule('textures: file names are .blp paths', all((not t['file']) or t['file'].lower().endswith('.blp') for t in textures))
        return ok, bad


def main(path):
    model = M2(open(path, 'rb').read())
    print(f'{path}\n  name {model.name!r}, version {model.version}, flags {model.global_flags:#x}, header ends at {model.header_end:#x}')
    for name, a in model.arrays.items():
        print(f"  {name:26s} count {a['count']:>6}  offset {a['offset']:>9}  element {a['size'] or '?':>3}  {'verified' if a['verified'] else 'unverified'}")
    view = model.view()
    print(f"  view: {len(view['indices'])} indices, {len(view['triangles']) // 3} triangles, {len(view['submeshes'])} submeshes, {len(view['texture_units'])} texture units")
    for t in model.textures():
        print(f"  texture {t['type_name']}: {t['file'] or '(set by the game from the character options)'}")
    ok, bad = model.check()
    print(f'  checks: {len(ok)} passed, {len(bad)} failed')
    for name in bad:
        print('   FAILED:', name)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
