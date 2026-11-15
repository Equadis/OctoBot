"""BLP texture to WebP, for the model conversion project (see README.md, step 4).

    python tools/models/blp.py <Data folder> <out folder> <path-in-client> [...]

Reads each named BLP from the newest archive that holds it, decodes it (Pillow handles BLP1/BLP2, palette and DXT), and writes a lossless
WebP named after the file id that m2v274 invented for it (ids.json from that run), or after the file name when no id is known.
Output stays local. Nothing derived from client files is published (see the rules in README.md).
"""
import io
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import octo_mpq  # noqa: E402


def decode_palette_blp2(data):
    """BLP2 with a 256-colour palette (encoding 1). Pillow reads the 8-bit alpha of these as all zero, so this decodes them directly.
    Layout: header, 16 mip offsets, 16 mip sizes, palette (256 BGRA), then per mip the indices followed by the alpha plane."""
    import struct
    _, kind, encoding, alpha_depth, _, _, w, h = struct.unpack_from('<4sIBBBBII', data, 0)
    offset, size = struct.unpack_from('<I', data, 20)[0], struct.unpack_from('<I', data, 84)[0]
    palette = [data[148 + 4 * i:152 + 4 * i] for i in range(256)]
    mip = data[offset:offset + size]
    count = w * h
    indices, plane = mip[:count], mip[count:]
    out = bytearray(count * 4)
    for i, ix in enumerate(indices):
        b, g, r, _ = palette[ix]
        if alpha_depth == 8:
            a = plane[i]
        elif alpha_depth == 4:
            a = (plane[i >> 1] >> (4 * (i & 1)) & 15) * 17
        elif alpha_depth == 1:
            a = 255 if plane[i >> 3] >> (i & 7) & 1 else 0
        else:
            a = 255
        out[4 * i:4 * i + 4] = bytes((r, g, b, a))
    return Image.frombytes('RGBA', (w, h), bytes(out)), alpha_depth > 0


def blp_to_webp(data):
    """Returns (webp bytes, width, height, has_alpha). Raises ValueError for anything that is not a BLP."""
    if data[:4] not in (b'BLP1', b'BLP2'):
        raise ValueError('not a BLP file')
    if data[:4] == b'BLP2' and data[4] == 1 and data[8] == 1:      # type 1, palette encoding
        image, has_alpha = decode_palette_blp2(data)
    else:
        image = Image.open(io.BytesIO(data))
        image.load()
        has_alpha = image.mode in ('RGBA', 'LA', 'PA') or 'transparency' in image.info
    image = image.convert('RGBA' if has_alpha else 'RGB')
    out = io.BytesIO()
    image.save(out, 'WEBP', lossless=True, quality=100, method=4)
    return out.getvalue(), image.width, image.height, has_alpha


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    client = octo_mpq.Client(argv[0])
    os.makedirs(argv[1], exist_ok=True)
    ids = {}
    for candidate in (os.path.join(argv[1], 'ids.json'), os.path.join(argv[1], '..', 'ids.json')):
        if os.path.exists(candidate):
            ids = {k.upper(): v for k, v in json.load(open(candidate)).get('textures', {}).items()}
            break
    status = 0
    for name in argv[2:]:
        data = client.read(name)
        if data is None:
            print(f'{name}: not found')
            status = 1
            continue
        webp, w, h, alpha = blp_to_webp(data)
        stem = str(ids.get(name.upper(), name.replace('\\', '__')))
        open(os.path.join(argv[1], stem + '.webp'), 'wb').write(webp)
        print(f'{name}: {w}x{h}{" +alpha" if alpha else ""} -> {stem}.webp ({len(webp)} bytes)')
    return status


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
