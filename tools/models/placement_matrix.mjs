// Equipment placement test: renders loadouts in the real Dressing Room and checks them.
//
//   node tools/models/placement_matrix.mjs <skins overlay folder> <model overlay folder> <mapping.json> <work folder> [--bodies-only] [--skins]
//
// 1. placement_cases.py builds the loadouts: on every body a shield with a one-hand weapon, dual wield, a two-hand weapon, a robe set (helm, shoulders, chest, cloak), a held-in-off-hand item and bows
//    and guns, each with a library and a recovered item; on three bodies one item of every weapon, shield and held category and a sample of recovered models with blended parts. --skins repeats
//    the shield and robe loadouts on a sample of bodies with a skin applied.
// 2. render_gear.mjs renders them from the front and the sides at scale 2 (screenshots are kept in <work>/renders for looking at).
// 3. Each render must have its equipment applied (the page's own list of applied slots) with nothing failing to load, and artifact_scan.py must find no solid black patch (a blended part drawn opaque).
// Hands, grips and rotations are judged by eye on the screenshots (gear_sheet.py makes contact sheets); the static attachment numbers are placement_check.py. Exits 1 when a check fails.
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const [skinsFolder,modelsFolder,mapping,work]=args.filter(a=>!a.startsWith('--'));
if(!work){console.error('usage: node tools/models/placement_matrix.mjs <skins overlay> <model overlay> <mapping.json> <work folder> [--bodies-only] [--skins]');process.exit(2);}
fs.mkdirSync(work,{recursive:true});
const run=(cmd,argv,opts={})=>spawnSync(cmd,argv,{encoding:'utf8',...opts});
const freePort=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});

const casesFile=path.join(work,'cases.json'),renders=path.join(work,'renders');
let r=run('python',['-I',path.join(here,'placement_cases.py'),modelsFolder,mapping,casesFile,...(args.includes('--bodies-only')?['--bodies-only']:[])]);
console.log(r.stdout.trim()||r.stderr.trim());
if(r.status!==0)process.exit(1);
let cases=JSON.parse(fs.readFileSync(casesFile,'utf8'));
if(args.includes('--skins')) {
  // the same shield and robe loadouts on a sample of bodies with a mapped skin on each
  const catalogue=JSON.parse(fs.readFileSync(path.join(skinsFolder,'skins','catalogue.json'),'utf8')).skins.filter(s=>s.tokenItemId&&s.variants.length);
  const extra=[];
  for(const skin of catalogue)for(const v of skin.variants.slice(0,1)) {
    for(const base of cases.filter(c=>/-ver-(shield|robe)$/.test(c.name)&&c.race===v.texture.race&&c.gender===v.gender))
      extra.push({...base,name:`s-${skin.id.replace('skin-','')}-${v.gender}-${base.name.split('-').pop()}`,skin:skin.id,views:[base.views?.[0]||{name:'front'}]});
  }
  cases=cases.concat(extra);fs.writeFileSync(casesFile,JSON.stringify(cases));console.log(`${extra.length} skin loadouts added`);
}
const port=await freePort();
const server=spawn('node',[path.join(here,'e2e_server.mjs'),[skinsFolder,modelsFolder].join(','),String(port)],{stdio:'ignore'});
for(let i=0;i<50;i++) {try {if((await fetch(`http://127.0.0.1:${port}/api/outfitter/models-version`)).ok)break;} catch {}await new Promise(res=>setTimeout(res,200));}
let status=0;
try {
  fs.rmSync(renders,{recursive:true,force:true});
  const render=spawnSync('node',[path.join(here,'render_gear.mjs'),`http://127.0.0.1:${port}`,casesFile,renders,'--scale','2'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  console.log(render.stdout.trim().split('\n').slice(-2).join('\n'));
  if(render.status!==0){console.error(render.stderr.slice(-800));status=1;}
} finally {server.kill();}
const results=[];
let missing=0;
for(const c of cases) {
  const sidecar=path.join(renders,`${c.name}.json`);
  if(!fs.existsSync(sidecar)){results.push({name:c.name,problem:'no render'});continue;}
  const applied=JSON.parse(fs.readFileSync(sidecar,'utf8')).applied||[];
  const wanted=Object.keys(c.gear).filter(slot=>slot!=='18'||c.ranged).length;
  // the page lists a slot as applied only when its model data loaded; ranged weapons show only in ranged mode
  if(applied.length<wanted)results.push({name:c.name,problem:`only ${applied.length} of ${wanted} equipped slots applied`});
}
const scan=run('python',['-I',path.join(here,'artifact_scan.py'),renders,'--json',path.join(work,'artifacts.json')]);
const artifacts=fs.existsSync(path.join(work,'artifacts.json'))?JSON.parse(fs.readFileSync(path.join(work,'artifacts.json'),'utf8')):{};
// A patch of 5,000 px or more fails (the lantern's squares before the shader fix were up to 2,600 px, but dark belts, hair and shield corners reach 3,800 px), a smaller one is listed for a look at the
// screenshot. Item 11904 (Spirit of Aquementas) is a known exception: the client's model draws its glow disc with an opaque, unlit material (the only one of 3,229 models), so it shows a dark halo.
const KNOWN=[/^x-\w\w-11904__/];
const review=[];
for(const [file,rects] of Object.entries(artifacts)) {
  const largest=Math.max(...rects.map(x=>x[4])),text=`${rects.length} solid black patch(es), largest ${largest} px`;
  if(KNOWN.some(re=>re.test(file)))review.push({name:file,problem:text+' (known: item 11904 opaque glow disc in the client model)'});
  else if(largest>=5000)results.push({name:file,problem:text});
  else review.push({name:file,problem:text});
}
fs.writeFileSync(path.join(work,'report.json'),JSON.stringify({cases:cases.length,problems:results,review},null,1));
for(const p of results.slice(0,40))console.log(`PROBLEM  ${p.name}: ${p.problem}`);
console.log(`\n${cases.length} loadouts rendered, ${results.length} problem(s)`);
process.exit(status||results.length?1:0);
