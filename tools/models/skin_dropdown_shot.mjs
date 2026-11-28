// Screenshot of the Appearance panel with the Skin dropdown open, for looking at the layout.
//   node tools/models/skin_dropdown_shot.mjs <skins overlay> <model overlay> <out.png> [race gender]
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from './cdp.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const [skins,models,out,race='1',gender='0']=process.argv.slice(2);
if(!out){console.error('usage: node tools/models/skin_dropdown_shot.mjs <skins overlay> <model overlay> <out.png> [race gender]');process.exit(2);}
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});
const server=spawn('node',[path.join(here,'e2e_server.mjs'),[skins,models].join(','),String(port)],{stdio:'ignore'});
for(let i=0;i<50;i++) {try {if((await fetch(`http://127.0.0.1:${port}/api/outfitter/models-version`)).ok)break;} catch {}await new Promise(r=>setTimeout(r,200));}
const browser=await launch({width:Number(process.env.SHOT_WIDTH||1280),height:2000});
try {
  await browser.goto(`http://127.0.0.1:${port}/outfitter/?debug`);
  const hash='#outfit='+encodeURIComponent(JSON.stringify({version:1,race:Number(race),gender:Number(gender),gear:{},hideHead:false,hideBack:false,look:{}}));
  await browser.eval(`localStorage.clear(); location.hash=${JSON.stringify(hash)}; location.reload(); 1`);
  await browser.waitFor('!!window.__outfitter&&!!window.__outfitter.actor()&&document.getElementById("model-status").hidden&&!!document.getElementById("skin-main")',60000);
  await browser.sleep(1500);
  await browser.eval('document.getElementById("skin-main").click()');await browser.sleep(400);
  const box=await browser.eval('(()=>{const p=document.querySelector(".look-panel").getBoundingClientRect();return {x:Math.max(0,p.left-8),y:Math.max(0,p.top-8),width:Math.min(p.width+16,innerWidth),height:Math.min(p.height+330,document.documentElement.scrollHeight-p.top)}})()');
  fs.writeFileSync(out,await browser.screenshot(box));
  console.log('wrote',out);
} finally {await browser.close();server.kill();}
