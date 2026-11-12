#!/usr/bin/env python3
"""Import the official database's published item lists without executing JS.

Discovers categories from the site's actual menu. Splits capped results using
the site's item-level filter form. Every saturated leaf remains explicitly
reported; a capped response is never described as a complete database export.
Caches source pages so interrupted imports can resume without refetching them.
"""
import argparse
import ast
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlencode

ROOT = 'https://octowow.st/db/'
OUTPUT = Path(__file__).resolve().parents[2] / 'docs/sim/data/items'
CACHE = Path(__file__).resolve().parents[2] / '.item-import-cache'
CACHE_ONLY = False


class Literal:
    """Small data-only parser for the legacy site's JavaScript literals."""
    def __init__(self, source):
        self.source, self.i = source, 0

    def skip(self):
        while self.i < len(self.source):
            if self.source[self.i].isspace(): self.i += 1
            elif self.source.startswith('//', self.i):
                end = self.source.find('\n', self.i); self.i = len(self.source) if end < 0 else end + 1
            else: break

    def value(self):
        self.skip()
        c = self.source[self.i]
        if c in "\"'":
            start = self.i; self.i += 1
            while self.i < len(self.source):
                if self.source[self.i] == '\\': self.i += 2
                elif self.source[self.i] == c:
                    self.i += 1
                    return ast.literal_eval(self.source[start:self.i].replace('\\/', '/'))
                else: self.i += 1
            raise ValueError('Unterminated string')
        if c == '[':
            self.i += 1; values = []
            while True:
                self.skip()
                if self.source[self.i] == ']': self.i += 1; return values
                if self.source[self.i] == ',': values.append(None); self.i += 1; continue
                values.append(self.value()); self.skip()
                if self.source[self.i] == ',': self.i += 1
                elif self.source[self.i] != ']': raise ValueError('Invalid array')
        if c == '{':
            self.i += 1; values = {}
            while True:
                self.skip()
                if self.source[self.i] == '}': self.i += 1; return values
                if self.source[self.i] in "\"'": key = self.value()
                else:
                    match = re.match(r'[a-zA-Z_$][\w$]*', self.source[self.i:])
                    if not match: raise ValueError('Invalid object key')
                    key = match[0]; self.i += len(key)
                self.skip()
                if self.source[self.i] != ':': raise ValueError('Invalid object')
                self.i += 1; values[key] = self.value(); self.skip()
                if self.source[self.i] == ',': self.i += 1
                elif self.source[self.i] != '}': raise ValueError('Invalid object separator')
        match = re.match(r'-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?', self.source[self.i:])
        if match:
            self.i += len(match[0]); return float(match[0]) if any(c in match[0] for c in '.eE') else int(match[0])
        for token, value in [('null', None), ('undefined', None), ('true', True), ('false', False)]:
            if self.source.startswith(token, self.i): self.i += len(token); return value
        raise ValueError('Non-data JavaScript rejected')


def fetch(query, filters=None):
    CACHE.mkdir(exist_ok=True, parents=True)
    signature = query + json.dumps(filters, sort_keys=True)
    path = CACHE / (sha256(signature.encode()).hexdigest() + '.html')
    if path.exists(): return path.read_text()
    if CACHE_ONLY: raise FileNotFoundError(f'Uncached source partition: {query} {filters}')
    cmd = ['curl', '-fsSL', '--max-time', '35', ROOT + query]
    if filters is not None: cmd += ['--data', urlencode({'filters': 'on', **filters})]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    if '<html' not in result.stdout.lower(): raise ValueError('Non-HTML source response')
    path.write_text(result.stdout)
    return result.stdout


def item_rows(html):
    marker = html.find("new Listview({template:'item',id:'items'")
    if marker < 0: raise ValueError('Missing item list; source may be unavailable')
    start = re.search(r'data:\s*\[', html[marker:])
    if not start: raise ValueError('Missing item data')
    rows = Literal(html[marker + start.end() - 1:]).value()
    icons = dict((int(id_), icon) for id_, icon in re.findall(r"_\[(\d+)\]=\{icon:\s*'([^']*)'\}", html))
    return rows, icons


def categories(menu):
    def visit(nodes, path=()):
        for node in nodes:
            if not node or not isinstance(node, list) or not isinstance(node[0], int): continue
            branch = path + (node[0],)
            if len(node) > 3 and isinstance(node[3], list): yield from visit(node[3], branch)
            else:
                query = node[2] if len(node) > 2 and isinstance(node[2], str) else '?items=' + '.'.join(map(str, branch))
                yield query, branch
    return list(visit(menu))


def collect_category(query, branch):
    records, saturated, pages = {}, [], 0
    def collect(lo=None, hi=None):
        nonlocal pages
        filters = None if lo is None else {'item_level_min': lo, 'item_level_max': hi}
        rows, icons = item_rows(fetch(query, filters)); pages += 1
        for source in rows:
            if not isinstance(source.get('id'), int): raise ValueError('Invalid item ID')
            name = source.get('name', '')
            quality = 6 - int(name[0]) if name and name[0].isdigit() else None
            name = name[1:] if quality is not None else name
            record = {key: value for key, value in source.items() if key != 'description'}
            record.update(name=name, quality=quality, icon=icons.get(source['id'], 'inv_misc_questionmark').lower())
            if len(branch) >= 3 and branch[0] == 4: record.setdefault('slot', branch[2])
            records[record['id']] = record
        if len(rows) >= 499:
            if lo is None: collect(0, 200); collect(201, 10000)
            elif lo < hi and hi > 1:
                # Zero disables an upper bound in the source form. Keep 0–1 together.
                middle = max(1, (lo + hi) // 2); collect(lo, middle); collect(middle + 1, hi)
            else: saturated.append({'query': query, 'itemLevelRange': [lo, hi], 'returned': len(rows)})
    collect()
    return list(records.values()), saturated, pages


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--menu-html', type=Path, required=True, help='The linked locale_enus.js menu source')
    parser.add_argument('--cached-only', action='store_true', help='Recover downloaded records without network requests')
    parser.add_argument('--equipment-only', action='store_true', help='Refresh weapons, armour, ammunition and quivers; retain other catalogue categories')
    parser.add_argument('--refresh', action='store_true', help='Use a fresh source-page cache for this import')
    args = parser.parse_args()
    global CACHE_ONLY, CACHE
    CACHE_ONLY = args.cached_only
    if args.refresh: CACHE = CACHE / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
    source = args.menu_html.read_text(); start = source.index('var mn_items =') + len('var mn_items =')
    menu = Literal(source[start:]).value()
    all_branches = categories(menu)
    branches = [(q,b) for q,b in all_branches if not args.equipment_only or b[0] in (2,4,6,11)]
    records, saturated, pages, failures, completed = {}, [], 0, [], set()
    previous = json.loads((OUTPUT / 'manifest.json').read_text()) if (OUTPUT / 'manifest.json').exists() else {}
    if args.equipment_only and (OUTPUT / 'catalogue.json').exists():
        records = {r['id']:r for r in json.loads((OUTPUT / 'catalogue.json').read_text()) if r.get('classs') not in (2,4,6,11)}
        saturated = previous.get('cappedPartitions', [])
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(collect_category, query, branch): query for query, branch in branches}
        for future in as_completed(futures):
            try:
                rows, missing, count = future.result()
                completed.add(futures[future])
            except (subprocess.CalledProcessError, ValueError, FileNotFoundError) as error:
                failures.append({'query': futures[future], 'error': str(error)})
                print(f'{futures[future]}: incomplete; {error}', flush=True)
                continue
            for row in rows:
                old = records.get(row['id'], {})
                records[row['id']] = {**old, **row}
            saturated.extend(missing); pages += count
            print(f"{futures[future]}: {len(rows)} items; {len(missing)} capped leaves", flush=True)
    # Preserve successful pages from categories that failed halfway through.
    for cached in sorted(CACHE.glob('*.html')):
        try:
            rows, icons = item_rows(cached.read_text())
            for row in rows:
                name = row['name']; quality = 6-int(name[0]) if name and name[0].isdigit() else None
                row = {key:value for key,value in row.items() if key != 'description'}
                row.update(name=name[1:] if quality is not None else name, quality=quality,
                           icon=icons.get(row['id'], 'inv_misc_questionmark').lower())
                records[row['id']] = {**records.get(row['id'], {}), **row}
        except ValueError: continue
    for row in records.values():
        if row.get('classs') == 2 and not row.get('slot'):
            # Candidate slot only: main/off-hand restrictions require the detail page.
            row['slot'] = 17 if row['subclass'] in (1,5,6,8,10,20) else 26 if row['subclass'] in (2,3,18,19) else 25 if row['subclass'] == 16 else 13
            row['slotInferred'] = True
    OUTPUT.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat()
    all_rows = sorted(records.values(), key=lambda row: row['id'])
    for row in all_rows:
        if row.get('classs') in (6,11): row['slot']=24 if row['classs']==6 else 18
    equipment = [row for row in all_rows if row.get('classs') in (2,4,6,11) and row.get('slot',0)>0]
    manifest = {'source': ROOT, 'retrievedAt': stamp, 'itemCount': len(all_rows),
                'equipmentCount': len(equipment), 'categoryCount': len(all_branches), 'sourcePages': pages,
                'complete': not saturated and not failures, 'cappedPartitions': saturated,
                'failedPartitions': failures,
                'equipmentListingsComplete': all(query in completed for query,branch in branches if branch[0] in (2,4,6,11)),
                'detailRecordCount': len(json.loads((OUTPUT / 'details.json').read_text())) if (OUTPUT / 'details.json').exists() else 0,
                'detailCoverage': 'Listing metadata. Class masks and full effects require individual item details.'}
    if args.equipment_only: manifest['equipmentRetrievedAt'] = stamp
    for name, value in [('catalogue.json', all_rows), ('equipment.json', equipment), ('manifest.json', manifest)]:
        (OUTPUT / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps(manifest), flush=True)


if __name__ == '__main__': main()
