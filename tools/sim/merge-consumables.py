#!/usr/bin/env python3
"""Merge an importer checkpoint without replacing concurrent verified records."""
import json,sys
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2]
def merge(current,imported):
    by_id={item['id']:item for item in imported if item.get('verified')}
    return [item if item.get('verified') else by_id.get(item['id'],item) for item in current]
def main():
    out=ROOT/'docs/sim/data/consumables';current=json.loads((out/'catalogue.json').read_text())
    imported=json.loads(Path(sys.argv[1]).read_text());values=merge(current,imported)
    text=json.dumps(values,separators=(',',':'))
    (out/'catalogue.json').write_text(text+'\n')
    (ROOT/'docs/sim/core/consumable-data.mjs').write_text('// Generated public listing and verified tooltip facts; see data/consumables/manifest.json.\nexport const CONSUMABLE_DATA='+text+';\n')
    missing=[item['id'] for item in values if not item.get('verified')]
    (out/'manifest.json').write_text(json.dumps({'retrievedAt':datetime.now(timezone.utc).isoformat(),'listingCount':len(values),'verifiedCount':len(values)-len(missing),'missingIds':missing,'complete':not missing,'errors':{}},indent=2)+'\n')
if __name__=='__main__':main()
