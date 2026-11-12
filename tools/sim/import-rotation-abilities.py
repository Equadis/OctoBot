#!/usr/bin/env python3
"""Capture published spell identities, without asserting rank learnability."""
import json,re,hashlib,subprocess,importlib.util
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.parse import urlencode
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('listing',ROOT/'tools/sim/import-items.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
CACHE=ROOT/'.rotation-source-cache';CACHE.mkdir(exist_ok=True)
canon=lambda s:re.sub('[^a-z0-9]+','-',s.lower().replace('’',"'").replace("'",'' )).strip('-')
names=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ROTATION_REGISTRY} from './docs/sim/core/rotations/registry.mjs';console.log(JSON.stringify(Object.fromEntries(Object.entries(ROTATION_REGISTRY).map(([id,p])=>[id,p.abilities]))));"],cwd=ROOT,text=True))
explicit={'rogue':{'Blade Flurry':30},'hunter':{'Steady Shot':4},'mage':{'Arcane Rupture':20,'Arcane Surge':32},'druid':{'Savage Bite':58},'shaman':{'Water Shield':26,'Earth Shield':40},'paladin':{'Holy Strike':4,'Crusader Strike':10}}
commands={'Pet Attack':'command','Powershift':'form-transition'}
results={c:{} for c in names};errors={};evidence=[]
def fetch(job):
 c,name=job;key=c+':'+canon(name);path=CACHE/(key.replace(':','-')+'.html');url='https://octowow.st/db/?'+urlencode({'search':name.replace('’',"'")})
 if not path.exists():
  r=subprocess.run(['curl','-fsSL','--max-time','18',url],capture_output=True,text=True,check=True)
  if any(s in r.stdout.lower() for s in ['verify you are human','checking your browser','automated traffic']):raise RuntimeError('Source challenge; stop import')
  path.write_text(r.stdout)
 html=path.read_text();marker=html.find("template:'spell'");spells=[]
 if marker>=0:
  start=html.find('data:[',marker)
  if start>=0:spells=m.Literal(html[start+5:]).value()
 matched=[s for s in spells if canon(re.sub(r'^[^A-Za-z]+','',s.get('name','')))==canon(name)]
 candidates=[{'id':s['id'],'rank':s.get('rank',''),'publishedLevel':s.get('level')} for s in matched]
 return c,key,{'candidateSpells':candidates,'source':url,'sha256':hashlib.sha256(html.encode()).hexdigest()}
jobs=[(c,name) for c,values in names.items() for name in values if name not in commands]
with ThreadPoolExecutor(max_workers=3) as pool:
 futures={pool.submit(fetch,job):job for job in jobs}
 for count,f in enumerate(as_completed(futures),1):
  c,name=futures[f];key=c+':'+canon(name)
  try:
   _,_,facts=f.result();results[c][key]=facts;evidence.append({'key':key,**facts})
  except Exception as e:
   errors[key]=str(e)
   if 'Source challenge' in str(e):
    for future in futures:future.cancel()
    raise
  if count%30==0:print(f'{count}/{len(jobs)} spell searches checked',flush=True)
for c,values in names.items():
 talents=json.loads((ROOT/f'docs/sim/data/talents/{c}.json').read_text())['talents']
 for name in values:
  key=c+':'+canon(name);facts=results[c].get(key,{'candidateSpells':[]});t=next((t for t in talents if canon(t['name'])==canon(name)),None)
  facts.update({'spellIds':t['spellIds'] if t else [s['id'] for s in facts['candidateSpells']],
   'rankAvailabilityVerified':bool(t),'verification':'published-talent' if t else 'published-database-identity' if facts['candidateSpells'] else 'unverified',
   'minLevel':explicit.get(c,{}).get(name,10+t['row']*5 if t else None),'actionKind':commands.get(name,'unverified'),
   'source':f'https://octowow.st/talents/{c}/' if t else facts.get('source',f'https://octowow.st/{c}')})
  if t:facts.update({'talentName':t['name'],'talentId':t['id']})
  if name in commands:facts['verification']='requires-adapter'
  results[c][key]=facts
(ROOT/'docs/sim/core/rotations/ability-data.mjs').write_text('// Generated published identities; candidate ranks do not prove player learnability.\nexport const ABILITY_DATA='+json.dumps(results,separators=(',',':'))+';\n')
(ROOT/'docs/sim/data/rotations/ability-evidence.json').write_text(json.dumps({'retrievedAt':'2026-11-12','searchCount':len(jobs),'errors':errors,'records':evidence},indent=2)+'\n')
print(f'Captured {len(jobs)-len(errors)}/{len(jobs)} searches; {len(errors)} source failures. Unresolved ranks remain gated.',flush=True)
