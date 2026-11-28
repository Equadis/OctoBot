"""Item id -> display id table for the Dressing Room's items, local sources first.

    python tools/models/resolve_displays.py <Data folder> <WDB folder> <Tmog addon folder> [--fetch] [--validate N]

Sources, in order of trust (each row records which one gave its display id):

  itemcache   the client's own item cache (WDB/itemcache.wdb): exact.
  tmog-group  OctoWoW's Tmog addon lists items that share one appearance (Data/DisplayGroups.lua). When every member the client knows has the
              same model and body textures in ItemDisplayInfo.dbc, an unknown member inherits that appearance. The display id kept is the most
              common one in the group, so it names the right assets but may not be the item's own number. Groups whose known members
              disagree on assets are skipped. Not a name or icon match: it is the server's own same-look rule.
  octowow-db  only with --fetch, and only for items the two local sources cannot place: one page of octowow.st/db per item (the same page
              the Worker reads), 4 at a time with a pause, cached on disk so a rerun asks for nothing it already has. No models are downloaded.

--validate N also fetches N random tmog-group items to measure how often the inherited assets equal the database's own.
Output: tools/models/out/item-displays.json (git-ignored).
"""
import json
import os
import random
import re
import sys
import threading
import time
import urllib.request
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import local_audit  # noqa: E402
import octo_mpq  # noqa: E402

OUT = os.path.join(local_audit.ROOT, 'tools', 'models', 'out')
FETCH_CACHE = os.path.join(OUT, 'octowow-display-cache.json')


def signature(assets, display_id):
    row = assets.rows.get(display_id)
    if not row:
        return None
    s = assets.string
    return tuple(s(row[i]).lower() for i in (1, 2, 3, 4)) + tuple(s(row[i]).lower() for i in range(14, 22)) + tuple(row[7:10])


def fetch_page(item_id):
    request = urllib.request.Request(f'https://octowow.st/db/?item={item_id}', headers={'User-Agent': 'local-model-audit'})
    for attempt in range(3):
        try:
            html = urllib.request.urlopen(request, timeout=25).read().decode('utf-8', 'replace')
            match = re.search(r'Display\s+ID:\s*(\d+)', html, re.I)
            return int(match.group(1)) if match else 0       # 0: the page names no display id (not an error)
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None                                              # network failure: never recorded as "no display id"


def fetch_all(ids, cache):
    todo = [i for i in ids if str(i) not in cache]
    lock, position, done = threading.Lock(), [0], [0]

    def worker():
        while True:
            with lock:
                if position[0] >= len(todo):
                    return
                item = todo[position[0]]
                position[0] += 1
            value = fetch_page(item)
            with lock:
                if value is not None:
                    cache[str(item)] = value
                done[0] += 1
                if done[0] % 250 == 0:
                    json.dump(cache, open(FETCH_CACHE, 'w'))
                    print(f'fetched {done[0]}/{len(todo)}', flush=True)
            time.sleep(0.15)
    threads = [threading.Thread(target=worker) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    json.dump(cache, open(FETCH_CACHE, 'w'))


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    if len(args) < 3:
        print(__doc__)
        return 2
    data_dir, wdb_dir, tmog_dir = args[:3]
    fetch = '--fetch' in argv
    validate = int(argv[argv.index('--validate') + 1]) if '--validate' in argv else 0
    if validate:
        args = [a for a in args if a != str(validate)]
    client = octo_mpq.Client(data_dir)
    assets = local_audit.Assets(client)
    cache = local_audit.load_itemcache(os.path.join(wdb_dir, 'itemcache.wdb'))
    catalogue = json.load(open(local_audit.CATALOGUE, encoding='utf-8'))
    wanted = sorted({i['id'] for i in catalogue if i.get('slot') in {t for _, _, ts in local_audit.SLOTS for t in ts}
                     and i.get('classs') in (2, 4)})
    table = {}
    for item_id in wanted:
        if item_id in cache and cache[item_id][2]:
            table[item_id] = {'displayId': cache[item_id][2], 'source': 'itemcache'}
    src = open(os.path.join(tmog_dir, 'Data', 'DisplayGroups.lua'), encoding='utf-8').read()
    groups = [[int(x) for x in g.split(',') if x.strip()] for g in re.findall(r'\{([\d,\s]+)\}', src)]
    skipped = 0
    for group in groups:
        known = [table[i]['displayId'] for i in group if i in table and table[i]['source'] == 'itemcache']
        if not known:
            continue
        sigs = {signature(assets, d) for d in known}
        if len(sigs) != 1 or None in sigs:
            skipped += 1
            continue
        pick = Counter(known).most_common(1)[0][0]
        for i in group:
            if i in wanted and i not in table:
                table[i] = {'displayId': pick, 'source': 'tmog-group'}
    print(f'itemcache {sum(v["source"] == "itemcache" for v in table.values())}, tmog-group {sum(v["source"] == "tmog-group" for v in table.values())}, '
          f'groups skipped for disagreeing assets {skipped}, still unknown {len([i for i in wanted if i not in table])} of {len(wanted)}')
    fetched = json.load(open(FETCH_CACHE)) if os.path.exists(FETCH_CACHE) else {}
    if validate:
        random.seed(1)
        sample = random.sample([i for i, v in table.items() if v['source'] == 'tmog-group'], validate)
        fetch_all(sample, fetched)
        same = sum(1 for i in sample if signature(assets, fetched.get(str(i), -1)) == signature(assets, table[i]['displayId']))
        print(f'validation: {same}/{len(sample)} tmog-group items have the same assets as the database says')
    if fetch:
        unknown = [i for i in wanted if i not in table]
        fetch_all(unknown, fetched)
    for i in wanted:
        if i not in table and fetched.get(str(i)):
            table[i] = {'displayId': fetched[str(i)], 'source': 'octowow-db'}
    os.makedirs(OUT, exist_ok=True)
    json.dump({str(k): v for k, v in sorted(table.items())}, open(os.path.join(OUT, 'item-displays.json'), 'w'), indent=0)
    print('sources:', dict(Counter(v['source'] for v in table.values())), 'unresolved:', len([i for i in wanted if i not in table]))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
