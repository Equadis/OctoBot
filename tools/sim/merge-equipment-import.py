#!/usr/bin/env python3
"""Merge a completed/checkpointed import into the latest catalogue without losing concurrent edits."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
DATA=Path(__file__).resolve().parents[2]/'docs/sim/data/items'
spec=importlib.util.spec_from_file_location('sync_equipment',Path(__file__).with_name('sync-equipment.py'))
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)

def merge(imported,report):
    items=json.loads((DATA/'equipment.json').read_text());ids={item['id'] for item in items}
    details=json.loads((DATA/'details.json').read_text())
    for key,record in imported.items():
        if record.get('id') not in ids:continue
        if str(record['id'])!=key or record.get('source')!=f"https://octowow.st/db/?item={record['id']}" or type(record.get('classMask')) is not int or type(record.get('raceMask')) is not int:
            raise ValueError('Invalid imported official item record')
        details[key]={**record,**details.get(key,{})}
    missing=sorted(ids-{int(key) for key in details})
    failures={key:value for key,value in report.get('failures',{}).items() if int(key) in missing}
    coverage={'source':'https://octowow.st/db/','updatedAt':datetime.now(timezone.utc).isoformat(),
              'equipmentCount':len(ids),'verifiedCount':len(ids)-len(missing),'complete':not missing,
              'missingIds':missing,'failures':failures,'pausedForVerification':report.get('pausedForVerification',False)}
    manifest=json.loads((DATA/'manifest.json').read_text())
    manifest.update(equipmentCount=len(ids),detailRecordCount=coverage['verifiedCount'],equipmentDetailsComplete=coverage['complete'],detailCoverage='Official item tooltips, class/race masks, level, inventory and requirements; see detail-coverage.json')
    sync.atomic(DATA/'details.json',details);sync.atomic(DATA/'detail-coverage.json',coverage);sync.atomic(DATA/'manifest.json',manifest)
    return coverage

if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('details',type=Path);cli.add_argument('coverage',type=Path);args=cli.parse_args()
    result=merge(json.loads(args.details.read_text()),json.loads(args.coverage.read_text()))
    print(f"Merged {result['verifiedCount']}/{result['equipmentCount']} verified item records")
