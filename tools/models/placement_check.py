"""Static check of where items attach on every body: the shield point (attachment 0) and the right and left hand points (1 and 2).

    python tools/models/placement_check.py <overlay folder> [--zam-base <assets url>] [--json out.json]

Reads the attachment table of each character model (the converted Goblin and High Elf from the overlay's skeleton files; with --zam-base the library's own races from the appearance
service) and reports, per body, whether the three points exist, whether the right hand is on the right (negative y) and the left on the left, how symmetric the two hands are, where
the shield point sits relative to the left hand (as a fraction of the body's height) and how that compares with the library's races (the distance in units of the hand's offset from the middle line). A body outside the library's range is flagged
for a look, not judged wrong: the numbers come from the client's own models.
This is a numbers check. Whether an item looks right in the hand is judged in the viewer (render_gear.mjs, placement_matrix.mjs).
"""
import json
import os
import struct
import sys
import urllib.request

HAND_RIGHT, HAND_LEFT, SHIELD = 1, 2, 0


def attachments_v274(md, base=0):
    """{id: (x, y, z)} from an MD20 body (attachments array at header offset 0xF0, 40 bytes each)."""
    count, offset = struct.unpack_from('<II', md, 0xF0)
    return {struct.unpack_from('<I', md, offset + 40 * k)[0]: struct.unpack_from('<3f', md, offset + 40 * k + 8) for k in range(count)}


def attachments_skel(skel):
    """{id: (x, y, z)} from a SKA1 chunk of a .skel file (the converted bodies keep them there)."""
    pos = 0
    while pos + 8 <= len(skel):
        tag, size = skel[pos:pos + 4], struct.unpack_from('<I', skel, pos + 4)[0]
        if tag == b'SKA1':
            body = skel[pos + 8:pos + 8 + size]
            count, offset = struct.unpack_from('<II', body, 0)
            return {struct.unpack_from('<I', body, offset + 40 * k)[0]: struct.unpack_from('<3f', body, offset + 40 * k + 8) for k in range(count)}
        pos += 8 + size
    return {}


def check_body(attachments, height):
    """Findings and numbers for one body. `height` is the model's height in the same units as the attachment positions."""
    problems = []
    for ident, name in ((SHIELD, 'shield'), (HAND_RIGHT, 'right hand'), (HAND_LEFT, 'left hand')):
        if ident not in attachments:
            problems.append(f'no {name} attachment')
    if problems:
        return {'problems': problems}
    right, left, shield = attachments[HAND_RIGHT], attachments[HAND_LEFT], attachments[SHIELD]
    if not right[1] < 0 < left[1]:
        problems.append(f'hands are on the wrong sides (right y {right[1]:.3f}, left y {left[1]:.3f})')
    asymmetry = abs(abs(right[1]) - abs(left[1])) / max(abs(left[1]), 1e-6)
    if asymmetry > 0.2:
        problems.append(f'the hands are {asymmetry:.0%} apart in width')
    if abs(right[2] - left[2]) / max(abs(left[1]), 1e-6) > 0.15:
        problems.append('the hands are at different heights')
    if not shield[1] > 0:
        problems.append('the shield point is not on the left side')
    # The library's model bounding boxes are not in the same units as the converted ones (their "height" is about twice the real one), so nothing is normalised by height:
    # the shield point's distance from the left hand is compared with how far the hand is from the body's middle line.
    gap = sum((a - b) ** 2 for a, b in zip(shield, left)) ** 0.5 / max(abs(left[1]), 1e-6)
    return {'problems': problems, 'shield_gap_over_arm_offset': round(gap, 2)}


def median(values):
    values = sorted(values)
    return values[len(values) // 2] if values else None


def fetch(base, path):
    return urllib.request.urlopen(urllib.request.Request(base + path, headers={'User-Agent': 'octobot-placement'}), timeout=60).read()


def main(argv):
    args = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or not argv[i - 1].startswith('--'))]
    if len(args) != 1:
        print(__doc__)
        return 2
    folder = args[0]
    zam = argv[argv.index('--zam-base') + 1] if '--zam-base' in argv else None
    results = {}
    for body in range(1, 21):
        record = json.load(open(os.path.join(folder, 'meta', 'character', f'{body}.json'))) if body >= 17 else None
        try:
            if body >= 17:
                model_id = record['Model']
                m2 = open(os.path.join(folder, 'm2', f'{model_id}.m2'), 'rb').read()
                md = m2[8:8 + struct.unpack_from('<I', m2, 4)[0]]
                bbox = struct.unpack_from('<6f', md, 0xA0)
                tail = m2[8 + len(md):]
                skel_id = None
                pos = 0
                while pos + 8 <= len(tail):
                    tag, size = tail[pos:pos + 4], struct.unpack_from('<I', tail, pos + 4)[0]
                    if tag == b'SKID':
                        skel_id = struct.unpack_from('<I', tail, pos + 8)[0]
                    pos += 8 + size
                attachments = attachments_skel(open(os.path.join(folder, 'skel', f'{skel_id}.skel'), 'rb').read())
            elif zam:
                model_id = json.loads(fetch(zam, f'meta/character/{body}.json'))['Model']
                m2 = fetch(zam, f'm2/{model_id}.m2')
                md = m2[8:8 + struct.unpack_from('<I', m2, 4)[0]]
                bbox = struct.unpack_from('<6f', md, 0xA0)
                attachments = attachments_v274(md)
            else:
                continue
            results[body] = check_body(attachments, bbox[5] - bbox[2])
        except (OSError, KeyError, struct.error, ValueError) as error:
            results[body] = {'problems': [f'could not read: {error}']}
    library = [r['shield_gap_over_arm_offset'] for b, r in results.items() if b < 17 and 'shield_gap_over_arm_offset' in r and not r['problems']]
    low, high = (min(library), max(library)) if library else (None, None)
    for body, r in sorted(results.items()):
        note = ''
        if 'shield_gap_over_arm_offset' in r and low is not None and not low * 0.9 <= r['shield_gap_over_arm_offset'] <= high * 1.1:
            note = f'  outside the library range {low}-{high}: look at it in the viewer'
        print(f"body {body:2d}: {'; '.join(r['problems']) or 'ok'}  {({k: v for k, v in r.items() if k != 'problems'})}{note}")
    if '--json' in argv:
        json.dump(results, open(argv[argv.index('--json') + 1], 'w'), indent=1)
    return 1 if any(r['problems'] for r in results.values()) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
