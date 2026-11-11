#!/usr/bin/env python3
"""Extract factual talent metadata from the official calculator; never execute JS.

Uses the page's JSON-encoded React transport data. Fails on schema changes rather
than silently emitting an incomplete tree. No UI code, images or descriptions
are copied. Run from any directory; --class limits a refresh to one class.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = 'https://octowow.st/talents/'
CLASSES = {'warrior', 'rogue', 'shaman', 'mage', 'druid', 'warlock', 'hunter', 'paladin', 'priest'}


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.links = []
        self.script = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script':
            self.script = []
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])

    def handle_data(self, data):
        if self.script is not None:
            self.script.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            self.scripts.append(''.join(self.script))
            self.script = None


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'OctoSim-source-audit/1.0'}), timeout=30) as response:
        actual = response.geturl()
        if urlparse(actual).hostname != 'octowow.st':
            raise ValueError('Unexpected source redirect')
        return actual, response.read().decode('utf-8')


def records_from_html(html):
    page = Page()
    page.feed(html)
    chunks = []
    prefix = 'self.__next_f.push('
    for script in page.scripts:
        script = script.strip()
        if not script.startswith(prefix):
            continue
        # Only decode JSON arguments; do not evaluate the surrounding JavaScript.
        body = script[len(prefix):].removesuffix(';').removesuffix(')')
        chunk = json.loads(body)
        if len(chunk) > 1 and chunk[0] == 1 and isinstance(chunk[1], str):
            chunks.append(chunk[1])
    records = {}
    for line in ''.join(chunks).splitlines():
        key, separator, value = line.partition(':')
        if not separator or not re.fullmatch('[0-9a-f]+', key):
            continue
        try:
            records[key] = json.loads(value)
        except json.JSONDecodeError:
            # React transport metadata and text records are not JSON trees.
            continue
    if not records:
        raise ValueError('No calculator JSON records found; source format changed')
    return records


def walk(value):
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def resolve(value, records, seen=frozenset()):
    if isinstance(value, str) and re.fullmatch(r'\$L?[0-9a-f]+', value):
        key = value[2:] if value.startswith('$L') else value[1:]
        if value.startswith('$L') and key not in records:
            return value  # Imported React component, not a JSON data record.
        if key not in records or key in seen:
            raise ValueError(f'Unresolved/cyclic calculator record {key}')
        return resolve(records[key], records, seen | {key})
    if isinstance(value, list):
        return [resolve(child, records, seen) for child in value]
    if isinstance(value, dict):
        return {key: resolve(child, records, seen) for key, child in value.items()}
    return value


def extract(html, class_id, source_url, retrieved_at):
    records = records_from_html(html)
    names, talents = [], {}
    for record in records.values():
        for node in walk(record):
            if not isinstance(node, dict):
                continue
            if node.get('className') == 'h4 grow truncate' and node.get('title'):
                if node['title'] not in names:
                    names.append(node['title'])
            if not {'i', 'index', 'ranks', 'tooltip'} <= node.keys():
                continue
            tooltip = resolve(node['tooltip'], records)
            headings = [item[3]['children'] for item in walk(tooltip)
                        if isinstance(item, list) and len(item) == 4 and item[1] == 'h4'
                        and isinstance(item[3], dict) and isinstance(item[3].get('children'), str)]
            if len(headings) != 1:
                raise ValueError('Talent name missing or ambiguous')
            spell_ids, talent_id, rank_parameters = [], None, []
            for item in walk(tooltip):
                if not isinstance(item, dict):
                    continue
                children = item.get('children')
                if isinstance(children, list) and len(children) == 2 and children[0] == '#' and isinstance(children[1], int):
                    talent_id = children[1]
                if isinstance(children, list) and children and children[0] == 'IDs: ':
                    text = ' '.join(part for part in children if isinstance(part, str))
                    spell_ids = [int(number) for number in re.findall(r'#(\d+)', text)]
                values = item.get('values')
                if isinstance(values, list) and values and all(
                    isinstance(v, str) and re.fullmatch(r'-?\d+(?:\.\d+)?', v) for v in values
                ):
                    rank_parameters.append([float(v) if '.' in v else int(v) for v in values])
            if talent_id is None or not spell_ids:
                raise ValueError(f'Missing identifiers for {headings[0]}')
            position, tree, maximum = node['i'], node['index'], node['ranks']
            if not all(type(v) is int for v in (position, tree, maximum)) or not 0 <= tree < 3 or maximum < 1:
                raise ValueError('Invalid talent coordinates/ranks')
            requirement = node.get('requires')
            talent = {
                'id': talent_id, 'name': headings[0], 'tree': tree,
                'position': position, 'row': position // 4, 'column': position % 4,
                'maxRanks': maximum, 'spellIds': spell_ids,
                'requires': None if requirement == '$undefined' else requirement,
                'requiresRanks': None if node.get('reqRanks') == '$undefined' else node.get('reqRanks'),
                'rankParameters': rank_parameters,
            }
            key = (tree, position)
            if key in talents and talents[key] != talent:
                raise ValueError(f'Conflicting talent {key}')
            talents[key] = talent
    if len(names) != 3 or len(talents) < 30:
        raise ValueError('Incomplete class tree')
    for talent in talents.values():
        if talent['requires'] is not None:
            parent = talents.get((talent['tree'], talent['requires']))
            if not parent or type(talent['requiresRanks']) is not int or not 0 < talent['requiresRanks'] <= parent['maxRanks']:
                raise ValueError('Invalid prerequisite reference')
    return {
        'schemaVersion': 1, 'classId': class_id,
        'source': {'url': source_url, 'retrievedAt': retrieved_at,
                   'htmlSha256': sha256(html.encode()).hexdigest(),
                   'scope': 'Published calculator metadata; not observed server combat'},
        'trees': [{'index': i, 'name': name,
                   'maxPoints': sum(t['maxRanks'] for t in talents.values() if t['tree'] == i)}
                  for i, name in enumerate(names)],
        'talents': sorted(talents.values(), key=lambda t: (t['tree'], t['position'])),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--class', dest='class_id', choices=sorted(CLASSES))
    parser.add_argument('--html', type=Path, help='Parse a previously retrieved official class page offline')
    parser.add_argument('--source-url', help='Canonical official URL recorded with --html')
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[2] / 'docs/sim/data/talents'
    output.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat()
    if args.html:
        if not args.class_id or not args.source_url:
            parser.error('--html requires --class and --source-url')
        source = urlparse(args.source_url)
        if source.scheme != 'https' or source.hostname != 'octowow.st' or source.path.rstrip('/') != f'/talents/{args.class_id}':
            parser.error('--source-url must identify the official selected class page')
        datasets = [(args.class_id, extract(args.html.read_text(), args.class_id, args.source_url, stamp))]
        save(datasets, output)
        return
    _, root_html = fetch(ROOT)
    root = Page()
    root.feed(root_html)
    links = {}
    for href in root.links:
        url = urljoin(ROOT, href)
        class_id = urlparse(url).path.rstrip('/').rsplit('/', 1)[-1]
        if urlparse(url).hostname == 'octowow.st' and class_id in CLASSES:
            links[class_id] = url
    if set(links) != CLASSES:
        raise ValueError('Official class links missing; refusing guessed URLs')
    selected = [args.class_id] if args.class_id else sorted(CLASSES)

    def download(class_id):
        url, html = fetch(links[class_id])
        return class_id, extract(html, class_id, url, stamp)

    # Validate all selected pages before replacing any snapshot.
    with ThreadPoolExecutor(max_workers=3) as executor:
        datasets = list(executor.map(download, selected))
    save(datasets, output)


def save(datasets, output):
    for class_id, data in datasets:
        destination = output / f'{class_id}.json'
        temporary = destination.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(destination)
        print(f"{class_id}: {len(data['talents'])} talents; tree totals " +
              '/'.join(str(tree['maxPoints']) for tree in data['trees']))


if __name__ == '__main__':
    main()
