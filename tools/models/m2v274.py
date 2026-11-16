"""Writer: turns a model read by m2v256.py into the files Zam's viewer loads (modern chunked M2, version 274).

    python tools/models/m2v274.py <model.m2 (version 256)> <out folder> [first file id]

Writes three files into the out folder (plus ids.json listing the file ids it invented):
    m2/<id>.m2      MD21 chunk (MD20 v274) + SKID + SFID + TXID chunks
    skin/<id>.skin  the view: vertex lookup, triangles, per-vertex bones, submeshes (48 bytes), batches (24 bytes)
    skel/<id>.skel  SKL1 + SKS1 (sequences) + SKB1 (bones with animation tracks) + SKA1 (attachments)

Status (see README.md, step 3): geometry, bones, animation tracks, sequences and attachments are converted and verified by reading the
written bytes back (`verify`). NOT converted yet, written empty: UV animations, events, lights, cameras, particles, collision data. Colour tints and transparency (fade)
tracks are converted (they switch the Goblin's eye layers on and off and set the Blood Elf eye glow). Not yet tried in the viewer (that is step 5).
Output stays on your machine: nothing derived from client files is published (see the rules in README.md).
"""
import json
import math
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import m2v256  # noqa: E402

HEADER_SIZE = 0x130
SEQUENCE_INLINE = 0x20      # sequence data lives in the file itself (not in an external .anim)


class Blob:
    """A byte buffer whose offsets are relative to its own start (as the chunk offsets are)."""

    def __init__(self, start):
        self.buf = bytearray(start)

    def align(self, n=16):
        while len(self.buf) % n:
            self.buf.append(0)

    def add(self, data, align=16):
        self.align(align)
        offset = len(self.buf)
        self.buf += data
        return offset


def pair(blob, items, fmt, align=16):
    """Store a list of fixed-size records; returns (count, offset). An empty list is (0, 0)."""
    if not items:
        return 0, 0
    return len(items), blob.add(b''.join(struct.pack(fmt, *i) if isinstance(i, (tuple, list)) else struct.pack(fmt, i) for i in items), align)


def encode_quat(q):
    """Float quaternion to the 16-bit compressed form (inverse of v < 0 ? v + 32768 : v - 32767, over 32767)."""
    n = math.sqrt(sum(c * c for c in q)) or 1.0
    out = []
    for c in q:
        v = round(max(-1.0, min(1.0, c / n)) * 32767)
        out.append(v - 32768 if c >= 0 else v + 32767)
    return struct.pack('<4h', *out)


def write_track(blob, track, seqs, kind):
    """One modern M2Track (20 bytes). Timestamps and values are stored per sequence, times relative to that sequence's start."""
    empty = struct.pack('<HhIIII', 0, -1, 0, 0, 0, 0)
    if not track['values']:
        return empty
    if track['global_sequence'] >= 0:
        groups = [list(range(len(track['values'])))]
        starts = [0]
    elif not track['ranges']:
        # A constant (one key, no per-animation ranges): the modern form wants it written for every animation, at time 0.
        groups = [[0]] * len(seqs)
        starts = [track['times'][0]] * len(seqs)
    else:
        groups, starts = [], []
        for s, (lo, hi) in zip(seqs, track['ranges']):
            groups.append(list(range(lo, hi + 1)) if hi >= lo and lo < len(track['values']) else [])
            starts.append(s['start'])
    # Some client models (Helm_Robe_D_04) key a track a few ticks before the sequence that owns it starts; the field is unsigned, so clamp at 0.
    t_entries, v_entries = [], []
    for idx, start in zip(groups, starts):
        t_entries.append(pair(blob, [max(0, track['times'][k] - start) for k in idx], '<I'))
        if kind == 'quat':
            v_entries.append((len(idx), blob.add(b''.join(encode_quat(track['values'][k]) for k in idx), 4) if idx else 0))
        elif kind == 'int16':
            v_entries.append(pair(blob, [track['values'][k] for k in idx], '<h', 2))
        else:
            v_entries.append(pair(blob, [tuple(track['values'][k]) for k in idx], '<3f', 4))
    t_off = blob.add(b''.join(struct.pack('<II', *e) for e in t_entries))
    v_off = blob.add(b''.join(struct.pack('<II', *e) for e in v_entries))
    return struct.pack('<HhIIII', track['interpolation'], track['global_sequence'], len(t_entries), t_off, len(v_entries), v_off)


def write_skin(m):
    view, verts = m.view(), m.vertices()
    if len(view['triangles']) >= 65536:
        raise ValueError('more than 65535 indices: needs the submesh level field, not handled')
    blob = Blob(64)
    verts_n, verts_o = pair(blob, list(view['indices']), '<H')
    idx_n, idx_o = pair(blob, list(view['triangles']), '<H')
    props = struct.unpack_from(f"<{view['bone_properties_count'] * 4}B", m.data, view['bone_properties_offset']) if view['bone_properties_count'] else ()
    bones = [tuple(props[k * 4:k * 4 + 4]) for k in range(view['bone_properties_count'])]
    bone_n, bone_o = pair(blob, bones, '<4B')
    subs = []
    for s in view['submeshes']:
        pts = [verts[view['indices'][i]][0] for i in range(s['vertex_start'], s['vertex_start'] + s['vertex_count'])]
        cx, cy, cz = (sum(p[a] for p in pts) / len(pts) for a in range(3)) if pts else (0, 0, 0)
        radius = max((math.dist((cx, cy, cz), p) for p in pts), default=0.0)
        subs.append((s['id'], 0, s['vertex_start'], s['vertex_count'], s['index_start'], s['index_count'], s['bone_count'], s['bone_start'],
                     s['bone_influences'], s['root_bone'], *s['position'], cx, cy, cz, radius))
    sub_n, sub_o = pair(blob, subs, '<10H3f3ff')
    batches = []
    for t in view['texture_units']:
        # old fields: flags, shading, submesh, submesh2, colour, render flags, unit, mode, texture, unit2, transparency, uv animation
        # new fields: flags, priority, shader, submesh, geoset, colour, material, layer, texture count, texture, coord, weight, transform
        batches.append((t['flags'] & 0xFF, 0, 0, t['submesh'], t['submesh2'], 65535 if t['color'] < 0 else t['color'], t['render_flags'], t['texture_unit'],
                        max(1, t['mode']), t['texture'], t['texture_unit2'], t['transparency'], 0))
    bat_n, bat_o = pair(blob, batches, '<BbHHHHHHHHHHH')
    header = struct.pack('<4s13I', b'SKIN', verts_n, verts_o, idx_n, idx_o, bone_n, bone_o, sub_n, sub_o, bat_n, bat_o, 256, 0, 0)
    blob.buf[:len(header)] = header
    return bytes(blob.buf)


def chunk(tag, payload):
    return tag + struct.pack('<I', len(payload)) + payload


def write_skel(m, name='skel'):
    seqs = m.sequences()
    out = []
    # SKL1: flags, name (count, offset), 4 zero bytes; data follows
    blob = Blob(16)
    n_n, n_o = len(name) + 1, blob.add(name.encode() + b'\0', 1)
    blob.buf[:16] = struct.pack('<IIII', 0x100, n_n, n_o, 0)
    out.append(chunk(b'SKL1', bytes(blob.buf)))
    # SKS1: global loops, sequences, sequence lookups, 8 zero bytes
    blob = Blob(32)
    gl = pair(blob, m.global_sequences(), '<I')
    sq = pair(blob, [(s['id'], s['sub_id'], s['length'], s['move_speed'], s['flags'] | SEQUENCE_INLINE, s['probability'], 0, 0, 0, 0, 0,
                      *s['bounds_min'], *s['bounds_max'], s['radius'], s['next'], s['alias']) for s in seqs], '<HHIfIhHIIHH3f3ffhH')
    lk = pair(blob, list(struct.unpack_from(f"<{m.array('animation_lookup')['count']}H", m.data, m.array('animation_lookup')['offset'])), '<H')
    blob.buf[:32] = struct.pack('<6I8x', *gl, *sq, *lk)
    out.append(chunk(b'SKS1', bytes(blob.buf)))
    # SKB1: bones, key bone lookup
    blob = Blob(16)
    records = []
    for b in m.bones():
        t = [write_track(blob, b[k], seqs, 'quat' if k == 'rotation' else 'vec3') for k in ('translation', 'rotation', 'scale')]
        records.append(struct.pack('<iIhHI', b['key_bone'], b['flags'], b['parent'], b['submesh'], 0) + b''.join(t) + struct.pack('<3f', *b['pivot']))
    bn = len(records)
    bo = blob.add(b''.join(records)) if records else 0
    kb = m.array('key_bone_lookup')
    kn = pair(blob, list(struct.unpack_from(f"<{kb['count']}H", m.data, kb['offset'])), '<H')
    blob.buf[:16] = struct.pack('<4I', bn, bo, *kn)
    out.append(chunk(b'SKB1', bytes(blob.buf)))
    # SKA1: attachments, attachment lookup
    blob = Blob(16)
    att = [struct.pack('<IHH3f', a['id'], a['bone'], 0, *a['position']) + struct.pack('<HhIIII', 0, -1, 0, 0, 0, 0) for a in m.attachments()]
    an, ao = len(att), (blob.add(b''.join(att)) if att else 0)
    al = m.trailing['attachment_lookup']
    ln = pair(blob, list(struct.unpack_from(f"<{al['count']}H", m.data, al['offset'])) if al['count'] else [], '<H')
    blob.buf[:16] = struct.pack('<4I', an, ao, *ln)
    out.append(chunk(b'SKA1', bytes(blob.buf)))
    return b''.join(out)


def write_m2(m, skel_id, skin_id, texture_ids):
    verts = m.vertices()
    blob = Blob(HEADER_SIZE)
    name = (m.name or 'model').encode() + b'\0'
    name_o = blob.add(name, 1)
    v_n, v_o = pair(blob, [(*v[0], *v[1], *v[2], *v[3], *v[4], *v[5]) for v in verts], '<3f4B4B3f2f2f')
    tex = m.textures()
    entries = []
    for t, tid in zip(tex, texture_ids):
        entries.append(struct.pack('<IIII', t['type'], t['flags'], 0, 0))
    t_n, t_o = len(entries), (blob.add(b''.join(entries)) if entries else 0)
    seqs = m.sequences()
    # Colour tints (RGB track + alpha track) and transparency (fade) tracks, converted per animation like the bone tracks.
    colour_records = [write_track(blob, c['color'], seqs, 'vec3') + write_track(blob, c['alpha'], seqs, 'int16') for c in m.colors()]
    c_n, c_o = len(colour_records), (blob.add(b''.join(colour_records)) if colour_records else 0)
    weight_records = [write_track(blob, t, seqs, 'int16') for t in m.transparency()]
    w_n, w_o = len(weight_records), (blob.add(b''.join(weight_records)) if weight_records else 0)
    def u16s(name_):
        a = m.array(name_)
        return list(struct.unpack_from(f"<{a['count']}H", m.data, a['offset'])) if a['count'] else []
    rep = pair(blob, u16s('replaceable_lookup'), '<H')
    mats = m.array('render_flags')
    mat = pair(blob, [struct.unpack_from('<HH', m.data, mats['offset'] + 4 * k) for k in range(mats['count'])], '<HH')
    bone_combo = pair(blob, u16s('bone_lookup'), '<H')
    tex_combo = pair(blob, u16s('texture_lookup'), '<H')
    coord_combo = pair(blob, u16s('texture_unit_lookup'), '<H')
    weight_combo = pair(blob, u16s('transparency_lookup'), '<H')
    xform_combo = pair(blob, [65535], '<H')      # one entry meaning "no transform"; every batch points at entry 0 (as in Zam's own files)
    xs, ys, zs = ([v[0][a] for v in verts] for a in range(3))
    bbox = (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))
    radius = max(math.sqrt(x * x + y * y + z * z) for x, y, z in zip(xs, ys, zs))
    h = bytearray(HEADER_SIZE)
    struct.pack_into('<4sI', h, 0, b'MD20', 274)
    struct.pack_into('<II', h, 0x08, len(name), name_o)
    struct.pack_into('<I', h, 0x10, m.global_flags)
    struct.pack_into('<II', h, 0x3C, v_n, v_o)
    struct.pack_into('<I', h, 0x44, 1)                                   # one skin profile
    struct.pack_into('<II', h, 0x48, c_n, c_o)
    struct.pack_into('<II', h, 0x50, t_n, t_o)
    struct.pack_into('<II', h, 0x58, w_n, w_o)
    for off, val in ((0x68, rep), (0x70, mat), (0x78, bone_combo), (0x80, tex_combo), (0x88, coord_combo), (0x90, weight_combo), (0x98, xform_combo)):
        struct.pack_into('<II', h, off, *val)
    struct.pack_into('<6ff6ff', h, 0xA0, *bbox, radius, *bbox, radius)
    blob.buf[:HEADER_SIZE] = h
    md21 = chunk(b'MD21', bytes(blob.buf))
    return (md21 + chunk(b'SKID', struct.pack('<I', skel_id)) + chunk(b'SFID', struct.pack('<I', skin_id))
            + chunk(b'TXID', b''.join(struct.pack('<I', i) for i in texture_ids)))


def convert(data, first_id=9000000, texture_id_for=None):
    """Returns ({relative path: bytes}, ids). File ids are invented here, high enough to stay clear of Zam's own.
    texture_id_for(path) may supply the id for a texture the model names, so many models can share one converted texture."""
    m = m2v256.M2(data)
    model_id, skin_id, skel_id = first_id, first_id + 1, first_id + 2
    texture_ids, ids_by_path = [], {}
    for t in m.textures():
        if t['type'] == 0 and t['file']:
            key = t['file'].upper()
            ids_by_path.setdefault(key, texture_id_for(key) if texture_id_for else first_id + 10 + len(ids_by_path))
            texture_ids.append(ids_by_path[key])
        else:
            texture_ids.append(0)               # skin, hair and cape textures are chosen by the customisation data
    files = {f'm2/{model_id}.m2': write_m2(m, skel_id, skin_id, texture_ids), f'skin/{skin_id}.skin': write_skin(m),
             f'skel/{skel_id}.skel': write_skel(m)}
    return files, {'model': model_id, 'skin': skin_id, 'skel': skel_id, 'textures': ids_by_path}


def verify(data, files):
    """Reads the written files back with plain struct parsing and compares them with what the v256 reader found. Returns (passed, failed)."""
    m = m2v256.M2(data)
    ok, bad = [], []
    def rule(name, cond):
        (ok if cond else bad).append(name)
    skin = next(v for k, v in files.items() if k.endswith('.skin'))
    skel = next(v for k, v in files.items() if k.endswith('.skel'))
    mdat = next(v for k, v in files.items() if k.endswith('.m2'))
    chunks, pos = {}, 0
    while pos < len(mdat):
        tag, size = mdat[pos:pos + 4], struct.unpack_from('<I', mdat, pos + 4)[0]
        chunks[tag] = mdat[pos + 8:pos + 8 + size]
        pos += 8 + size
    md = chunks[b'MD21']
    rule('m2 has MD20 version 274', md[:4] == b'MD20' and struct.unpack_from('<I', md, 4)[0] == 274)
    rule('m2 has SKID, SFID and TXID', all(t in chunks for t in (b'SKID', b'SFID', b'TXID')))
    n, o = struct.unpack_from('<II', md, 0x3C)
    src = m.vertices()
    rule('vertex count', n == len(src))
    back = [struct.unpack_from('<3f4B4B3f2f2f', md, o + 48 * k) for k in range(n)]
    rule('vertices identical', all(tuple(b[:3]) == tuple(s[0]) and tuple(b[3:7]) == tuple(s[1]) and tuple(b[7:11]) == tuple(s[2]) for b, s in zip(back, src)))
    view = m.view()
    vn, vo, inn, io, bn, bo, sn, so, tn, to = struct.unpack_from('<10I', skin, 4)
    rule('skin magic', skin[:4] == b'SKIN')
    rule('skin vertex lookup identical', list(struct.unpack_from(f'<{vn}H', skin, vo)) == list(view['indices']))
    rule('skin triangles identical', list(struct.unpack_from(f'<{inn}H', skin, io)) == list(view['triangles']))
    rule('skin submesh count', sn == len(view['submeshes']))
    rule('skin batch count', tn == len(view['texture_units']))
    rule('skin triangles stay inside the vertex lookup', max(view['triangles']) < vn)
    rule('skin submeshes tile the triangle list', sum(s['index_count'] for s in view['submeshes']) == inn)
    rule('skin bones per vertex', bn == vn or bn == view['bone_properties_count'])
    # skel
    chunks, pos = {}, 0
    while pos < len(skel):
        tag, size = skel[pos:pos + 4], struct.unpack_from('<I', skel, pos + 4)[0]
        chunks[tag] = skel[pos + 8:pos + 8 + size]
        pos += 8 + size
    rule('skel has SKL1, SKS1, SKB1, SKA1', all(t in chunks for t in (b'SKL1', b'SKS1', b'SKB1', b'SKA1')))
    seqs = m.sequences()
    sks = chunks[b'SKS1']
    sq_n, sq_o = struct.unpack_from('<II', sks, 8)
    rule('sequence count', sq_n == len(seqs))
    rule('sequence durations', all(struct.unpack_from('<HHI', sks, sq_o + 64 * k)[2] == seqs[k]['length'] for k in range(sq_n)))
    skb = chunks[b'SKB1']
    b_n, b_o = struct.unpack_from('<II', skb, 0)
    bones = m.bones()
    rule('bone count', b_n == len(bones))
    rule('bone parents and pivots', all(struct.unpack_from('<iIhH', skb, b_o + 88 * k)[2] == bones[k]['parent']
                                         and struct.unpack_from('<3f', skb, b_o + 88 * k + 76) == tuple(bones[k]['pivot']) for k in range(b_n)))
    def keys(rec_off, which, seq_index):
        base = b_o + rec_off + 16 + 20 * which
        interp, gseq, tn_, to_, vn_, vo_ = struct.unpack_from('<HhIIII', skb, base)
        if not tn_:
            return None
        k = 0 if gseq >= 0 else seq_index
        if k >= tn_:
            return None
        cnt, off = struct.unpack_from('<II', skb, to_ + 8 * k)
        times = struct.unpack_from(f'<{cnt}I', skb, off) if cnt else ()
        return cnt, times
    good = checked = 0
    for bi, b in enumerate(bones):
        for which, name in enumerate(('translation', 'rotation', 'scale')):
            t = b[name]
            if not t['values'] or t['global_sequence'] >= 0 or not t['ranges']:
                continue
            for si in range(0, len(seqs), 7):
                lo, hi = t['ranges'][si]
                want = hi - lo + 1 if hi >= lo else 0
                got = keys(88 * bi, which, si)
                checked += 1
                good += (got[0] if got else 0) == want and (not want or list(got[1]) == [t['times'][i] - seqs[si]['start'] for i in range(lo, hi + 1)])
    rule(f'animation key counts and times round-trip ({checked} tracks sampled)', checked > 0 and good == checked)
    ska = chunks[b'SKA1']
    rule('attachment count', struct.unpack_from('<I', ska, 0)[0] == len(m.attachments()))
    return ok, bad


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    data = open(argv[0], 'rb').read()
    files, ids = convert(data, int(argv[2]) if len(argv) > 2 else 9000000)
    for rel, blob in files.items():
        path = os.path.join(argv[1], rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(blob)
        print(f'{rel}: {len(blob)} bytes')
    json.dump(ids, open(os.path.join(argv[1], 'ids.json'), 'w'), indent=1)
    ok, bad = verify(data, files)
    print(f'verify: {len(ok)} passed, {len(bad)} failed')
    for b in bad:
        print('  FAILED:', b)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
