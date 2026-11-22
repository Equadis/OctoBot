"""Contact sheet of equipment renders (render_gear.mjs), cropped to the torso and hands so item placement can be judged.

    python tools/models/gear_sheet.py <renders folder> <out.png> [--match text] [--cols 4] [--crop x0,y0,x1,y1]

--crop is a fraction of the model panel (default 0.12,0.17,0.88,0.64: shoulders to knees). Labels are the case names.
"""
import os
import sys

from PIL import Image, ImageDraw


def main(argv):
    args = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or not argv[i - 1].startswith('--'))]
    if len(args) != 2:
        print(__doc__)
        return 2
    folder, out = args
    match = argv[argv.index('--match') + 1] if '--match' in argv else ''
    cols = int(argv[argv.index('--cols') + 1]) if '--cols' in argv else 4
    crop = [float(v) for v in (argv[argv.index('--crop') + 1] if '--crop' in argv else '0.12,0.17,0.88,0.64').split(',')]
    names = sorted(f[:-4] for f in os.listdir(folder) if f.endswith('.png') and match in f)
    if not names:
        print('no renders match')
        return 1
    cells = []
    for name in names:
        image = Image.open(os.path.join(folder, name + '.png')).convert('RGB')
        w, h = image.size
        cells.append((image.crop((int(w * crop[0]), int(h * crop[1]), int(w * crop[2]), int(h * crop[3]))), name))
    cw = 330
    ch = int(cells[0][0].height * cw / cells[0][0].width)
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cw, rows * (ch + 14)), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)
    for i, (image, name) in enumerate(cells):
        x, y = (i % cols) * cw, (i // cols) * (ch + 14)
        sheet.paste(image.resize((cw, ch), Image.LANCZOS), (x, y + 14))
        draw.text((x + 2, y + 1), name, fill=(255, 220, 120))
    sheet.save(out)
    print(out, sheet.size, len(cells))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
