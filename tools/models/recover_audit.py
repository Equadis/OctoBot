"""Final audit and recovery report for the Dressing Room (local; reads the client, the cached answers and the overlay manifest).

    python tools/models/recover_audit.py <Data folder> [--wdb <WDB folder>] [--overlay <item overlay manifest.json>] [--extra <extra overlay manifest.json>] [--out <folder>]

Run after, in this order:  resolve_displays.py --fetch,  zam_compare.py,  item_overlay.py build.
Every item and slot pair the Dressing Room lists is put in one class:

  Verified            Zam's Classic library holds the display id (so the site needs no icon for it) and the client's own files for it exist
  Recovered           Zam lacks it; the overlay built a full record from the client: every asset the display row names exists, every converted
                      model passed read-back, every texture decoded
  Partially Recovered Zam lacks it; the overlay built a record but something the row names is absent from the client, or a conversion check failed
  Unresolved          anything else, with the exact reason (no display id, nothing the client holds, build failure)

'Recovered' means built and structurally checked; it is NOT visually verified, not uploaded and not in the live site. See the dependencies list
in the report. Outputs (tools/models/out, git-ignored, never to be committed or published):
  model-recovery-mapping.json  one row per pair: item, display id and where it came from, class, reason, assets
  model-recovery-progress.md   the report
"""
import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import appearance_states  # noqa: E402
import local_audit  # noqa: E402
import octo_mpq  # noqa: E402

OUT = os.path.join(local_audit.ROOT, 'tools', 'models', 'out')
SLOT_NAMES = {1: 'Head', 3: 'Shoulder', 4: 'Shirt', 5: 'Chest', 6: 'Waist', 7: 'Legs', 8: 'Feet', 9: 'Wrist', 10: 'Hands', 16: 'Back',
              19: 'Tabard', 21: 'Main hand', 22: 'Off hand', 26: 'Ranged'}


def load(name, default=None):
    path = os.path.join(OUT, name)
    return json.load(open(path, encoding='utf-8')) if os.path.exists(path) else default


def option(argv, name):
    return argv[argv.index(name) + 1] if name in argv else None


def main(argv):
    global OUT
    if not argv:
        print(__doc__)
        return 2
    displays, presence = load('item-displays.json', {}), load('zam-presence.json', {})
    fetched = load('octowow-display-cache.json', {})
    overlay = (json.load(open(option(argv, '--overlay'), encoding='utf-8')) if option(argv, '--overlay')
               else load(os.path.join('items-overlay', 'manifest.json'), {'built': [], 'failures': []}))
    built = {(e['slot'], e['displayId']): e for e in overlay['built']}
    # A second-pass overlay (item_overlay.py extra) replaces the entries of the pairs it now builds completely.
    if option(argv, '--extra'):
        extra = json.load(open(option(argv, '--extra'), encoding='utf-8'))
        for e in extra['built']:
            built[(e['slot'], e['displayId'])] = e
        overlay = dict(overlay, failures=overlay['failures'] + extra.get('failures', []), files=overlay.get('files', 0) + extra.get('files', 0))
    # The client's own item cache: a display id of 0 there is the server saying the item has no appearance.
    wdb = option(argv, '--wdb')
    cache = local_audit.load_itemcache(os.path.join(wdb, 'itemcache.wdb')) if wdb else {}
    if option(argv, '--out'):
        OUT = option(argv, '--out')
        os.makedirs(OUT, exist_ok=True)
    catalogue = json.load(open(local_audit.CATALOGUE, encoding='utf-8'))
    client = octo_mpq.Client(argv[0])
    assets = local_audit.Assets(client)
    rows, seen = [], set()
    for slot_id, _, types in local_audit.SLOTS:
        for item in sorted((i for i in catalogue if i.get('slot') in types and i.get('classs') in (2, 4)), key=lambda i: (i['name'].lower(), i['id'])):
            v = local_audit.viewer_slot(slot_id, item)
            if (item['id'], v) in seen:
                continue
            seen.add((item['id'], v))
            entry = displays.get(str(item['id']))
            row = {'itemId': item['id'], 'name': item['name'], 'viewerSlot': v, 'slot': SLOT_NAMES.get(v, str(v)),
                   'displayId': entry['displayId'] if entry else None, 'displaySource': entry['source'] if entry else None}
            if not entry:
                row.update(category='Unresolved', reason='the OctoWoW database page names no display id for this item'
                           if fetched.get(str(item['id'])) == 0 else 'no display id from the item cache, the Tmog groups or the database')
                rows.append(row)
                continue
            display = entry['displayId']
            kind, detail = local_audit.check(assets, display, v, item['slot'])
            row['clientCheck'] = kind
            row['clientMissing'] = detail.get('missingAssets', [])
            zam = presence.get(f'{v}:{display}')
            row['inZamLibrary'] = zam
            if zam is True:
                row.update(category='Verified', reason='Zam holds this display id' + ('' if kind == 'exact' else f'; client check: {kind}'))
            elif zam is None:
                row.update(category='Unresolved', reason="Zam's answer for this display id was never obtained (network)")
            else:
                made = built.get((v, display))
                if made is None:
                    row.update(category='Unresolved', reason='Zam lacks it and the overlay has no entry for it')
                elif made['status'] == 'not built':
                    row.update(category='Unresolved', reason='Zam lacks it; the client gave nothing to build: ' + ('; '.join(made['notes']) or 'no assets named'))
                else:
                    bad = [f for check in made.get('verify', []) for f in check['failed']]
                    row['overlayNotes'] = made['notes']
                    row['conversionChecks'] = made.get('verify', [])
                    if made['status'] == 'built' and not bad:
                        row.update(category='Recovered', reason='built from the client; every named asset exists and every conversion check passed')
                    else:
                        row.update(category='Partially Recovered', reason='; '.join(made['notes'] + [f'conversion check failed: {b}' for b in bad]))
            rows.append(row)
    # Pairs that are not Verified or Recovered get a cause and a state (appearance_states.py).
    for r in rows:
        r['state'] = None
        outcome = None
        if r['category'] == 'Unresolved':
            outcome = appearance_states.classify_unresolved(r, assets, cache[r['itemId']][2] if r['itemId'] in cache else None)
        elif r['category'] == 'Partially Recovered':
            outcome = appearance_states.partial_state(r)
            if outcome and outcome[0] == 'Recovered':
                r.update(category='Recovered', reason=r['reason'] + ' | ' + outcome[2])
                r['cause'], r['stateWhy'] = outcome[1], outcome[2]
                continue
            r['gapSexes'] = appearance_states.gaps_of(r)['sexes']
        if outcome:
            category, cause, why = outcome
            if category == 'Invisible':
                r['category'] = 'Invisible'
            r['state'] = appearance_states.STATE_OF.get(category, 'missing')
            r['cause'], r['stateWhy'] = cause, why
    json.dump(appearance_states.states_file(rows), open(os.path.join(OUT, 'appearance-states.json'), 'w', encoding='utf-8'), indent=1)
    counts = Counter(r['category'] for r in rows)
    items_by = defaultdict(set)
    for r in rows:
        items_by[r['category']].add(r['itemId'])
    json.dump({'counts': dict(counts), 'rows': rows}, open(os.path.join(OUT, 'model-recovery-mapping.json'), 'w', encoding='utf-8'), indent=1)
    per_slot = defaultdict(Counter)
    for r in rows:
        per_slot[r['slot']][r['category']] += 1
    lines = ['# Dressing Room model recovery: report', '',
             f'{len(rows):,} item and slot pairs, {len({r["itemId"] for r in rows}):,} items. Built from the local client; no models were downloaded.', '',
             '| Category | Pairs | Items |', '|---|---|---|']
    for c in ('Verified', 'Recovered', 'Partially Recovered', 'Invisible', 'Unresolved'):
        lines.append(f'| {c} | {counts.get(c, 0):,} | {len(items_by[c]):,} |')
    lines += ['', '## By slot', '', '| Slot | Verified | Recovered | Partially | Invisible | Unresolved |', '|---|---|---|---|---|---|']
    for slot, c in sorted(per_slot.items()):
        lines.append(f'| {slot} | {c["Verified"]} | {c["Recovered"]} | {c["Partially Recovered"]} | {c["Invisible"]} | {c["Unresolved"]} |')
    sources = Counter(r['displaySource'] for r in rows)
    lines += ['', '## Where the display ids came from', '', *(f'* {k}: {n:,} pairs' for k, n in sources.most_common()), '']
    causes = Counter((r['category'], r['state'], r['cause']) for r in rows if r.get('state'))
    lines += ['', '## Causes and states of every pair that is not Verified or Recovered', '', *(f'* {n}: {cat} / {state} / {cause}' for (cat, state, cause), n in causes.most_common()), '']
    for c in ('Partially Recovered', 'Invisible', 'Unresolved'):
        reasons = Counter(r['reason'] for r in rows if r['category'] == c)
        lines += [f'## {c}: reasons', '', *(f'* {n:,}: {why}' for why, n in reasons.most_common(25)), '']
    lines += ['## Partially Recovered: every row', '']
    for r in rows:
        if r['category'] == 'Partially Recovered':
            lines.append(f'* item {r["itemId"]} {r["name"]} ({r["slot"]}, display {r["displayId"]}): {r["reason"]}')
    lines += ['', '## Invisible and Unresolved: every pair', '']
    for r in rows:
        if r['category'] in ('Invisible', 'Unresolved'):
            lines.append(f'* item {r["itemId"]} {r["name"]} ({r["slot"]}, display {r["displayId"]}): [{r["category"]} / {r["cause"]}] {r["stateWhy"]}')
    lines += ['', '## Conversion', '', f'* overlay records built: {sum(1 for e in overlay["built"] if e["status"] != "not built")}',
              f'* files written (models, skins, skeletons, textures): {overlay.get("files", 0)}',
              f'* conversion or decode failures: {len(overlay["failures"])}', *(f'  * {f}' for f in overlay['failures'][:60]), '',
              '## Outstanding dependencies (why Recovered is not yet an icon-free site)', '',
              '1. Nothing is uploaded. The records and files are local; OctoWoW must agree before any client-derived file is hosted (README.md), and the '
              'Worker change (bucket-first item records) is not deployed.',
              '2. Not visually verified. The generator matches Zam\'s own records structurally for display ids Zam holds (oracle report), and converted '
              'models pass read-back, but nobody has compared the rendering with the game.',
              '3. The site decides icons from the OctoWoW display id AND Wowhead Classic\'s display id. A pair counted here as lacking in Zam may already '
              'preview through the Wowhead id; the Worker\'s Wowhead lookup is not reproduced locally.',
              '4. Helm hide rules come from the client\'s HelmetGeosetVisData and differ from Zam\'s in many helms by design (see README, 2026-11-18).',
              '5. Textures use the item\'s own gender files; gaps in the client are listed above, not filled by guessing.', '']
    with open(os.path.join(OUT, 'model-recovery-progress.md'), 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(lines))
    print(dict(counts))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
