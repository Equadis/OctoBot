"""Compares a build's manifest with what the live appearance Worker serves, and optionally with a local copy of the build.

    python tools/models/verify_remote.py <manifest.json> [--base <assets url>] [--local <folder>] [--only-changed <other manifest.json>] [--workers 16] [--out report.json]

Every key of the manifest (except version.json and helms.json, which the Worker serves merged or through wrangler) is fetched through the Worker at
<base><key> (default https://octobot-population.eqvoice.workers.dev/api/outfitter/assets/) and its size and sha256 are compared with the manifest. With --local the files under
<folder> are hashed against the manifest too (is the backup complete and uncorrupted?). With --only-changed only the keys whose sha256 differs from the other manifest, or that it lacks, are
fetched (what an upload changed). Exits 1 when anything differs. Read-only: it only issues GET requests.
"""
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

DEFAULT_BASE = 'https://octobot-population.eqvoice.workers.dev/api/outfitter/assets/'


def option(args, name, default=None):
    return args[args.index(name) + 1] if name in args else default


def fetch(base, key, entry):
    for attempt in range(5):
        try:
            request = urllib.request.Request(base + key, headers={'User-Agent': 'octobot-verify'})
            with urllib.request.urlopen(request, timeout=40) as response:
                body = response.read()
            return key, response.status, len(body) == entry['bytes'] and hashlib.sha256(body).hexdigest() == entry['sha256']
        except urllib.error.HTTPError as error:
            if error.code in (429, 500, 502, 503, 504):
                time.sleep(2 * (attempt + 1))
                continue
            return key, error.code, False
        except Exception:
            time.sleep(2 * (attempt + 1))
    return key, 0, False


def main(argv):
    positional = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or not argv[i - 1].startswith('--'))]
    if len(positional) != 1:
        print(__doc__)
        return 2
    files = json.load(open(positional[0], encoding='utf-8'))['files']
    base = option(argv, '--base', DEFAULT_BASE)
    keys = [k for k in files if k not in ('version.json', 'helms.json')]
    other = option(argv, '--only-changed')
    if other:
        before = json.load(open(other, encoding='utf-8'))['files']
        keys = [k for k in keys if k not in before or before[k]['sha256'] != files[k]['sha256']]
    problems = []
    local = option(argv, '--local')
    if local:
        for key in files:
            path = os.path.join(local, *key.split('/'))
            if not os.path.exists(path):
                problems.append(('local-missing', key))
                continue
            data = open(path, 'rb').read()
            if len(data) != files[key]['bytes'] or hashlib.sha256(data).hexdigest() != files[key]['sha256']:
                problems.append(('local-differs', key))
        print(f'local copy: {len(files)} keys checked, {sum(1 for p in problems if p[0].startswith("local"))} problem(s)')
    started = time.time()
    done = 0
    with ThreadPoolExecutor(max(1, min(32, int(option(argv, '--workers', 16))))) as pool:
        for key, status, same in pool.map(lambda k: fetch(base, k, files[k]), keys):
            done += 1
            if not same:
                problems.append((f'live-{status}', key))
            if done % 2000 == 0:
                print(f'  {done}/{len(keys)} fetched, {len(problems)} problem(s), {time.time() - started:.0f}s')
    print(f'live: {len(keys)} keys fetched through the Worker, {sum(1 for p in problems if p[0].startswith("live"))} differ')
    report = option(argv, '--out')
    if report:
        json.dump(problems, open(report, 'w'), indent=1)
    for kind, key in problems[:15]:
        print('  ', kind, key)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
