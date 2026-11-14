import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const BASE='https://equadis.github.io/OctoBot/';
const PAGES=['','status/','world-info/','sim/','outfitter/'];
const docs=new URL('../docs/',import.meta.url);
const markup=route=>readFileSync(new URL(route+'index.html',docs),'utf8');

test('every page links to the five canonical directory URLs',()=>{
 const expected=['','status/','world-info/','sim/','outfitter/'].map(p=>new URL(p,BASE).href);
 for(const route of PAGES){
  const nav=markup(route).match(/<nav class="page-nav"[\s\S]*?<\/nav>/)[0];
  const links=[...nav.matchAll(/href="([^"]*)"/g)].map(m=>new URL(m[1],new URL(route,BASE)));
  assert.deepEqual(links.map(u=>u.origin+u.pathname),expected,`navigation on /${route}`);
  assert.ok(!links.some(u=>u.pathname.endsWith('.html')),`no .html links on /${route}`);
 }
});

test('local scripts, styles and images on every page resolve to real files',()=>{
 for(const route of PAGES){
  const html=markup(route);
  for(const [,value] of html.matchAll(/\b(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)){
   if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value))continue;
   const url=new URL(value,new URL(route,BASE));
   const path=url.pathname.replace('/OctoBot/','');
   const file=new URL(path.endsWith('/')?path+'index.html':path,docs);
   assert.ok(existsSync(fileURLToPath(file)),`/${route} references missing ${value}`);
  }
 }
});

test('legacy .html URLs redirect to the new routes preserving query and fragment',()=>{
 for(const [file,target] of [['status.html','status/'],['world-info.html','world-info/']]){
  const html=readFileSync(new URL(file,docs),'utf8');
  assert.ok(html.includes(`location.replace('${target}'+location.search+location.hash)`));
  assert.ok(html.includes(`<link rel="canonical" href="${target}">`));
  assert.ok(existsSync(fileURLToPath(new URL(target+'index.html',docs))));
 }
});

test('data requests made by moved pages resolve from the new directory',()=>{
 const dashboard=readFileSync(new URL('status-dashboard.js',docs),'utf8')+readFileSync(new URL('status-archive.js',docs),'utf8');
 for(const path of ['../telemetry.json','../status/history.json','../status/latest.json','../status/bot-history.json'])assert.ok(dashboard.includes(`fetch('${path}'`),path);
 assert.ok(!/fetch\('status\//.test(dashboard));
});

test('every page has Discord and donate buttons with tooltips beside the viewer count, and no status badge',()=>{
 for(const route of PAGES){
  const html=markup(route);
  const header=html.match(/<div class="header-status">[\s\S]*?<\/header>/)[0];
  assert.ok(!/class="badge"/.test(html),`badge removed on /${route}`);
  assert.match(header,/href="https:\/\/discord\.gg\/QtdNpKnU72"[^>]*data-tip="Join the Discord"/);
  assert.match(header,/href="https:\/\/ko-fi\.com\/equadis"[^>]*data-tip="Buy me a coffee"/);
  assert.ok(header.indexOf('discord.gg')<header.indexOf('id="viewer-status"'),'buttons sit left of the viewer count');
  assert.ok(header.indexOf('ko-fi.com')<header.indexOf('id="viewer-status"'));
  assert.equal((header.match(/rel="noopener noreferrer"/g)||[]).length,2);
 }
 for(const icon of ['img/discord.png','img/coffee.png'])assert.ok(existsSync(fileURLToPath(new URL(icon,docs))),icon);
});
