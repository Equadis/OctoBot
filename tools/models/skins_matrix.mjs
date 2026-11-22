// Runs every mapped skin look through the real Dressing Room with equipment, and every body through the default look, in a headless browser.
//
//   node tools/models/skins_matrix.mjs <skins overlay folder> <model overlay folder> [report.json]
//
// For each variant in the catalogue (one skin on one race and sex): the outfit is loaded from a link with the skin plus a helm, shoulders, a robe, a cloak and a weapon, and the run
// checks that the live model carries exactly that skin's choice, the gear is applied, no note says the skin was dropped, and nothing failed to load. Every fourth variant also
// changes a customisation choice (the skin must survive), and is then cleared (the default look must come back). Every body (10 races x 2 sexes) is also loaded with gear and no skin.
// Variants are visited one after another in one page, so every skin-only change on the same body is exercised too. Exits 1 when any check fails.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from './cdp.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const [skinsFolder,modelsFolder,reportPath]=process.argv.slice(2);
if(!modelsFolder){console.error('usage: node tools/models/skins_matrix.mjs <skins overlay folder> <model overlay folder> [report.json]');process.exit(2);}
const freePort=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});
const port=await freePort();
const server=spawn('node',[path.join(here,'e2e_server.mjs'),[skinsFolder,modelsFolder].join(','),String(port)],{stdio:'ignore'});
for(let i=0;i<50;i++) {try {if((await fetch(`http://127.0.0.1:${port}/api/outfitter/models-version`)).ok)break;} catch {}await new Promise(r=>setTimeout(r,200));}
const base=`http://127.0.0.1:${port}`;

// gear: a helm, shoulders, a robe (chest type 20), a cloak and a weapon from the site's own equipment catalogue
const catalogue=JSON.parse(fs.readFileSync(path.resolve(here,'..','..','docs','sim','data','items','catalogue.json'),'utf8'));
const byName=name=>catalogue.find(i=>i.name===name);
const robe=catalogue.find(i=>i.slot===20&&i.quality>=3&&i.classs===4)||catalogue.find(i=>i.slot===20);
const GEAR={1:20315,3:20322,5:robe?.id||20323,15:18350,16:20362};
const GEAR_COUNT=Object.keys(GEAR).length;
const outfit=(race,gender,skin)=>'#outfit='+encodeURIComponent(JSON.stringify({version:1,race,gender,gear:GEAR,hideHead:false,hideBack:false,look:{},...(skin?{skin}:{})}));

const results=[];
const check=(name,ok,detail='')=>{results.push({name,ok:Boolean(ok),detail:ok?'':detail});if(!ok)console.log(`FAIL  ${name}  ${detail}`);};
const browser=await launch({width:1280,height:1200});
try {
  await browser.goto(`${base}/outfitter/?debug`);
  await browser.eval('localStorage.clear(); 1');
  if(!await browser.waitFor('!!window.__outfitter&&window.__outfitter.skins().length>0&&!!window.__outfitter.actor()',90000))throw Error('the page did not start');
  const raw=await browser.eval('fetch("/api/outfitter/skins").then(r=>r.json())');
  const jobs=[];
  for(const skin of raw.skins)if(skin.tokenItemId)for(const v of skin.variants)jobs.push({id:skin.id,name:skin.name,race:v.texture.race,gender:v.gender,choice:v.choiceId});
  console.log(`${jobs.length} skin looks, gear ${JSON.stringify(GEAR)}`);
  const applied=()=>browser.eval('JSON.parse(window.__outfitter.appliedLook())').catch(()=>null);
  const settle=async(expr)=>browser.waitFor(expr,45000);
  let n=0;
  for(const job of jobs) {
    const failedBefore=browser.failedRequests.length,errorsBefore=browser.consoleErrors.length;
    await browser.eval(`location.hash=${JSON.stringify(outfit(job.race,job.gender,job.id))};1`);
    const ok=await settle(`(()=>{const o=window.__outfitter;if(!o||!o.actor())return false;const f=o.outfit();return f.race===${job.race}&&f.gender===${job.gender}&&f.skin===${JSON.stringify(job.id)}&&o.appliedLook().length>10&&document.getElementById('model-status').hidden&&o.applied().length>=${GEAR_COUNT}})()`);
    await browser.sleep(900);
    const a=await applied(),note=await browser.eval('document.getElementById("skin-note").hidden?"":document.getElementById("skin-note").textContent');
    const label=`${job.name} (${job.race}/${job.gender})`;
    check(`${label}: loads with gear and carries its own skin choice`,ok&&a&&a[1]===job.choice&&!note,JSON.stringify({ok,applied:a,expected:job.choice,note}));
    const gearApplied=await browser.eval('window.__outfitter.applied().length');
    check(`${label}: all ${GEAR_COUNT} equipped slots applied`,gearApplied>=GEAR_COUNT,`applied ${gearApplied}`);
    const bad=browser.failedRequests.slice(failedBefore).filter(u=>!/zamimg|wowhead|octowow\.st|favicon|\/api\/outfitter\/item\//.test(u));
    check(`${label}: nothing failed to load`,bad.length===0&&browser.consoleErrors.length===errorsBefore,bad.slice(0,3).join(' | ')+' '+browser.consoleErrors.slice(errorsBefore).slice(0,2).join(' | '));
    if(n++%4===0) {
      // customisation: change the hair style with the page's own arrow; the skin must stay
      const changed=await browser.eval(`(()=>{const row=[...document.querySelectorAll('.look-option')].find(r=>/Hair Style/.test(r.textContent));const arrow=row&&row.querySelectorAll('.look-arrow')[1];if(!arrow)return false;arrow.click();return true;})()`);
      await browser.sleep(1200);
      const after=await applied();
      check(`${label}: a customisation change keeps the skin`,changed&&after&&after[1]===job.choice&&(await browser.eval('window.__outfitter.outfit().skin'))===job.id,JSON.stringify({changed,after}));
      await browser.eval('document.getElementById("skin-clear").click();1');await browser.sleep(1200);
      const cleared=await applied();
      check(`${label}: clearing restores the default look`,cleared&&cleared[1]===0&&!(await browser.eval('window.__outfitter.outfit().skin')),JSON.stringify(cleared));
    }
    if(n%10===0)console.log(`${n}/${jobs.length}`);
  }
  // every body, default look, with the same equipment
  for(let race=1;race<=10;race++)for(let gender=0;gender<=1;gender++) {
    const failedBefore=browser.failedRequests.length,errorsBefore=browser.consoleErrors.length;
    await browser.eval(`location.hash='';1`);await browser.sleep(200);
    await browser.eval(`location.hash=${JSON.stringify(outfit(race,gender,null))};1`);
    const ok=await settle(`(()=>{const o=window.__outfitter;return !!o&&!!o.actor()&&o.outfit().race===${race}&&o.outfit().gender===${gender}&&document.getElementById('model-status').hidden&&o.applied().length>=${GEAR_COUNT}})()`);
    await browser.sleep(700);
    const bad=browser.failedRequests.slice(failedBefore).filter(u=>!/zamimg|wowhead|octowow\.st|favicon|\/api\/outfitter\/item\//.test(u));
    check(`body ${race}/${gender}: loads with gear, default look`,ok&&bad.length===0&&browser.consoleErrors.length===errorsBefore,JSON.stringify({ok,bad:bad.slice(0,3)}));
  }
} finally {
  await browser.close();
  server.kill();
}
const failed=results.filter(r=>!r.ok);
if(reportPath)fs.writeFileSync(reportPath,JSON.stringify({gear:GEAR,results},null,1));
console.log(`\n${results.length-failed.length} of ${results.length} checks passed`);
process.exit(failed.length?1:0);
