"""Finds solid black patches in Dressing Room renders: the signature of a blended part (glow, flame, glass) drawn opaque (a quad whose transparency was lost).

    python tools/models/artifact_scan.py <renders folder> [--min-area 900] [--json out.json]

A render is the model panel at scale 2 (render_gear.mjs). The background is a blue gradient and models are lit, so a connected region of pure black pixels (every channel <= 3) of 900
pixels or more is not a texture. Black fur (a Tauren) and dark armour stay well under that (measured over 190 renders: the largest legitimate patch is about 500 px; the lantern's
squares before the shader fix were 1,000 to 2,600 px; none after). Prints the renders that have one and exits 1 if any do.
"""
import json
import os
import sys

from PIL import Image


def black_regions(image, min_area=900, step=2, threshold=3):
    """[(x0, y0, x1, y1, area)] of connected regions of pure black (every channel <= threshold) with at least `min_area` pixels and no side shorter than 24 px.
    Works on every `step`-th pixel, 8-connected. The defaults suit renders at scale 2 (render_gear.mjs)."""
    pixels = image.convert('RGB').load()
    w, h = image.size
    gw, gh = w // step, h // step
    black = [[max(pixels[x * step, y * step]) <= threshold for x in range(gw)] for y in range(gh)]
    seen = [[False] * gw for _ in range(gh)]
    found = []
    for sy in range(gh):
        for sx in range(gw):
            if not black[sy][sx] or seen[sy][sx]:
                continue
            stack, count = [(sx, sy)], 0
            x0 = x1 = sx
            y0 = y1 = sy
            seen[sy][sx] = True
            while stack:
                x, y = stack.pop()
                count += 1
                x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < gw and 0 <= ny < gh and black[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
            area = count * step * step
            if area >= min_area and (x1 - x0 + 1) * step >= 24 and (y1 - y0 + 1) * step >= 24:
                found.append((x0 * step, y0 * step, (x1 + 1) * step, (y1 + 1) * step, area))
    return found


def main(argv):
    args = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or not argv[i - 1].startswith('--'))]
    if len(args) != 1:
        print(__doc__)
        return 2
    min_area = int(argv[argv.index('--min-area') + 1]) if '--min-area' in argv else 900
    report = {}
    for name in sorted(os.listdir(args[0])):
        if name.endswith('.png'):
            rects = black_regions(Image.open(os.path.join(args[0], name)), min_area)
            if rects:
                report[name] = rects
                print(f'{name}: {len(rects)} black rectangle(s), largest {max(r[4] for r in rects)} px')
    if '--json' in argv:
        json.dump(report, open(argv[argv.index('--json') + 1], 'w'), indent=1)
    print(f'{len(report)} render(s) with a black rectangle')
    return 1 if report else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
