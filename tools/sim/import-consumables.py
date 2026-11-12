#!/usr/bin/env python3
"""Resume a bounded, public-tooltip audit. Never execute database JavaScript."""
import argparse,importlib.util,json,re,subprocess,hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('details',ROOT/'tools/sim/import-item-details.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
OUT=ROOT/'docs/sim/data/consumables';CACHE=ROOT/'.consumable-cache';OUT.mkdir(parents=True,exist_ok=True);CACHE.mkdir(exist_ok=True)
def parse(html,item):
 doc=m.Document();doc.feed(html);id_=item['id'];tip=doc.root.find(lambda n:n.attrs.get('id')==f'tooltip{id_}-generic');facts=doc.root.find(lambda n:'infobox' in n.attrs.get('class','').split())
 if not tip or not facts:raise ValueError('Source omits item facts')
 text=re.sub(r'\n\s*\n','\n',tip.text()).strip();info=facts.text()
 def mask(name):
  v=re.search(name+r' Mask:\s*(-?\d+)',info)
  if not v:raise ValueError('Missing '+name+' mask')
  return int(v[1])
 uses=list(dict.fromkeys(n.text().strip() for n in tip.descendants() if n.tag=='span' and n.text().strip().startswith('Use:')))
 spells=list(dict.fromkeys(int(n.attrs['href'].split('=')[-1]) for n in tip.descendants() if n.tag=='a' and re.fullmatch(r'\?spell=\d+',n.attrs.get('href',''))))
 return {**item,'classMask':mask('Class'),'raceMask':mask('Race'),'requiredLevel':int(re.search(r'Requires Level (\d+)',text)[1]) if re.search(r'Requires Level (\d+)',text) else 0,'tooltipText':text,'effects':uses,'spellIds':spells,'source':f'https://octowow.st/db/?item={id_}','sha256':hashlib.sha256(html.encode()).hexdigest(),'verified':True}
def fetch(item):
 path=CACHE/f'{item["id"]}.html'
 if not path.exists():
  r=subprocess.run(['curl','-fsSL','--max-time','18',f'https://octowow.st/db/?item={item["id"]}'],capture_output=True,text=True,check=True)
  if any(s in r.stdout.lower() for s in ['verify you are human','checking your browser','automated traffic']):raise RuntimeError('Source challenge; stop import')
  path.write_text(r.stdout)
 return parse(path.read_text(),item)
def main():
 p=argparse.ArgumentParser();p.add_argument('--workers',type=int,default=3);p.add_argument('--limit',type=int,default=0);p.add_argument('--ids',default='');p.add_argument('--cached-only',action='store_true');args=p.parse_args()
 catalogue=[r for r in json.loads((ROOT/'docs/sim/data/items/catalogue.json').read_text()) if r['classs']==0]
 records={};path=OUT/'catalogue.json'
 if path.exists():records={r['id']:r for r in json.loads(path.read_text()) if r.get('verified')}
 errors={};remaining=[i for i in catalogue if i['id'] not in records];remaining=sorted(remaining,key=lambda i:(0 if re.search(r'Potion|Elixir|Flask|Oil|Stone|Rune|Tea|Juju|Concoction',i['name']) else 1,-i.get('level',0),i['id']))
 if args.ids:
  wanted={int(i) for i in args.ids.split(',')};remaining=[i for i in remaining if i['id'] in wanted]
 if args.cached_only:remaining=[i for i in remaining if (CACHE/f'{i["id"]}.html').exists()]
 if args.limit:remaining=remaining[:args.limit]
 def save():
  values=[records.get(i['id'],{**i,'verified':False,'source':f'https://octowow.st/db/?item={i["id"]}'}) for i in catalogue]
  path.write_text(json.dumps(values,separators=(',',':'))+'\n')
  (ROOT/'docs/sim/core/consumable-data.mjs').write_text('// Generated public listing and verified tooltip facts; see data/consumables/manifest.json.\nexport const CONSUMABLE_DATA='+json.dumps(values,separators=(',',':'))+';\n')
  (OUT/'manifest.json').write_text(json.dumps({'retrievedAt':datetime.now(timezone.utc).isoformat(),'listingCount':len(catalogue),'verifiedCount':len(records),'missingIds':[i['id'] for i in catalogue if i['id'] not in records],'errors':errors,'complete':len(records)==len(catalogue)},indent=2)+'\n')
 save()
 with ThreadPoolExecutor(max_workers=min(3,max(1,args.workers))) as ex:
  jobs={ex.submit(fetch,i):i for i in remaining}
  for n,f in enumerate(as_completed(jobs),1):
   i=jobs[f]
   try:records[i['id']]=f.result()
   except Exception as e:
    errors[str(i['id'])]=str(e)
    if 'Source challenge' in str(e):
     for job in jobs:job.cancel()
     save();raise
   if n%25==0:save();print(f'{len(records)}/{len(catalogue)} verified; {len(errors)} errors',flush=True)
 save();print(f'Finished {len(records)}/{len(catalogue)}',flush=True)
if __name__=='__main__':main()
