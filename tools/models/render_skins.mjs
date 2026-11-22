// Renders skins from a running e2e server (tools/models/e2e_server.mjs) with the headless browser and saves one PNG per skin and body.
//
//   node tools/models/render_skins.mjs <server base url> <out folder> [--ids skin-50291,skin-u-2-0-orcmale...] [--race 2] [--gender 0] [--unlabelled-only | --labelled-only] [--default]
//
// Files are named <skin id>__<race>-<gender>.png (the default look: default__<race>-<gender>.png). Rendering is not proof of the right skin: the PNGs are for
// comparing with the shop's own pictures by eye (contact sheets in tools/models/out/skins).
import fs from 'node:fs';
import path from 'node:path';
import {launch} from './cdp.mjs';

const args=process.argv.slice(2),flag=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const [base,out]=args.filter((a,i)=>!a.startsWith('--')&&!['--ids','--race','--gender'].includes(args[i-1]));
if(!out){console.error('usage: node tools/models/render_skins.mjs <server base url> <out folder> [--ids a,b] [--race N] [--gender 0|1] [--unlabelled-only] [--default]');process.exit(2);}
fs.mkdirSync(out,{recursive:true});
const ids=flag('--ids')?.split(','),onlyRace=flag('--race')?Number(flag('--race')):null,onlyGender=flag('--gender')!==null?Number(flag('--gender')):null;

const browser=await launch({width:900,height:1000});
try {
  await browser.goto(`${base}/outfitter/?debug`);
  if(!await browser.waitFor('!!window.__outfitter&&window.__outfitter.skins().length>0',90000)){console.error('the page did not list skins');process.exitCode=1;}
  const skins=await browser.eval('JSON.stringify(window.__outfitter.skins())').then(JSON.parse);
  const jobs=[];
  if(args.includes('--default'))for(const race of [1,2,3,4,5,6,7,8,9,10])for(const gender of [0,1])if((!onlyRace||race===onlyRace)&&(onlyGender===null||gender===onlyGender))jobs.push({id:null,race,gender});
  for(const skin of skins) {
    if(ids&&!ids.includes(skin.id))continue;
    if(args.includes('--unlabelled-only')&&skin.labelled)continue;
    if(args.includes('--labelled-only')&&!skin.labelled)continue;
    for(const v of skin.variants)if((!onlyRace||v.race===onlyRace)&&(onlyGender===null||v.gender===onlyGender))jobs.push({id:skin.id,race:v.race,gender:v.gender});
  }
  console.log(`${jobs.length} renders`);
  let n=0;
  for(const job of jobs) {
    const outfit=JSON.stringify({version:1,race:job.race,gender:job.gender,gear:{},hideHead:false,hideBack:false,look:{},...(job.id?{skin:job.id}:{})});
    await browser.eval(`location.hash='outfit='+encodeURIComponent(${JSON.stringify(outfit)}); 1`);
    // wait until the model of this body is up with this skin applied and has stopped loading
    const ready=await browser.waitFor(`(()=>{const o=window.__outfitter;return !!o&&!!o.actor()&&o.outfit().race===${job.race}&&o.outfit().gender===${job.gender}&&${job.id?`o.outfit().skin===${JSON.stringify(job.id)}`:'true'}&&document.getElementById('model-status').hidden})()`,40000);
    await browser.sleep(1800);                                  // textures arrive after the actor exists
    const box=await browser.eval('(()=>{const r=document.querySelector(".model-wrap").getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height}})()');
    fs.writeFileSync(path.join(out,`${job.id||'default'}__${job.race}-${job.gender}.png`),await browser.screenshot(box));
    if(!ready)console.log('not ready:',job);
    if(++n%10===0)console.log(`${n}/${jobs.length}`);
  }
  console.log('failed requests:',browser.failedRequests.length,'script errors:',browser.consoleErrors.length);
} finally {await browser.close();}
