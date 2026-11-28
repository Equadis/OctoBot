"""Which (viewer slot, display id) pairs does Zam's Classic model library hold? (the library the Dressing Room previews with)

    python tools/models/zam_compare.py [item-displays.json]

Asks Zam's asset host for each pair's metadata file only (meta/armor/<slot>/<id>.json, or meta/item/<id>.json for weapons, shields and
ranged), the same file the Dressing Room's usableDisplay() asks the appearance Worker for. No models or textures are downloaded.
Answers are cached in tools/models/out/zam-presence.json; a rerun asks only for pairs it has not seen. A network failure is retried and
then left out of the cache, never recorded as 'absent'.
Output: tools/models/out/zam-presence.json  {"<viewer slot>:<display id>": true | false}
"""
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import local_audit  # noqa: E402

OUT = os.path.join(local_audit.ROOT, 'tools', 'models', 'out')
BASE = 'https://wow.zamimg.com/modelviewer/classic/meta/'


def path_for(slot, display_id):
    return f'item/{display_id}.json' if slot in (21, 22, 26) else f'armor/{slot}/{display_id}.json'


def present(slot, display_id):
    request = urllib.request.Request(BASE + path_for(slot, display_id), headers={'User-Agent': 'local-model-audit'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                json.load(response)
                return True
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return False
            time.sleep(1.5 * (attempt + 1))
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None


def pairs_from(displays_path):
    displays = json.load(open(displays_path))
    catalogue = json.load(open(local_audit.CATALOGUE, encoding='utf-8'))
    pairs = set()
    seen = set()
    for slot_id, _, types in local_audit.SLOTS:
        for item in catalogue:
            if item.get('slot') in types and item.get('classs') in (2, 4):
                v = local_audit.viewer_slot(slot_id, item)
                entry = displays.get(str(item['id']))
                if entry and (item['id'], v) not in seen:
                    seen.add((item['id'], v))
                    pairs.add((v, entry['displayId']))
    return sorted(pairs)


def main(argv):
    displays_path = argv[0] if argv else os.path.join(OUT, 'item-displays.json')
    cache_path = os.path.join(OUT, 'zam-presence.json')
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    todo = [p for p in pairs_from(displays_path) if f'{p[0]}:{p[1]}' not in cache]
    print(f'{len(todo)} pairs to ask Zam about', flush=True)
    lock, position = threading.Lock(), [0]

    def worker():
        while True:
            with lock:
                if position[0] >= len(todo):
                    return
                slot, display = todo[position[0]]
                position[0] += 1
            value = present(slot, display)
            with lock:
                if value is not None:
                    cache[f'{slot}:{display}'] = value
                if position[0] % 500 == 0:
                    json.dump(cache, open(cache_path, 'w'))
                    print(position[0], '/', len(todo), flush=True)
    threads = [threading.Thread(target=worker) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    json.dump(cache, open(cache_path, 'w'))
    print('present', sum(1 for v in cache.values() if v), 'absent', sum(1 for v in cache.values() if v is False))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
