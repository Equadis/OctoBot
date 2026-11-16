import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const BASE='https://equadis.github.io/OctoBot/';
const PAGES=['population/','status/','world-info/','sim/','auction-house/','outfitter/'];
const docs=new URL('../docs/',import.meta.url);
const markup=route=>readFileSync(new URL(route+'index.html',docs),'utf8');

test('every page links to the six canonical directory URLs',()=>{
 const expected=['population/','status/','world-info/','sim/','auction-house/','outfitter/'].map(p=>new URL(p,BASE).href);
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

test('titles use the Friz Quadrata stack on every page, with sub-headings left alone',()=>{
 const css=readFileSync(new URL('site-theme.css',docs),'utf8');
 assert.match(css,/--title-font:"OctoBot Title","Friz Quadrata TT","Friz Quadrata"/);
 assert.match(css,/local\("Friz Quadrata TT"\)/);
 assert.ok(!/url\([^)]*\.(?:ttf|otf|woff2?)/i.test(css.slice(css.indexOf('@font-face'))),'the commercial font file is not bundled');
 assert.match(css,/body h1,body h2,body \.site-header h1,body\.planner-view \.site-header h1,\r?\nbody \.section-title h2,body \.panel-head h3,body \.world-panel h2,body \.world-panel h3,body \.look-heading h3\{font-family:var\(--title-font\);font-weight:700\}/);
 assert.match(css,/font-weight:700;src:local\("Friz Quadrata TT Bold"\)/); // bold face
 for(const route of PAGES)assert.match(markup(route),/site-theme\.css\?v=20261116-hdr1/,`/${route}`);
});

test('the home page links to every tool with a large button and sends old Population links to /population/',()=>{
 const home=readFileSync(new URL('index.html',docs),'utf8');
 assert.match(home,/Welcome to OctoBot/);
 const cards=[...home.matchAll(/<a class="home-card" href="([^"]*)"/g)].map(m=>new URL(m[1],BASE).href);
 assert.deepEqual(cards,['population/#server=all','status/','world-info/','sim/','auction-house/','outfitter/'].map(p=>new URL(p,BASE).href));
 assert.match(home,/not the official OctoWoW website/);
 // links that predate the home page (the Discord bot posts /#server=...) are forwarded with their query and fragment
 assert.ok(home.includes("if(/^#server=/.test(location.hash))location.replace('population/'+location.search+location.hash);"));
 for(const [,value] of home.matchAll(/\b(?:href|src)="([^"#]+)"/g)){
  if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value))continue;
  const path=new URL(value,BASE).pathname.replace('/OctoBot/','');
  assert.ok(existsSync(fileURLToPath(new URL(path.endsWith('/')?path+'index.html':path,docs))),`home references missing ${value}`);
 }
});

test('the OctoBot logo links home from every tool page',()=>{
 for(const route of PAGES){
  const html=markup(route);
  const link=html.match(/<a class="site-home" href="([^"]*)"[^>]*><img class="site-logo"/);
  assert.ok(link,`logo link on /${route}`);
  assert.equal(new URL(link[1],new URL(route,BASE)).href,BASE);
 }
});

test('header icon URLs are resolved against the page, so they also work under /OctoBot/ on GitHub Pages',()=>{
 // A url() stored in a CSS custom property resolves against the stylesheet, which pointed at the wrong folder.
 const css=readFileSync(new URL('site-theme.css',docs),'utf8');
 assert.ok(!css.includes('var(--icon)'));
 for(const route of ['',...PAGES]){
  const html=markup(route);
  assert.ok(!html.includes('--icon:url('),`/${route}`);
  const masks=[...html.matchAll(/style="-webkit-mask:url\(([^)]*)\) center\/contain no-repeat;mask:url\(\1\) center\/contain no-repeat"/g)].map(m=>m[1]);
  assert.equal(masks.length,2,`/${route}`);
  for(const mask of masks){
   const path=new URL(mask,new URL(route,BASE)).pathname.replace('/OctoBot/','');
   assert.ok(existsSync(fileURLToPath(new URL(path.split('?')[0],docs))),`${mask} exists`);
  }
 }
});

test('every page loads the shared tooltip script, and no page styles its own native title tooltips',()=>{
 for(const route of PAGES)assert.match(markup(route),/<script src="(?:\.\.\/)?site-tooltips\.js\?v=[0-9a-z-]+" defer><\/script>/,`/${route}`);
 const script=readFileSync(new URL('../docs/site-tooltips.js',import.meta.url),'utf8');
 assert.match(script,/closest\('\.info-i, \[data-native-title\]'\)/);   // information circles keep their own hover
});
