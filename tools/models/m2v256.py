"""Reader for the old single-file character model format (M2, magic MD20, version 256) used by the OctoWoW client.

Status (see README.md, step 2): geometry, the skin view, submeshes, texture units, texture definitions, animation sequences, bones with
their animation tracks, and attachments are read and checked against internal consistency rules (every index in range, every array inside
the file, arrays that should tile do tile). Colours, transparency, UV animations, events, lights, cameras, particle and ribbon emitters,
and the external .anim files are located but NOT yet decoded. `check()` lists what is verified.

    python tools/models/m2v256.py <model.m2>      # prints a summary and runs the consistency checks
"""
import struct
import sys

# (name, element size in bytes, verified). Order follows the header. A size of 0 means "not decoded yet".
HEADER_ARRAYS = [
    ('global_sequences', 4, True), ('sequences', 68, True), ('animation_lookup', 2, True), ('playable_animation_lookup', 4, True),
    ('bones', 108, True), ('key_bone_lookup', 2, True), ('vertices', 48, True), ('views', 44, True),
    ('colors', 56, True), ('textures', 16, True), ('transparency', 28, True), ('uv_animations', 0, False), ('texture_replace', 2, False),
    ('replaceable_lookup', 2, False), ('render_flags', 4, False), ('bone_lookup', 2, False), ('texture_lookup', 2, False), ('texture_unit_lookup', 2, False),
    ('transparency_lookup', 2, False), ('uv_anim_lookup', 2, False),
]
# After the arrays above come the bounding box (6 floats + radius) and the collision box (6 floats + radius), then these pairs.
TRAILING_ARRAYS = [('bounding_triangles', 2), ('bounding_vertices', 12), ('bounding_normals', 12), ('attachments', 48), ('attachment_lookup', 2),
                   ('events', 0), ('lights', 0), ('cameras', 0), ('camera_lookup', 2), ('ribbon_emitters', 0), ('particle_emitters', 0)]
TRAILING_START = 0xEC
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
        self.bounds = struct.unpack_from('<7f', data, self.header_end)    # min xyz, max xyz, radius
        self.trailing = {}
        for k, (name, size) in enumerate(TRAILING_ARRAYS):
            self.trailing[name] = {'count': self._u32(TRAILING_START + k * 8), 'offset': self._u32(TRAILING_START + k * 8 + 4), 'size': size}

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

    # ---- animation ----
    def global_sequences(self):
        a = self.array('global_sequences')
        return list(struct.unpack_from(f"<{a['count']}I", self.data, a['offset']))

    def sequences(self):
        """Animations. start and end are positions on one shared timeline in milliseconds; length = end - start."""
        a = self.array('sequences')
        out = []
        for k in range(a['count']):
            w = struct.unpack_from('<HHIIfIhHIII3f3ffhH', self.data, a['offset'] + k * 68)
            out.append({'index': k, 'id': w[0], 'sub_id': w[1], 'start': w[2], 'end': w[3], 'length': w[3] - w[2], 'move_speed': w[4], 'flags': w[5],
                        'probability': w[6], 'bounds_min': w[11:14], 'bounds_max': w[14:17], 'radius': w[17], 'next': w[18], 'alias': w[19]})
        return out

    def _track(self, offset, kind):
        """One animation track in the old layout: a single flat list of keyframes plus per-sequence (first, last + 1) key ranges."""
        interp, gseq, n_ranges, o_ranges, n_ts, o_ts, n_vals, o_vals = struct.unpack_from('<HhIIIIII', self.data, offset)
        ranges = [struct.unpack_from('<2I', self.data, o_ranges + 8 * k) for k in range(n_ranges)]
        times = list(struct.unpack_from(f'<{n_ts}I', self.data, o_ts)) if n_ts else []
        if kind == 'int16':      # one signed 16-bit value per key (transparency and colour alpha: 0 to 32767)
            values = list(struct.unpack_from(f'<{n_vals}h', self.data, o_vals)) if n_vals else []
        elif kind == 'quat':     # four float32 per key (x, y, z, w); this version does not compress them
            raw = struct.unpack_from(f'<{n_vals * 4}f', self.data, o_vals) if n_vals else ()
            values = [tuple(raw[k * 4:k * 4 + 4]) for k in range(n_vals)]
        else:                    # vec3 of floats
            raw = struct.unpack_from(f'<{n_vals * 3}f', self.data, o_vals) if n_vals else ()
            values = [raw[k * 3:k * 3 + 3] for k in range(n_vals)]
        return {'interpolation': interp, 'global_sequence': gseq, 'ranges': ranges, 'times': times, 'values': values,
                'offsets': {'ranges': (o_ranges, n_ranges * 8), 'times': (o_ts, n_ts * 4), 'values': (o_vals, n_vals * (16 if kind == 'quat' else 2 if kind == 'int16' else 12))}}

    def bones(self):
        a = self.array('bones')
        out = []
        for k in range(a['count']):
            base = a['offset'] + k * 108
            key, flags, parent, submesh = struct.unpack_from('<iIhH', self.data, base)
            out.append({'index': k, 'key_bone': key, 'flags': flags, 'parent': parent, 'submesh': submesh,
                        'translation': self._track(base + 12, 'vec3'), 'rotation': self._track(base + 40, 'quat'),
                        'scale': self._track(base + 68, 'vec3'), 'pivot': struct.unpack_from('<3f', self.data, base + 96)})
        return out

    def colors(self):
        """Colour tints (56 bytes each: an RGB track then an alpha track). Batches name one by index; -1 means none."""
        a = self.array('colors')
        return [{'index': k, 'color': self._track(a['offset'] + 56 * k, 'vec3'), 'alpha': self._track(a['offset'] + 56 * k + 28, 'int16')}
                for k in range(a['count'])]

    def transparency(self):
        """Transparency (fade) tracks, 28 bytes each; batches reach them through the transparency lookup."""
        a = self.array('transparency')
        return [self._track(a['offset'] + 28 * k, 'int16') for k in range(a['count'])]

    def attachments(self):
        """Points on the skeleton where items attach: id, bone, position (48 bytes each; the visibility track is not decoded)."""
        a = self.trailing['attachments']
        out = []
        for k in range(a['count']):
            ident, bone, _, x, y, z = struct.unpack_from('<IHH3f', self.data, a['offset'] + k * 48)
            out.append({'id': ident, 'bone': bone, 'position': (x, y, z)})
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
        rule('texture units: submesh index valid', all(t['submesh'] < len(subs) for t in view['texture_units']))
        rule('textures: file names are .blp paths', all((not t['file']) or t['file'].lower().endswith('.blp') for t in self.textures()))
        seqs = self.sequences()
        rule('sequences: end not before start', all(s['end'] >= s['start'] for s in seqs))
        rule('sequences: the shared timeline never goes backwards', all(a['start'] <= b['start'] for a, b in zip(seqs, seqs[1:])))
        bone_list = self.bones()
        rule('bones: parents exist and come earlier', all(-1 <= b['parent'] < b['index'] for b in bone_list))
        rule('bones: key bone ids are -1 or small', all(-1 <= b['key_bone'] < 200 for b in bone_list))
        values_match = ranges_inside = tiling = True
        for b in bone_list:
            for name in ('translation', 'rotation', 'scale'):
                t = b[name]
                values_match &= len(t['times']) == len(t['values'])
                ranges_inside &= all(0 <= lo <= hi <= len(t['times']) for lo, hi in t['ranges'])
                if t['times']:
                    (ro, rn), (to, tn), (vo, vn) = t['offsets']['ranges'], t['offsets']['times'], t['offsets']['values']
                    # Tracks driven by a global sequence (looping effects such as breathing) have no per-animation ranges.
                    tiling &= (0 <= to - (ro + rn) < 16 if t['ranges'] else t['global_sequence'] >= 0) and 0 <= vo - (to + tn) < 16     # each array starts on a 16-byte boundary
        rule('tracks: one value per timestamp', values_match)
        rule('tracks: every key range lies inside the key list', ranges_inside)
        rule('tracks: ranges then timestamps then values, in that order, with only alignment padding between (the old layout)', tiling)
        rule('tracks: timestamps never go backwards inside a range',
             all(t['times'][i] <= t['times'][i + 1] for b in bone_list for t in (b['translation'], b['rotation']) if t['times']
                 for lo, hi in t['ranges'] for i in range(lo, hi - 1)))
        rule('attachments: bones exist', all(a['bone'] < len(bone_list) for a in self.attachments()))
        extra = [c[k] for c in self.colors() for k in ('color', 'alpha')] + self.transparency()
        rule('colour and transparency tracks: one value per timestamp, key ranges inside the key list',
             all(len(t['times']) == len(t['values']) and all(0 <= lo <= hi <= len(t['times']) for lo, hi in t['ranges']) for t in extra))
        rule('colour and transparency tracks: ranges then timestamps then values (the old layout)',
             all((0 <= t['offsets']['times'][0] - sum(t['offsets']['ranges']) < 16 if t['ranges'] else t['global_sequence'] >= 0 or len(t['times']) == 1)
                 and 0 <= t['offsets']['values'][0] - sum(t['offsets']['times']) < 16 for t in extra if t['times']))
        lookup = self.array('transparency_lookup')
        lookup_values = struct.unpack_from(f"<{lookup['count']}H", self.data, lookup['offset']) if lookup['count'] else ()
        rule('texture units: colour index is -1 or a colour, transparency index is inside the transparency lookup',
             all((t['color'] == -1 or 0 <= t['color'] < len(self.colors())) and t['transparency'] < len(lookup_values) for t in view['texture_units']))
        rule('transparency lookup: every entry names a transparency track', all(v < len(self.transparency()) for v in lookup_values))
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
    seqs, bone_list = model.sequences(), model.bones()
    keys = sum(len(b[n]['times']) for b in bone_list for n in ('translation', 'rotation', 'scale'))
    print(f"  {len(seqs)} animations, {len(bone_list)} bones, {keys} keyframes, {len(model.attachments())} attachments, {len(model.global_sequences())} global sequences")
    ok, bad = model.check()
    print(f'  checks: {len(ok)} passed, {len(bad)} failed')
    for name in bad:
        print('   FAILED:', name)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
