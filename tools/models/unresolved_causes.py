"""Sorts the partly recovered and unresolved equipment rows of the audit into causes.

    python tools/models/unresolved_causes.py <model-recovery-mapping.json> [out.md]

Reads the mapping that recover_audit.py writes (under tools/models/out) and groups every Partially Recovered and Unresolved item-slot pair by why
it is not exact: missing item metadata, a missing source asset, a missing texture variant, an unsupported model format and so on. Each group
says whether anything more can be done from the client alone. Nothing is guessed: a row that fits no known pattern is listed as 'other'.
"""
import collections
import json
import re
import sys

# (cause, what it means, can the client alone fix it?)
CAUSES = [
    ('missing item metadata', 'the OctoWoW item page and the client cache name no display id for the item', 'No: the display id lives on the server.'),
    ('display id not in the client', 'the display id is not a row of ItemDisplayInfo.dbc', 'No: the client has no such appearance.'),
    ('missing source asset: no model named', 'the display row names no model file for the slot', 'No: nothing to convert.'),
    ('missing source asset: no helm model for the races', 'the helm model files for the race and sex variants are absent from the archives', 'No: the files are not in the client.'),
    ('missing source asset: texture not found', 'the display names a texture the archives do not hold', 'No: the file is not in the client.'),
    ('missing texture variant (one sex)', 'a body texture exists for one sex only; the other sex has no file', 'No: the client itself shows no texture there.'),
    ('unsupported model format', 'a weapon model is version 257, read with the version 256 layout and checked for plausibility only', 'Partly: needs a version 257 reader and a visual check.'),
]


def classify(row):
    reason = row.get('reason', '')
    low = reason.lower()
    if 'names no display id' in low:
        return CAUSES[0][0]
    if 'not in itemdisplayinfo' in low:
        return CAUSES[1][0]
    if 'version 257' in low:
        return CAUSES[6][0]
    if 'no left model named' in low or 'no right model named' in low or 'no helm model named' in low or 'no assets named' in low:
        return CAUSES[2][0]
    if 'no helm model for race' in low:
        return CAUSES[3][0]
    if re.search(r'texture .* not found|cape texture', low):
        return CAUSES[4][0]
    if re.search(r'no (male|female) texture in the client', low):
        return CAUSES[5][0]
    return 'other'


def report(rows):
    bad = [r for r in rows if r['category'] in ('Partially Recovered', 'Unresolved')]
    groups = collections.defaultdict(list)
    for row in bad:
        groups[classify(row)].append(row)
    meaning = {c[0]: c for c in CAUSES}
    lines = ['# Unresolved and partly recovered equipment, by cause', '',
             f'{len(bad)} item-slot pairs: ' + ', '.join(f'{k} {v}' for k, v in collections.Counter(r['category'] for r in bad).items()), '',
             '| cause | pairs | items | what it means | fixable from the client? |', '|---|---|---|---|---|']
    for cause, items in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        info = meaning.get(cause, (cause, 'no known pattern', 'Unknown: read the rows.'))
        lines.append(f'| {cause} | {len(items)} | {len({r["itemId"] for r in items})} | {info[1]} | {info[2]} |')
    lines += ['', '## Rows', '']
    for cause, items in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        lines.append(f'### {cause}')
        for row in sorted(items, key=lambda r: (r['slot'], r['itemId'])):
            lines.append(f'- {row["itemId"]} {row["name"]} ({row["slot"]}, display {row.get("displayId")}): {row.get("reason", "")[:160]}')
        lines.append('')
    return '\n'.join(lines)


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    rows = json.load(open(argv[0], encoding='utf-8'))['rows']
    text = report(rows)
    if len(argv) > 1:
        open(argv[1], 'w', encoding='utf-8').write(text)
    print(text.split('## Rows')[0])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
