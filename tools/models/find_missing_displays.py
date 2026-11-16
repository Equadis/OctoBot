"""Finds which catalogue items have no appearance record in Zam's Classic library (so the Dressing Room shows "No preview").

    python tools/models/find_missing_displays.py <out folder> [--slots 4,5,6] [--workers 3] [--delay 0.2] [--limit N]

For each catalogue item in the chosen inventory types it asks the appearance Worker for the item's display ids (the Worker reads the item's
OctoWoW database page, cached for a day) and then whether the Classic library has the record for one of them. Results are appended to
<out folder>/lookups.jsonl as it goes, so a stopped run resumes where it left off and nothing is asked twice.
Writes <out folder>/missing.json: {"<kind>:<viewer slot>:<display id>": [item ids]} for every record Zam lacks.

Be gentle: every item is one request to OctoWoW's database through the Worker. Defaults are 3 workers and a short pause. The output folder
holds only item and display ids; it is not game data, but keep it outside the repository anyway.
"""
import collections
import concurrent.futures as cf
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request

ENDPOINT = 'https://octobot-population.eqvoice.workers.dev'
HERE = os.path.dirname(os.path.abspath(__file__))
CATALOGUE = os.path.join(HERE, '..', '..', 'docs', 'sim', 'data', 'items', 'catalogue.json')
ARMOUR_TYPES = {1, 3, 4, 5, 6, 7, 8, 9, 10, 16, 19, 20}
WEAPON_TYPES = {13, 14, 15, 17, 21, 22, 23, 25, 26}


def record_path(inventory_type, display_id):
    """Where the Classic library keeps this look: weapons, shields and ranged use meta/item, everything else meta/armor/<viewer slot>."""
    if inventory_type in WEAPON_TYPES:
        return f'meta/item/{display_id}.json', f'item:0:{display_id}'
    slot = 5 if inventory_type == 20 else inventory_type          # robes use the chest slot
    return f'meta/armor/{slot}/{display_id}.json', f'armor:{slot}:{display_id}'


def fetch(url, retries=2):
    for attempt in range(retries + 1):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'octobot-appearance-audit'})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            if error.code in (404, 403):
                return error.code, b''
            status = error.code
        except Exception:
            status = 0
        time.sleep(0.5 * (attempt + 1))
    return status, b''


class Finder:
    def __init__(self, folder, workers=3, delay=0.2, endpoint=ENDPOINT):
        self.folder, self.workers, self.delay, self.endpoint = folder, workers, delay, endpoint
        os.makedirs(folder, exist_ok=True)
        self.log_path = os.path.join(folder, 'lookups.jsonl')
        self.lock = threading.Lock()
        self.done = {}                  # item id -> result row
        self.exists = {}                # record key -> True / False
        if os.path.exists(self.log_path):
            with open(self.log_path, encoding='utf8') as handle:
                for line in handle:
                    try:
                        row = json.loads(line)
                    except ValueError:
                        continue
                    self.done[row['item']] = row
                    for key, value in row.get('checked', {}).items():
                        self.exists[key] = value

    def check(self, item):
        if item['id'] in self.done:
            return self.done[item['id']]
        time.sleep(self.delay)
        status, body = fetch(f"{self.endpoint}/api/outfitter/item/{item['id']}")
        row = {'item': item['id'], 'slot': item['slot'], 'status': 'lookup-failed', 'display': None, 'key': None, 'checked': {}}
        if status == 200:
            candidates = json.loads(body).get('candidates') or []
            row['status'] = 'no-display' if not candidates else 'missing'
            for display in candidates:
                path, key = record_path(item['slot'], display)
                if key not in self.exists:
                    time.sleep(self.delay)
                    code, _ = fetch(f'{self.endpoint}/api/outfitter/assets/{path}')
                    if code in (200, 404, 403):
                        self.exists[key] = code == 200
                row['checked'][key] = self.exists.get(key)
                if self.exists.get(key):
                    row.update(status='has-record', display=display, key=key)
                    break
                row['display'], row['key'] = candidates[0], record_path(item['slot'], candidates[0])[1]
        with self.lock:
            self.done[item['id']] = row
            with open(self.log_path, 'a', encoding='utf8') as handle:
                handle.write(json.dumps(row) + '\n')
        return row

    def run(self, items, log=print):
        started, total, count = time.time(), len(items), 0
        with cf.ThreadPoolExecutor(self.workers) as pool:
            for _ in pool.map(self.check, items):
                count += 1
                if count % 200 == 0:
                    log(f'  {count}/{total} items, {time.time() - started:.0f}s')
        missing = collections.defaultdict(list)
        for row in self.done.values():
            if row['status'] == 'missing' and row['key']:
                missing[row['key']].append(row['item'])
        with open(os.path.join(self.folder, 'missing.json'), 'w') as handle:
            json.dump(dict(sorted(missing.items())), handle)
        counts = collections.Counter(row['status'] for row in self.done.values())
        log(f'{dict(counts)}; {len(missing)} records missing in Zam')
        return missing


def select_items(slots=None, limit=None, catalogue=CATALOGUE):
    with open(catalogue, encoding='utf8') as handle:
        items = json.load(handle)
    chosen = [i for i in items if i.get('slot') in (slots or (ARMOUR_TYPES | WEAPON_TYPES))]
    return chosen[:limit] if limit else chosen


def main(argv):
    args, options, i = [], {'slots': None, 'workers': 3, 'delay': 0.2, 'limit': None}, 0
    while i < len(argv):
        if argv[i] in ('--slots', '--workers', '--delay', '--limit'):
            key = argv[i][2:]
            options[key] = {'slots': lambda v: {int(x) for x in v.split(',')}, 'workers': int, 'delay': float, 'limit': int}[key](argv[i + 1])
            i += 2
        else:
            args.append(argv[i])
            i += 1
    if len(args) != 1:
        print(__doc__)
        return 2
    items = select_items(options['slots'], options['limit'])
    print(f'{len(items)} catalogue items')
    Finder(args[0], options['workers'], options['delay']).run(items)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
