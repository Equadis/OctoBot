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
  const state=()=>browser.eval('JSON.stringify({skin:window.__outfitter.outfit().skin||null,race:window.__outfitter.outfit().race,gender:window.__outfitter.outfit().gender,current:document.getElementById("skin-current").textContent,clear:!document.getElementById("skin-clear").hidden,note:document.getElementById("skin-note").hidden?"":document.getElementById("skin-note").textContent,applied:window.__outfitter.appliedLook(),feedback:document.getElementById("feedback").textContent})').then(JSON.parse);
  const open=async hash=>{await browser.goto(`${withSkins}/outfitter/?debug`);await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(hash||'')}; location.reload(); 1`);await browser.sleep(500);await ready('!!window.__outfitter&&window.__outfitter.skins().length>0&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden');await browser.sleep(1200);};
  const cards=()=>browser.eval('JSON.stringify([...document.querySelectorAll(".skin-card")].map(c=>({name:c.querySelector(".skin-name").textContent,blocked:c.classList.contains("blocked"),title:c.title,selected:c.classList.contains("selected")})))').then(JSON.parse);
  const setField=(id,value,event='input')=>browser.eval(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(${JSON.stringify(event)}));})()`);
  const tick=(id,on)=>browser.eval(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.checked=${on};e.dispatchEvent(new Event("change"));})()`);
  const pickCard=name=>browser.eval(`(()=>{const c=[...document.querySelectorAll(".skin-card")].find(c=>c.querySelector(".skin-name").textContent===${JSON.stringify(name)});if(c)c.click();return !!c;})()`);
  const waitSkin=async id=>ready(`window.__outfitter.outfit().skin===${JSON.stringify(id)}&&window.__outfitter.appliedLook().length>10`);

  // ---- a service with skins ----
  await open();
  let s=await state();
  check('the skin row appears when the service lists skins',await browser.eval('!document.getElementById("skin-row").hidden'));
  check('the catalogue has the shop tokens',(await browser.eval('window.__outfitter.skins().filter(s=>s.labelled).length'))>=40);
  check('the default appearance is shown with no Clear button',s.current==='Default appearance'&&!s.clear&&!s.skin);

  await browser.eval('document.getElementById("skins-open").click()');await browser.sleep(600);
  check('the panel opens as a modal dialog',await browser.eval('document.getElementById("skins-dialog").open'));
  let list=await cards();
  check('by default only skins that fit this character are listed, none blocked',list.length>0&&list.every(c=>!c.blocked),JSON.stringify(list.filter(c=>c.blocked).map(c=>c.name)));
  check('the status line says how many more exist',/more are for other bodies/.test(await browser.eval('document.getElementById("skins-status").textContent')));
  await tick('skins-compatible',false);await browser.sleep(300);
  list=await cards();
  const blocked=list.filter(c=>c.blocked);
  check('unticking "Fits this character" lists blocked skins with the reason on each card',blocked.length>0&&blocked.every(c=>/Only|not been identified|no usable/.test(c.title)),JSON.stringify(blocked.slice(0,2)));
  await setField('skins-search','wildhammer');await browser.sleep(300);
  check('search finds skins by name',(await cards()).length===4&&(await cards()).every(c=>/Wildhammer/.test(c.name)));
  await setField('skins-search','');await setField('skins-category','Dwarf','change');await browser.sleep(300);
  check('the category filter narrows to one race',(await cards()).length>0&&(await cards()).every(c=>!/Mark of Fel Power/.test(c.name)));
  await setField('skins-category','','change');
  const before=(await cards()).length;await tick('skins-unlabelled',true);await browser.sleep(300);
  check('"Unlabelled client skins" adds the textures no token is linked to',(await cards()).length>before);
  await tick('skins-unlabelled',false);await tick('skins-compatible',true);await setField('skins-search','');await browser.sleep(300);

  // choose a skin
  const fileRequestsBefore=await browser.eval('performance.getEntriesByType("resource").length');
  check('picking a fitting skin',await pickCard('Mark of Fel Power'));
  await waitSkin('skin-50291');await browser.sleep(1500);
  s=await state();
  check('the skin is selected, shown, and the dialog closed',s.skin==='skin-50291'&&s.current==='Mark of Fel Power'&&s.clear&&!await browser.eval('document.getElementById("skins-dialog").open'));
  check('the skin is saved in this browser',await browser.eval('JSON.parse(localStorage.getItem("octobot-outfitter-v1")).skin==="skin-50291"'));
  const skinFile=await browser.eval('fetch("/api/outfitter/skins").then(r=>r.json()).then(c=>c.skins.find(s=>s.id==="skin-50291").variants[0].textureFileId)');
  const textureFetched=browser.requests.some(url=>url.includes(`/textures/${skinFile}.webp`));
  check('the viewer fetched the skins own texture file',textureFetched);
  check('the live model carries the skin choice',JSON.parse(s.applied)[1]>=9950000,s.applied);

  // same-body changes reach the live model (this was a real bug: only race or sex changes reloaded it)
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({skin:'skin-83091'}))}; 1`);await waitSkin('skin-83091');await browser.sleep(1500);
  s=await state();
  const frost=await browser.eval('window.__outfitter.skins().find(s=>s.id==="skin-83091").variants[0].choiceId');
  check('a link that changes only the skin is applied to the live model',s.skin==='skin-83091'&&s.current==='Mark of Frost Affinity'&&JSON.parse(s.applied)[1]===frost,JSON.stringify(s));

  // race and sex compatibility
  await browser.eval('document.querySelector("#gender-picker button:nth-child(2)").click()');await ready('window.__outfitter.outfit().gender===1');await browser.sleep(1500);
  s=await state();
  check('changing sex drops a male-only skin and says why',!s.skin&&/Only has a male look/.test(s.note)&&s.current==='Default appearance',JSON.stringify(s));
  check('the explanation is kept visible beside the skin row',/Only has a male look/.test(s.note));
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({gender:1,skin:'skin-50106'}))}; 1`);await waitSkin('skin-50106');
  check('a skin with a look for both sexes follows the body',(await state()).skin==='skin-50106');
  await browser.eval('document.querySelector("#race-picker button:nth-child(3)").click()');await ready('window.__outfitter.outfit().race===3');await browser.sleep(1200);
  s=await state();
  check('changing race drops a skin of another race and says why',!s.skin&&/Only for Human/.test(s.note),JSON.stringify(s));

  // links, import and saved outfits
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({race:3,skin:'skin-50205'}))}; 1`);await waitSkin('skin-50205');await browser.sleep(800);
  s=await state();
  check('a shared link with a skin restores it',s.skin==='skin-50205'&&s.current==='Mark of the Dark Iron Clan');
  await browser.eval('document.getElementById("save").click()');await browser.sleep(300);
  await browser.eval('document.getElementById("outfit-name").value="Skin test";document.getElementById("save-form").requestSubmit()');await browser.sleep(500);
  check('a saved outfit stores the skin',await browser.eval('JSON.parse(localStorage.getItem("octobot-outfits-v1")).some(e=>e.name==="Skin test"&&e.outfit.skin==="skin-50205")'));
  await browser.eval('document.getElementById("skin-clear").click()');await browser.sleep(800);
  check('Clear returns to the default appearance',!(await state()).skin&&(await state()).current==='Default appearance');
  await browser.eval('document.querySelector(".saved-load").click()');await waitSkin('skin-50205');
  check('loading the saved outfit restores the skin',(await state()).skin==='skin-50205');
  await browser.eval('document.getElementById("reset").click()');await browser.sleep(1500);
  check('Reset all clears the skin',!(await state()).skin);
  // export, import and Tmog codes keep the skin
  await browser.eval(`location.hash='';1`);await browser.sleep(300);
  await browser.eval(`location.hash=${JSON.stringify(outfitHash({race:3,skin:'skin-50205'}))}; 1`);await ready('window.__outfitter.outfit().race===3&&window.__outfitter.outfit().skin==='+JSON.stringify('skin-50205')+'&&window.__outfitter.appliedLook().length>10');await browser.sleep(1200);
  await browser.eval('document.getElementById("share").click()');await browser.sleep(500);
  const exported=await browser.eval('document.getElementById("outfit-code").value');
  check('Share produces a link that carries the skin',/#outfit=/.test(exported)&&decodeURIComponent(exported.split('#outfit=')[1]).includes('skin-50205'),exported.slice(0,120));
  await browser.eval('document.getElementById("exchange").close()');
  await browser.eval('document.getElementById("skin-clear").click()');await browser.sleep(600);
  await browser.eval(`document.getElementById("outfit-code").value=${JSON.stringify(exported)};document.getElementById("apply-code").click()`);await waitSkin('skin-50205');
  check('importing that link restores the skin',(await state()).skin==='skin-50205');
  await browser.eval('document.getElementById("import").click()');await browser.sleep(300);
  const tmog=await browser.eval('document.getElementById("outfit-code").value');
  await browser.eval(`document.getElementById("outfit-code").value=${JSON.stringify(tmog)};document.getElementById("apply-code").click()`);await browser.sleep(800);
  check('importing a Tmog code (equipment only) keeps the chosen skin',/^T\.O\.L\./.test(tmog)&&(await state()).skin==='skin-50205');

  // backwards compatibility
  await open(outfitHash({}).replace('%22look%22%3A%7B%7D','%22look%22%3A%7B%7D'));
  s=await state();
  check('an outfit link made before skins existed loads with the default appearance',!s.skin&&s.current==='Default appearance'&&!s.note);
  await browser.eval(`localStorage.setItem("octobot-outfitter-v1",JSON.stringify({version:1,race:2,gender:1,gear:{},hideHead:false,hideBack:false,look:{}})); location.hash=""; location.reload(); 1`);
  await ready('!!window.__outfitter&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden');
  s=await state();check('a saved outfit without a skin field still loads',s.race===2&&s.gender===1&&!s.skin);
  await open(outfitHash({skin:'skin-99999'}));
  s=await state();check('a link naming a skin the catalogue does not have is dropped with a message',!s.skin&&/not available/.test(s.note),JSON.stringify(s));
  await open(outfitHash({skin:'<script>alert(1)</script>'}));
  s=await state();check('a malformed skin id is ignored',!s.skin&&s.current==='Default appearance');

  // a token whose texture is not linked cannot be worn and says so
  await open();
  await browser.eval('document.getElementById("skins-open").click()');await browser.sleep(400);await tick('skins-compatible',false);await setField('skins-category','Orc','change');await browser.sleep(300);
  const orc=(await cards()).find(c=>/Dreadskull Clan I$/.test(c.name));
  check('an unlinked token is listed as unavailable with its reason',orc&&orc.blocked&&/Only for Orc|not been identified/.test(orc.title),JSON.stringify(orc));
  await browser.eval('document.getElementById("skins-close").click()');

  // mobile layout
  await browser.resize(390,820);await browser.sleep(500);
  await browser.eval('document.getElementById("skins-open").click()');await browser.sleep(600);
  const geometry=await browser.eval('(()=>{const d=document.getElementById("skins-dialog").getBoundingClientRect();return {left:d.left,right:d.right,width:innerWidth,scrollW:document.documentElement.scrollWidth,cards:document.querySelectorAll(".skin-card").length}})()');
  check('the skins panel fits a phone screen without sideways scrolling',geometry.left>=0&&geometry.right<=geometry.width+1&&geometry.scrollW<=geometry.width+1&&geometry.cards>0,JSON.stringify(geometry));
  await browser.eval('document.getElementById("skins-close").click()');await browser.resize(1280,1200);

  // ---- a service without skins (the Worker as deployed today) ----
  await browser.goto(`${without}/outfitter/?debug`);
  await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(outfitHash({skin:'skin-50291'}))}; location.reload(); 1`);
  await ready('!!window.__outfitter&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden');await browser.sleep(1200);
  check('a service with no skins hides the skin row and shows the default look',await browser.eval('document.getElementById("skin-row").hidden')&&(await state()).applied.length>0);
  check('a skin in a link is never swapped for another when the service has none',(await state()).race===1&&(await browser.eval('window.__outfitter.skins().length'))===0);

  check('no script errors in the whole run',browser.consoleErrors.length===0,browser.consoleErrors.slice(0,3).join(' | '));
  const bad=browser.failedRequests.filter(u=>!/zamimg|wowhead|octowow\.st|favicon|\/api\/outfitter\/(item|assets\/.*\/meta\/armor)/.test(u));
  check('no failed requests to the test servers',bad.length===0,bad.slice(0,5).join(' | '));

  // ---- a service whose skins route fails, and a catalogue whose textures are missing ----
  const errorsBefore=browser.consoleErrors.length;
  await browser.goto(`${failing}/outfitter/?debug`);
  await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(outfitHash({skin:'skin-50291'}))}; location.reload(); 1`);
  await ready('!!window.__outfitter&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden');await browser.sleep(1000);
  check('a failing skins route hides the skin row and the model still loads in the default look',await browser.eval('document.getElementById("skin-row").hidden')&&(await state()).applied.length>0&&JSON.parse((await state()).applied)[1]===0);
  await browser.goto(`${missing}/outfitter/?debug`);
  await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(outfitHash({skin:'skin-50291'}))}; location.reload(); 1`);
  await ready('!!window.__outfitter&&window.__outfitter.skins().length>0&&!!window.__outfitter.actor()');await browser.sleep(2500);
  s=await state();
  check('a skin whose texture files are missing leaves the page working and the skin chosen',s.skin==='skin-50291'&&(await browser.eval('typeof window.__outfitter.actor().setAppearance'))==='function',JSON.stringify(s));
  check('the missing texture requests were made and failed without a script error',browser.failedRequests.some(u=>/\/textures\/99\d{5}\.webp/.test(u)));
  await browser.eval('document.getElementById("skin-clear").click()');await browser.sleep(800);
  check('Clear still restores the default look afterwards',!(await state()).skin&&(await state()).current==='Default appearance');
  check('neither failure caused a script error',browser.consoleErrors.length===errorsBefore,browser.consoleErrors.slice(errorsBefore,errorsBefore+3).join(' | '));
  browser.failedRequests.length=0;browser.consoleErrors.length=errorsBefore;
} finally {
  await browser.close();
  for(const child of servers)child.kill();
}
const failed=results.filter(r=>!r.ok);
console.log(`\n${results.length-failed.length} of ${results.length} checks passed`);
process.exit(failed.length?1:0);
