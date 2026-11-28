// Renders equipment loadouts in the real Dressing Room with the headless browser and saves one PNG per case, for looking at where items sit.
//
//   node tools/models/render_gear.mjs <server base url> <cases.json> <out folder> [--scale 2]
//
// cases.json is a list of {"name": "...", "race": 1, "gender": 0, "gear": {"16": 790, "17": 1168}, "ranged": false, "sheathed": false, "skin": "skin-50291"}. Gear keys are the Dressing Room slot ids (16 main hand,
// 17 off hand, 18 ranged, 1 head, 3 shoulder, 5 chest, 15 back ...); "ranged" switches the weapon display to the ranged weapon, as the Ranged button does. Files are <name>.png, the model panel
// at the given scale. The page reports which slots it applied, written beside the PNG as <name>.json, so a loadout that did not load shows up.
import fs from 'node:fs';
import path from 'node:path';
import {launch} from './cdp.mjs';

const args=process.argv.slice(2);
const scale=args.includes('--scale')?Number(args[args.indexOf('--scale')+1]):2;
const [base,casesPath,out]=args.filter((a,i)=>!a.startsWith('--')&&args[i-1]!=='--scale');
if(!out){console.error('usage: node tools/models/render_gear.mjs <server base url> <cases.json> <out folder> [--scale 2]');process.exit(2);}
fs.mkdirSync(out,{recursive:true});
const cases=JSON.parse(fs.readFileSync(casesPath,'utf8'));
const browser=await launch({width:900,height:1000,scale});
try {
  await browser.goto(`${base}/outfitter/?debug`);
  await browser.eval('localStorage.clear(); 1');
  await browser.waitFor('!!window.__outfitter&&!!window.__outfitter.actor()',90000);
  let n=0;
  for(const c of cases) {
    const outfit={version:1,race:c.race,gender:c.gender,gear:c.gear||{},hideHead:false,hideBack:false,look:{},...(c.skin?{skin:c.skin}:{})};
    await browser.eval(`location.hash=''; 1`);await browser.sleep(150);
    await browser.eval(`location.hash='outfit='+encodeURIComponent(${JSON.stringify(JSON.stringify(outfit))}); 1`);
    const want=Object.keys(c.gear||{}).filter(k=>Number(k)!==18).length;
    await browser.waitFor(`(()=>{const o=window.__outfitter;return !!o&&!!o.actor()&&o.outfit().race===${c.race}&&o.outfit().gender===${c.gender}&&document.getElementById('model-status').hidden&&o.applied().length>=${want>0?1:0}})()`,45000);
    // the weapon display is a view setting: wielded melee by default, the ranged weapon when asked
    await browser.eval(`document.getElementById(${JSON.stringify(c.ranged?'wt-ranged':'wt-melee')}).click(); 1`);
    await browser.eval(`document.getElementById(${JSON.stringify(c.sheathed?'wp-sheathed':'wp-wielded')}).click(); 1`);
    await browser.sleep(2600);
    const box=await browser.eval('(()=>{const r=document.querySelector(".model-wrap").getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height}})()');
    // views: the camera as azimuth (turns around the character; 1.5 pi is the default front view), optional zenith and zoom; the default is the front view only
    const views=c.views||[{name:''}];
    for(const v of views) {
      if(v.name!==''||views.length>1)await browser.eval(`(()=>{const r=window.__outfitter.viewer().renderer;${v.azimuth!==undefined?`r.azimuth=${v.azimuth};`:''}${v.zenith!==undefined?`r.zenith=${v.zenith};`:''}${v.zoom!==undefined?`r.zoom.current=${v.zoom};r.zoom.target=${v.zoom};`:''}})()`).then(()=>browser.sleep(700));
      fs.writeFileSync(path.join(out,`${c.name}${v.name?'__'+v.name:''}.png`),await browser.screenshot(box));
    }
    fs.writeFileSync(path.join(out,`${c.name}.json`),JSON.stringify({case:c,applied:await browser.eval('window.__outfitter.applied()')}));
    if(++n%10===0)console.log(`${n}/${cases.length}`);
  }
  console.log('failed requests:',browser.failedRequests.length,'script errors:',browser.consoleErrors.length);
} finally {await browser.close();}
