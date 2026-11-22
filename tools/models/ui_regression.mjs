// Browser regression test of the Dressing Room's Character Skins feature, run in a real headless browser against the real page and the real Worker code.
//
//   node tools/models/ui_regression.mjs <skins overlay folder> <model overlay folder> [--mobile-only]
//
// Starts tools/models/e2e_server.mjs twice on free ports (one with the skins overlay, one without, i.e. a service that has no skins), drives the page with cdp.mjs
// and prints PASS or FAIL for each check. Needs a built skins overlay (skins.py build) and a model overlay (build_overlay.py / merge_overlays.py); nothing is uploaded and
// nothing leaves this machine except the Worker's usual lookups of item data. Exit status 1 when any check fails.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from './cdp.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const [skinsFolder,modelsFolder]=process.argv.slice(2).filter(a=>!a.startsWith('--'));
if(!modelsFolder){console.error('usage: node tools/models/ui_regression.mjs <skins overlay folder> <model overlay folder>');process.exit(2);}
const freePort=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});
const servers=[];
async function serve(folders,extra=[]) {
  const port=await freePort();
  const child=spawn('node',[path.join(here,'e2e_server.mjs'),folders.join(','),String(port),...extra],{stdio:'ignore'});
  servers.push(child);
  for(let i=0;i<50;i++) {try {if((await fetch(`http://127.0.0.1:${port}/api/outfitter/models-version`)).ok)return `http://127.0.0.1:${port}`;} catch {}await new Promise(r=>setTimeout(r,200));}
  throw Error('the test server did not start');
}

const results=[];
function check(name,ok,detail='') {results.push({name,ok:Boolean(ok)});console.log(`${ok?'PASS':'FAIL'}  ${name}${ok?'':'  '+detail}`);}
const outfitHash=outfit=>'#outfit='+encodeURIComponent(JSON.stringify({version:1,race:1,gender:0,gear:{},hideHead:false,hideBack:false,look:{},...outfit}));

// a catalogue whose texture files are missing (the choices and catalogue are there, the textures are not), and a service whose skins route fails
const noTextures=fs.mkdtempSync(path.join(os.tmpdir(),'octobot-notex-'));
fs.cpSync(path.join(skinsFolder,'skins'),path.join(noTextures,'skins'),{recursive:true});
const withSkins=await serve([skinsFolder,modelsFolder]),without=await serve([modelsFolder]),failing=await serve([skinsFolder,modelsFolder],['--fail-skins']),missing=await serve([noTextures,modelsFolder]);
const browser=await launch({width:1280,height:1200});
try {
  const ready=expr=>browser.waitFor(expr,60000);
  const state=()=>browser.eval('JSON.stringify({skin:window.__outfitter.outfit().skin||null,race:window.__outfitter.outfit().race,gender:window.__outfitter.outfit().gender,current:(document.getElementById("skin-value")||{}).textContent||null,note:document.getElementById("skin-note").hidden?"":document.getElementById("skin-note").textContent,applied:window.__outfitter.appliedLook(),feedback:document.getElementById("feedback").textContent})').then(JSON.parse);
  const open=async hash=>{await browser.goto(`${withSkins}/outfitter/?debug`);await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(hash||'')}; location.reload(); 1`);await browser.sleep(500);await ready('!!window.__outfitter&&window.__outfitter.skins().length>0&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden&&!!document.getElementById("skin-main")');await browser.sleep(1200);};
  // the Skin dropdown: its list of names (opened and closed again), and choosing a name from it
  const names=async()=>{await browser.eval('document.getElementById("skin-main").click()');const list=await browser.eval('JSON.stringify([...document.querySelectorAll(".look-skin-menu .look-choice")].map(c=>c.textContent))').then(JSON.parse);await browser.eval('document.getElementById("skin-main").click()');return list;};
  const pick=async name=>{await browser.eval('document.getElementById("skin-main").click()');const ok=await browser.eval(`(()=>{const c=[...document.querySelectorAll(".look-skin-menu .look-choice")].find(c=>c.textContent===${JSON.stringify(name)});if(c)c.click();return !!c;})()`);await browser.sleep(300);return ok;};
  const waitSkin=async id=>ready(`window.__outfitter.outfit().skin===${JSON.stringify(id)}&&window.__outfitter.appliedLook().length>10`);
  const dropdowns=()=>browser.eval('JSON.stringify([...document.querySelectorAll("#look-options .look-option .look-name")].map(n=>n.textContent))').then(JSON.parse);

  // ---- a service with skins ----
  await open();
  let s=await state();
  const labels=await dropdowns();
  check('Skin is the sixth Appearance dropdown, after the five of the model',labels.length===6&&labels[5]==='Skin'&&!labels.slice(0,5).includes('Skin'),JSON.stringify(labels));
  check('there is no skin dialog or old Character skin row',await browser.eval('!document.getElementById("skins-dialog")&&!document.getElementById("skin-row")&&!document.getElementById("skins-open")'));
  check('the catalogue has the shop tokens',(await browser.eval('window.__outfitter.skins().filter(s=>s.labelled).length'))>=40);
  check('the default is None',s.current==='None'&&!s.skin);
  const colour=await browser.eval('JSON.stringify([...document.querySelectorAll("#look-options .look-option")].map(r=>[r.querySelector(".look-name").textContent,r.querySelector(".look-value").textContent]))').then(JSON.parse);
  check('the model\'s own Skin Color is unchanged and does not list skins',colour[0][0]==='Skin Color'&&Number(colour[0][1])===1&&Number(colour[0][1])<=30,JSON.stringify(colour[0]));
  let list=await names();
  check('the list starts with None and has only skins for a Human man, by name',list[0]==='None'&&list.length>1&&list.includes('Mark of Fel Power')&&list.includes('Mark of Death I')&&!list.includes('Mark of the Wildhammer Clan I')&&!list.includes('Mark of Magic Addiction'),JSON.stringify(list));
  check('skins without a shop name (unlabelled client textures) are not listed',!list.some(n=>/Unlabelled/.test(n))&&list.length<20,JSON.stringify(list));
  check('skins the shop names but the client has no texture for are not listed (Dreadskull Clan I, Necromancy II)',!list.some(n=>/Dreadskull Clan I$|Necromancy II/.test(n)));

  // choose a skin
  check('choosing a fitting skin',await pick('Mark of Fel Power'));
  await waitSkin('skin-50291');await browser.sleep(1500);
  s=await state();
  check('the skin is selected and the dropdown shows its name',s.skin==='skin-50291'&&s.current==='Mark of Fel Power'&&!await browser.eval('!!document.querySelector(".look-skin-menu")'));
  check('the skin is saved in this browser',await browser.eval('JSON.parse(localStorage.getItem("octobot-outfitter-v1")).skin==="skin-50291"'));
  const skinFile=await browser.eval('fetch("/api/outfitter/skins").then(r=>r.json()).then(c=>c.skins.find(s=>s.id==="skin-50291").variants[0].textureFileId)');
  check('the viewer fetched the skins own texture file',browser.requests.some(url=>url.includes(`/textures/${skinFile}.webp`)));
  check('the live model carries the skin choice',JSON.parse(s.applied)[1]>=9950000,s.applied);
  check('the other five dropdowns were not changed by it',JSON.stringify(await browser.eval('JSON.stringify([...document.querySelectorAll("#look-options .look-option .look-value")].slice(0,5).map(v=>v.textContent))').then(JSON.parse))===JSON.stringify(colour.slice(0,5).map(c=>c[1])));
  await browser.eval('document.querySelector("#skin-option .look-arrow:last-child").click()');await browser.sleep(1200);
  s=await state();
  check('the arrows step through the list',s.skin&&s.skin!=='skin-50291'&&s.current===list[list.indexOf('Mark of Fel Power')+1],JSON.stringify(s));
  await pick('None');await browser.sleep(800);
  check('choosing None returns to the default appearance',!(await state()).skin&&(await state()).current==='None'&&JSON.parse((await state()).applied)[1]===0);
  await pick('Mark of Fel Power');await waitSkin('skin-50291');

  // same-body changes reach the live model (this was a real bug: only race or sex changes reloaded it)
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({skin:'skin-83091'}))}; 1`);await waitSkin('skin-83091');await browser.sleep(1500);
  s=await state();
  const frost=await browser.eval('window.__outfitter.skins().find(s=>s.id==="skin-83091").variants[0].choiceId');
  check('a link that changes only the skin is applied to the live model',s.skin==='skin-83091'&&s.current==='Mark of Frost Affinity'&&JSON.parse(s.applied)[1]===frost,JSON.stringify(s));

  // race and sex filtering
  await browser.eval('document.querySelector("#gender-picker button:nth-child(2)").click()');await ready('window.__outfitter.outfit().gender===1');await browser.sleep(1500);
  s=await state();
  check('changing sex drops a male-only skin and says why',!s.skin&&/Only has a male look/.test(s.note)&&s.current==='None',JSON.stringify(s));
  list=await names();
  check('the list now only has skins for a Human woman',list[0]==='None'&&list.includes('Mark of Necromancy I')&&list.includes('Mark of Azotha')&&!list.includes('Mark of Fel Power')&&!list.includes('Mark of Death I'),JSON.stringify(list));
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({gender:1,skin:'skin-50106'}))}; 1`);await waitSkin('skin-50106');
  check('a skin with a look for both sexes follows the body',(await state()).skin==='skin-50106');
  await browser.eval('document.querySelector("#race-picker button:nth-child(3)").click()');await ready('window.__outfitter.outfit().race===3');await browser.sleep(1200);
  s=await state();
  check('changing race drops a skin of another race and says why',!s.skin&&/Only for Human/.test(s.note),JSON.stringify(s));
  list=await names();
  check('the list for a Dwarf woman has the Dwarf skins and no Human ones',list.includes('Mark of the Wildhammer Clan I')&&list.includes('Mark of the Dark Iron Clan')&&!list.some(n=>/Necromancy I$|Fel Power|Azotha/.test(n)),JSON.stringify(list));

  // links, import and saved outfits
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({race:3,skin:'skin-50205'}))}; 1`);await waitSkin('skin-50205');await browser.sleep(800);
  s=await state();
  check('a shared link with a skin restores it',s.skin==='skin-50205'&&s.current==='Mark of the Dark Iron Clan');
  await browser.eval('document.getElementById("save").click()');await browser.sleep(300);
  await browser.eval('document.getElementById("outfit-name").value="Skin test";document.getElementById("save-form").requestSubmit()');await browser.sleep(500);
  check('a saved outfit stores the skin',await browser.eval('JSON.parse(localStorage.getItem("octobot-outfits-v1")).some(e=>e.name==="Skin test"&&e.outfit.skin==="skin-50205")'));
  await pick('None');await browser.sleep(800);
  check('None returns to the default appearance',!(await state()).skin&&(await state()).current==='None');
  await browser.eval('document.querySelector(".saved-load").click()');await waitSkin('skin-50205');
  check('loading the saved outfit restores the skin',(await state()).skin==='skin-50205');
  await browser.eval('document.getElementById("look-reset").click()');await browser.sleep(1200);
  check('Reset appearance returns the Skin dropdown to None',!(await state()).skin&&(await state()).current==='None');
  await pick('Mark of the Dark Iron Clan');await waitSkin('skin-50205');
  await browser.eval('document.getElementById("reset").click()');await browser.sleep(1500);
  check('Reset all clears the skin',!(await state()).skin);
  // export, import and Tmog codes keep the skin
  await browser.eval(`location.hash='';1`);await browser.sleep(300);
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({race:3,skin:'skin-50205'}))}; 1`);await ready('window.__outfitter.outfit().race===3&&window.__outfitter.outfit().skin==='+JSON.stringify('skin-50205')+'&&window.__outfitter.appliedLook().length>10');await browser.sleep(1200);
  await browser.eval('document.getElementById("share").click()');await browser.sleep(500);
  const exported=await browser.eval('document.getElementById("outfit-code").value');
  check('Share produces a link that carries the skin',/#outfit=/.test(exported)&&decodeURIComponent(exported.split('#outfit=')[1]).includes('skin-50205'),exported.slice(0,120));
  await browser.eval('document.getElementById("exchange").close()');
  await pick('None');await browser.sleep(600);
  await browser.eval(`document.getElementById("outfit-code").value=${JSON.stringify(exported)};document.getElementById("apply-code").click()`);await waitSkin('skin-50205');
  check('importing that link restores the skin',(await state()).skin==='skin-50205');
  await browser.eval('document.getElementById("import").click()');await browser.sleep(300);
  const tmog=await browser.eval('document.getElementById("outfit-code").value');
  await browser.eval(`document.getElementById("outfit-code").value=${JSON.stringify(tmog)};document.getElementById("apply-code").click()`);await browser.sleep(800);
  check('importing a Tmog code (equipment only) keeps the chosen skin',/^T\.O\.L\./.test(tmog)&&(await state()).skin==='skin-50205');

  // backwards compatibility
  await open(outfitHash({}).replace('%22look%22%3A%7B%7D','%22look%22%3A%7B%7D'));
  s=await state();
  check('an outfit link made before skins existed loads with None',!s.skin&&s.current==='None'&&!s.note);
  await browser.eval(`localStorage.setItem("octobot-outfitter-v1",JSON.stringify({version:1,race:2,gender:1,gear:{},hideHead:false,hideBack:false,look:{}})); location.hash=""; location.reload(); 1`);
  await ready('!!window.__outfitter&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden');
  s=await state();check('a saved outfit without a skin field still loads',s.race===2&&s.gender===1&&!s.skin);
  await open(outfitHash({skin:'skin-99999'}));
  s=await state();check('a link naming a skin the catalogue does not have is dropped with a message',!s.skin&&/not available/.test(s.note),JSON.stringify(s));
  await open(outfitHash({skin:'<script>alert(1)</script>'}));
  s=await state();check('a malformed skin id is ignored',!s.skin&&s.current==='None');

  // a token whose texture is not linked cannot be worn: it is not offered, and a link naming it is dropped with the reason
  await open(outfitHash({race:2,skin:'skin-50223'}));
  s=await state();list=await names();
  check('an unlinked token is not listed, and a link naming it falls back to None with its reason',!s.skin&&s.current==='None'&&/not been identified|no usable|Only/.test(s.note)&&!list.some(n=>/Dreadskull Clan I$/.test(n)),JSON.stringify({s,list}));
  check('an Orc man is offered the Orc skins and no other race\'s',list.includes('Mark of the Burning Blade')&&list.includes('Mark of the Mag\'har Heritage')&&!list.some(n=>/Death|Dalaran|Wildhammer|Nature/.test(n)),JSON.stringify(list));

  // mobile layout
  await browser.resize(390,820);await browser.sleep(500);
  await browser.eval('document.getElementById("skin-main").click()');await browser.sleep(400);
  const geometry=await browser.eval('(()=>{const m=document.querySelector(".look-skin-menu").getBoundingClientRect();return {left:m.left,right:m.right,width:innerWidth,scrollW:document.documentElement.scrollWidth,items:document.querySelectorAll(".look-skin-menu .look-choice").length}})()');
  check('the Skin list fits a phone screen without sideways scrolling',geometry.left>=0&&geometry.right<=geometry.width+1&&geometry.scrollW<=geometry.width+1&&geometry.items>1,JSON.stringify(geometry));
  await browser.eval('document.getElementById("skin-main").click()');await browser.resize(1280,1200);

  // ---- a service without skins (the Worker as deployed today) ----
  await browser.goto(`${without}/outfitter/?debug`);
  await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(outfitHash({skin:'skin-50291'}))}; location.reload(); 1`);
  await ready('!!window.__outfitter&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden');await browser.sleep(1200);
  check('a service with no skins has only the five dropdowns and shows the default look',(await dropdowns()).length===5&&!(await dropdowns()).includes('Skin')&&(await state()).applied.length>0);
  check('a skin in a link is never swapped for another when the service has none',(await state()).race===1&&(await browser.eval('window.__outfitter.skins().length'))===0);

  check('no script errors in the whole run',browser.consoleErrors.length===0,browser.consoleErrors.slice(0,3).join(' | '));
  const bad=browser.failedRequests.filter(u=>!/zamimg|wowhead|octowow\.st|favicon|\/api\/outfitter\/(item|assets\/.*\/meta\/armor)/.test(u));
  check('no failed requests to the test servers',bad.length===0,bad.slice(0,5).join(' | '));

  // ---- a service whose skins route fails, and a catalogue whose textures are missing ----
  const errorsBefore=browser.consoleErrors.length;
  await browser.goto(`${failing}/outfitter/?debug`);
  await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(outfitHash({skin:'skin-50291'}))}; location.reload(); 1`);
  await ready('!!window.__outfitter&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden');await browser.sleep(1000);
  check('a failing skins route leaves five dropdowns and the model still loads in the default look',(await dropdowns()).length===5&&(await state()).applied.length>0&&JSON.parse((await state()).applied)[1]===0);
  await browser.goto(`${missing}/outfitter/?debug`);
  await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(outfitHash({skin:'skin-50291'}))}; location.reload(); 1`);
  await ready('!!window.__outfitter&&window.__outfitter.skins().length>0&&!!window.__outfitter.actor()');await browser.sleep(2500);
  s=await state();
  check('a skin whose texture files are missing leaves the page working and the skin chosen',s.skin==='skin-50291'&&(await browser.eval('typeof window.__outfitter.actor().setAppearance'))==='function',JSON.stringify(s));
  check('the missing texture requests were made and failed without a script error',browser.failedRequests.some(u=>/\/textures\/99\d{5}\.webp/.test(u)));
  await pick('None');await browser.sleep(800);
  check('None still restores the default look afterwards',!(await state()).skin&&(await state()).current==='None');
  check('neither failure caused a script error',browser.consoleErrors.length===errorsBefore,browser.consoleErrors.slice(errorsBefore,errorsBefore+3).join(' | '));
  browser.failedRequests.length=0;browser.consoleErrors.length=errorsBefore;
} finally {
  await browser.close();
  for(const child of servers)child.kill();
}
const failed=results.filter(r=>!r.ok);
console.log(`\n${results.length-failed.length} of ${results.length} checks passed`);
process.exit(failed.length?1:0);
