// Differential test of two builds of the appearance Worker over every key of an overlay folder, with a fake bucket and a fake Zam.
//
//   node tools/models/worker_diff.mjs <deployed outfitter.js> <candidate outfitter.js> <overlay folder> <zam-presence.json>
//
// Get the deployed source with `git show <commit>:cloudflare/population/src/outfitter.js > deployed.js`. zam-presence.json maps "slot:display id" (armor) and
// "item:id" to whether Zam's library holds the record (written by zam_compare.py). Each request is made twice: Zam answering normally, and Zam failing
// with a 502. Prints how many answers (status, body and cache header) are identical and lists every difference. Exits 1 when a request differs while Zam answers.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [livePath,candPath,root,zamPath]=process.argv.slice(2);
if(!zamPath){console.error('usage: node tools/models/worker_diff.mjs <deployed outfitter.js> <candidate outfitter.js> <overlay folder> <zam-presence.json>');process.exit(2);}
const live=await import(pathToFileURL(path.resolve(livePath)).href);
const cand=await import(pathToFileURL(path.resolve(candPath)).href);
const zam=JSON.parse(fs.readFileSync(zamPath,'utf8'));
const keys=[];
(function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else keys.push(path.relative(root,p).replace(/\\/g,'/'));}})(root);
const inBucket=new Set(keys);
const bucket={async get(key){return inBucket.has(key)&&key!=='helms.json'&&!key.startsWith('textures/')&&!key.startsWith('m2/')&&!key.startsWith('skel/')&&!key.startsWith('skin/')||['helms.json'].includes(key)?{body:fs.readFileSync(path.join(root,key))}:(inBucket.has(key)?{body:Buffer.from('X')}:null);}};
// Zam answers with a stub record when it holds the key, 404 when not, and (for the failure case) 502 for a set of ids.
function zamHas(url){
  const m=url.match(/meta\/armor\/(\d+)\/(\d+)\.json$/);
  if(m)return zam[`${m[1]}:${m[2]}`]===true;
  const i=url.match(/meta\/item\/(\d+)\.json$/);
  if(i)return zam[`item:${i[1]}`]===true;
  return true;
}
function fetcher(mode){return async(url)=>{
  if(mode==='down')return new Response('x',{status:502});
  return zamHas(url)?new Response(JSON.stringify({zam:true,ModelFiles:{}}),{status:200}):new Response('{}',{status:404});
};}
async function run(mod,pathname,mode){
  mod.resetOverlayCache?.();
  const r=await mod.outfitter(new Request('https://api.test/api/outfitter/assets/'+pathname),fetcher(mode),{MODELS:bucket});
  const body=await r.text();
  return {status:r.status,body:body.length>400?body.slice(0,400)+'#'+body.length:body,cache:r.headers.get('cache-control')};
}
const probe=keys.filter(k=>/^(meta|helms)/.test(k)&&k!=='helms.json'&&k!=='manifest.json'&&k!=='version.json');
// also ids Zam has that the bucket lacks, and a spread of file kinds
const extra=['meta/armor/5/1.json','meta/item/1.json','meta/armor/1/31260.json','meta/character/1.json','meta/charactercustomization/1.json','meta/charactercustomization/19.json','m2/9000000.m2','textures/9100001.webp','m2/119940.m2'];
let same=0;const diffs=[];const kinds={};
for(const mode of ['up','down'])for(const p of [...probe,...extra]){
  const a=await run(live,p,mode),b=await run(cand,p,mode);
  const ok=a.status===b.status&&a.body===b.body&&a.cache===b.cache;
  if(ok)same++;else{diffs.push({mode,p,live:[a.status,a.body.slice(0,50),a.cache],cand:[b.status,b.body.slice(0,50),b.cache]});const k=`${mode}:${a.status}->${b.status}`;kinds[k]=(kinds[k]||0)+1;}
}
console.log('requests',same+diffs.length,'identical',same,'different',diffs.length);
console.log(kinds);
console.log(JSON.stringify(diffs.slice(0,6),null,1));
process.exitCode=diffs.some(d=>d.mode==='up')?1:0;
const both=probe.filter(k=>/armor|item/.test(k)&&(()=>{const m=k.match(/armor\/(\d+)\/(\d+)/);const i=k.match(/item\/(\d+)/);return m?zam[`${m[1]}:${m[2]}`]===true:i?zam[`item:${i[1]}`]===true:false;})());
console.log('bucket item/armor records that Zam also holds:',both.length,both.slice(0,5));
