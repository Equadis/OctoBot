"""Contact sheets that put each shop token's own picture beside the viewer's render of the skin linked to it.

    python tools/models/skin_validation_sheet.py <skins overlay folder> <renders folder> <out folder> [--per-sheet 7]

Renders come from render_skins.mjs. One row per token: the shop picture and the render for the male body, then the same for the female body (a missing look is left empty).
The sheets are for looking at: a render that resembles the picture is evidence the link is right, not proof (the shop pictures wear equipment and use the game's lighting).
Writes sheet-1.png, sheet-2.png ... and prints which tokens each holds.
"""
import json
import os
import sys

from PIL import Image, ImageDraw

W, H = 150, 215


def load_thumb(folder, file_id):
    image = Image.open(os.path.join(folder, 'textures', f'{file_id}.webp')).convert('RGBA')
    back = Image.new('RGBA', image.size, (40, 40, 40, 255))
    back.alpha_composite(image)
    return back.convert('RGB')


def main(argv):
    skip = {argv.index('--per-sheet') + 1} if '--per-sheet' in argv else set()
    args = [a for i, a in enumerate(argv) if not a.startswith('--') and i not in skip]
    if len(args) != 3:
        print(__doc__)
        return 2
    overlay, renders, out = args
    per = int(argv[argv.index('--per-sheet') + 1]) if '--per-sheet' in argv else 7
    os.makedirs(out, exist_ok=True)
    skins = [s for s in json.load(open(os.path.join(overlay, 'skins', 'catalogue.json')))['skins'] if s['tokenItemId'] and s['variants']]
    skins.sort(key=lambda s: (s['category'], s['name']))
    for sheet_no, start in enumerate(range(0, len(skins), per), 1):
        group = skins[start:start + per]
        sheet = Image.new('RGB', (W * 4 + 150, len(group) * (H + 16)), (20, 20, 20))
        draw = ImageDraw.Draw(sheet)
        for row, skin in enumerate(group):
            y = row * (H + 16)
            draw.text((4, y + 2), f"{skin['tokenItemId']} {skin['name'][:60]}  [{skin['status']}, {skin['mapping'].get('confidence') or '-'}]", fill=(255, 220, 120))
            for col, gender in enumerate((0, 1)):
                variant = next((v for v in skin['variants'] if v['gender'] == gender), None)
                x = col * W * 2
                thumbs = skin['thumbnails']
                key = ('_1', '-', '_2') if gender == 0 else ('_2', '-', '_1')
                file_id = next((thumbs[k] for k in key if k in thumbs), None)
                if file_id and (variant or gender == 0):
                    pic = load_thumb(overlay, file_id)
                    pic.thumbnail((W, H))
                    sheet.paste(pic, (x, y + 16))
                if variant:
                    path = os.path.join(renders, f"{skin['id']}__{variant['texture']['race']}-{variant['gender']}.png")
                    if os.path.exists(path):
                        shot = Image.open(path).convert('RGB')
                        shot = shot.crop((0, 0, shot.width, int(shot.height * 0.78)))
                        shot.thumbnail((W, H))
                        sheet.paste(shot, (x + W, y + 16))
                else:
                    draw.text((x + W + 6, y + 100), 'no look', fill=(120, 120, 120))
        name = os.path.join(out, f'sheet-{sheet_no}.png')
        sheet.save(name)
        print(name, [s['tokenItemId'] for s in group])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
