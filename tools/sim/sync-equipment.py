#!/usr/bin/env python3
"""Resume importing every published equippable item's official detail page.

Bounded concurrency, atomic checkpoints, explicit missing-ID reports, and no
browser challenge handling. Stops fetching when the source presents a challenge.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import threading
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'docs/sim/data/items'
spec = importlib.util.spec_from_file_location('item_details', Path(__file__).with_name('import-item-details.py'))
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

def atomic(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
    temporary.replace(path)

def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--workers', type=int, default=3, choices=range(1, 5))
    cli.add_argument('--limit', type=int, default=0, help='Bound a resumable batch; zero means every missing item')
    cli.add_argument('--max-seconds', type=int, default=9000, help='Checkpoint before the workflow time limit')
    args = cli.parse_args()
    catalogue = json.loads((DATA / 'equipment.json').read_text())
    details = json.loads((DATA / 'details.json').read_text())
    if (DATA/'details-supplement.json').exists():
        details={**json.loads((DATA/'details-supplement.json').read_text()),**details}
    remaining = [item for item in catalogue if str(item['id']) not in details]
    selected = remaining[:args.limit] if args.limit else remaining
    if not remaining:
        print('All equipment detail records are already present.', flush=True)
        return
    stopped = threading.Event()
    failures = {}
    deadline = time.monotonic() + args.max_seconds

    def download(item):
        if stopped.is_set() or time.monotonic() >= deadline: return None
        id_ = item['id']
        url = f'https://octowow.st/db/?item={id_}'
        time.sleep(.15)
        with urlopen(Request(url, headers={'User-Agent': 'OctoBot-item-catalogue/1.0'}), timeout=35) as response:
            if not response.geturl().startswith('https://octowow.st/db/'):
                raise ValueError('Unexpected source redirect')
            html = response.read().decode('utf-8')
        if 'Verifying your browser' in html or 'bf-v2-form' in html:
            stopped.set()
            raise ValueError('Source browser verification required; import paused')
        detail = parser.parse_detail(html, id_)
        if detail['name'] != item['name']:
            detail['listingName']=item['name']
        return detail

    def checkpoint():
        atomic(DATA / 'details.json', details)
        missing = [item['id'] for item in catalogue if str(item['id']) not in details]
        report = {'source': 'https://octowow.st/db/', 'updatedAt': datetime.now(timezone.utc).isoformat(),
                  'equipmentCount': len(catalogue), 'verifiedCount': len(catalogue) - len(missing),
                  'complete': not missing, 'missingIds': missing, 'failures': failures,
                  'pausedForVerification': stopped.is_set()}
        atomic(DATA / 'detail-coverage.json', report)
        manifest = json.loads((DATA / 'manifest.json').read_text())
        manifest.update(detailRecordCount=report['verifiedCount'], equipmentDetailsComplete=report['complete'],
                        detailCoverage='Official item tooltips, class/race masks, level, slot and requirements; see detail-coverage.json')
        atomic(DATA / 'manifest.json', manifest)
        return report

    print(f'Importing {len(selected)} of {len(remaining)} missing equipment records', flush=True)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        pending = {pool.submit(download, item): item for item in selected}
        for index, future in enumerate(as_completed(pending), 1):
            item = pending[future]
            try:
                detail = future.result()
                if detail: details[str(item['id'])] = detail
            except Exception as error:
                failures[str(item['id'])] = str(error)
            if index % 100 == 0:
                report = checkpoint()
                print(f"{report['verifiedCount']}/{report['equipmentCount']} verified; {len(failures)} errors", flush=True)
    report = checkpoint()
    print(json.dumps({k: v for k, v in report.items() if k not in ('missingIds', 'failures')}), flush=True)
    if failures: print(json.dumps(failures), flush=True)
    if not report['complete']: raise SystemExit(2)

if __name__ == '__main__': main()
