"""Read-only MPQ tool for the OctoWoW client, used by the model conversion project (see README.md).

    python tools/models/octo_mpq.py probe   <Data folder> <path-in-archive> [...]
    python tools/models/octo_mpq.py extract <archive.mpq> <out folder> <path-in-archive> [...]

`probe` reports which archives in a Data folder hold each path (only headers and tables are read).
`extract` writes the named files to a local folder. Extracted game files must stay local: do not commit them.
Supports the compressions these archives use (zlib, bzip2) and fails loudly on anything else.
"""
import bz2, glob, os, struct, sys, zlib

# ---- MPQ hashing and table encryption (the documented format) ----
_crypt = [0] * 0x500
_seed = 0x00100001
for _i in range(0x100):
    _j = _i
    for _ in range(5):
        _seed = (_seed * 125 + 3) % 0x2AAAAB
        _a = (_seed & 0xFFFF) << 16
        _seed = (_seed * 125 + 3) % 0x2AAAAB
        _crypt[_j] = _a | (_seed & 0xFFFF)
        _j += 0x100


def mpq_hash(text, kind):
    s1, s2 = 0x7FED7FED, 0xEEEEEEEE
    for ch in text.upper().replace('/', '\\'):
        c = ord(ch)
        s1 = _crypt[(kind << 8) + c] ^ ((s1 + s2) & 0xFFFFFFFF)
        s2 = (c + s1 + s2 + (s2 << 5) + 3) & 0xFFFFFFFF
    return s1


def _decrypt(data, key):
    out, s2 = [], 0xEEEEEEEE
    for (v,) in struct.iter_unpack('<I', data):
        s2 = (s2 + _crypt[0x400 + (key & 0xFF)]) & 0xFFFFFFFF
        v = (v ^ ((key + s2) & 0xFFFFFFFF)) & 0xFFFFFFFF
        key = ((((~key) & 0xFFFFFFFF) << 0x15) + 0x11111111 | (key >> 0x0B)) & 0xFFFFFFFF
        s2 = (v + s2 + ((s2 << 5) & 0xFFFFFFFF) + 3) & 0xFFFFFFFF
        out.append(v)
    return out


class Archive:
    def __init__(self, path):
        self.path = path
        size = os.path.getsize(path)
        with open(path, 'rb') as f:
            self.base = None
            for off in range(0, min(size, 64 * 1024 * 1024), 512):
                f.seek(off)
                sig = f.read(4)
                if sig == b'MPQ\x1a':
                    self.base = off
                    break
                if sig == b'MPQ\x1b':
                    f.seek(off + 8)
                    self.base = off + struct.unpack('<I', f.read(4))[0]
                    break
            if self.base is None:
                raise ValueError('not an MPQ archive')
            f.seek(self.base)
            (_, _, _, self.version, shift, hpos, bpos, self.hcount, self.bcount) = struct.unpack('<4sIIHHIIII', f.read(32))
            self.sector = 512 << shift
            f.seek(self.base + hpos)
            self.hash = _decrypt(f.read(self.hcount * 16), mpq_hash('(hash table)', 3))
            f.seek(self.base + bpos)
            self.block = _decrypt(f.read(self.bcount * 16), mpq_hash('(block table)', 3))

    def find(self, name):
        n, start = self.hcount, mpq_hash(name, 0) & (self.hcount - 1)
        a, b, i = mpq_hash(name, 1), mpq_hash(name, 2), start
        while True:
            e = self.hash[i * 4:i * 4 + 4]
            if e[3] == 0xFFFFFFFF and e[0] == 0xFFFFFFFF:
                return None
            if e[0] == a and e[1] == b and e[3] < self.bcount:
                pos, packed, size, flags = self.block[e[3] * 4:e[3] * 4 + 4]
                return {'pos': pos, 'packed': packed, 'size': size, 'flags': flags}
            i = (i + 1) % n
            if i == start:
                return None

    def read(self, name):
        info = self.find(name)
        if info is None:
            return None
        pos, packed, size, flags = info['pos'], info['packed'], info['size'], info['flags']
        if flags & 0x10000:
            raise NotImplementedError('encrypted file')

        def unpack(chunk, expected):
            if len(chunk) >= expected:
                return chunk[:expected]
            mask, data = chunk[0], chunk[1:]
            if mask & ~0x12:
                raise NotImplementedError(f'compression mask {mask:#x}')
            if mask & 0x10:
                data = bz2.decompress(data)
            if mask & 0x02:
                data = zlib.decompress(data)
            return data

        with open(self.path, 'rb') as f:
            f.seek(self.base + pos)
            if not flags & 0x200 and not flags & 0x1000000:
                return f.read(size)
            if flags & 0x1000000:
                return unpack(f.read(packed), size)
            count = (size + self.sector - 1) // self.sector
            offsets = struct.unpack('<%dI' % (count + 1), f.read(4 * (count + 1)))
            out = bytearray()
            for k in range(count):
                f.seek(self.base + pos + offsets[k])
                out += unpack(f.read(offsets[k + 1] - offsets[k]), min(self.sector, size - k * self.sector))
            return bytes(out)


def main(argv):
    if len(argv) < 3 or argv[0] not in ('probe', 'extract'):
        print(__doc__)
        return 2
    if argv[0] == 'probe':
        for path in sorted(glob.glob(os.path.join(argv[1], '*.[mM][pP][qQ]'))):
            try:
                archive = Archive(path)
            except Exception as error:
                print(f'{os.path.basename(path):30s} {error}')
                continue
            hits = [name for name in argv[2:] if archive.find(name)]
            if hits:
                print(f'{os.path.basename(path):30s}', ', '.join(hits))
        return 0
    archive, out_dir, names = Archive(argv[1]), argv[2], argv[3:]
    os.makedirs(out_dir, exist_ok=True)
    for name in names:
        data = archive.read(name)
        if data is None:
            print(f'{name}: not in this archive')
            continue
        open(os.path.join(out_dir, name.replace('\\', '__')), 'wb').write(data)
        print(f'{name}: {len(data)} bytes, magic {data[:4]!r}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
