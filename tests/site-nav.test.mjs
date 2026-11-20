import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const BASE='https://equadis.github.io/OctoBot/';
const ROUTES=['population','status','sim','outfitter','world-info','auction-house','world-chat'];
const docs=new URL('../docs/',import.meta.url);
const page=route=>readFileSync(new URL(route+'/index.html',docs),'utf8');
const source=readFileSync(new URL('site-nav.js',docs),'utf8');

// A tiny DOM: just enough for the renderer, so the real shipped script is what gets tested.
function el(tag){return {tag,children:[],attrs:{},className:'',textContent:'',
  setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},
  appendChild(c){this.children.push(c);c.parent=this;return c;},
  get firstChild(){return this.children[0]??null;},removeChild(c){this.children.splice(this.children.indexOf(c),1);return c;},
  get ownerDocument(){return {createElement:el};}};}
const {render,GROUPS}=(()=>{const module={exports:{}};vm.runInNewContext(source,{module,window:undefined,document:undefined},{filename:'site-nav.js'});return module.exports;})();
function rendered(route,base){
  const nav=el('nav');nav.attrs['data-current']=route;render(nav,base);
  return nav.children.map(g=>({label:g.attrs['aria-label'],links:g.children.map(a=>({text:a.textContent,href:a.attrs.href,current:a.attrs['aria-current']==='page'}))}));
}

test('navigation shows every tool in order with BETA badges only on character tools',()=>{
  const groups=rendered('sim','');
  assert.deepEqual(groups.map(g=>g.links.map(l=>l.text)),[
    ['Population','Server Status'],
    ['Gear Planner','Dressing Room'],
    ['World Info','Auction House','World Chat']]);
  assert.equal(GROUPS.length,3);
  const nav=el('nav');
  render(nav,'../');
  const badged=nav.children.flatMap(group=>group.children).filter(link=>link.children.length);
  assert.deepEqual(badged.map(link=>link.textContent),['Gear Planner','Dressing Room']);
  assert.ok(badged.every(link=>link.children.length===1 && link.children[0].textContent==='BETA'));
});

test('Auction House is disabled in the navigation and on the home page',()=>{
  const nav=el('nav');
  nav.attrs['data-current']='auction-house';
  render(nav,'../');
  const auction=nav.children.flatMap(group=>group.children).find(link=>link.textContent==='Auction House');
  assert.equal(auction.getAttribute('href'),null);
  assert.equal(auction.getAttribute('aria-disabled'),'true');
  const home=readFileSync(new URL('index.html',docs),'utf8');
  assert.doesNotMatch(home,/>\s*(?:BETA|ALPHA)\s*</);
  assert.match(home,/home-card-disabled" role="link" aria-disabled="true"/);
});

test('every page uses the shared script, names itself, and highlights only its own link',()=>{
  for(const route of ROUTES){
    const html=page(route);
    assert.match(html,new RegExp(`<nav class="page-nav" aria-label="Dashboard pages" data-current="${route}"></nav><script src="../site-nav.js`),route);
    assert.ok(!/<nav class="page-nav"[^>]*>\s*<a/.test(html),`no hand-written duplicate links on /${route}/`);
    const current=rendered(route,'../').flatMap(g=>g.links).filter(l=>l.current);
    assert.equal(current.length,1,route);
  }
});

test('enabled links resolve to the canonical directory URLs from every page',()=>{
  const expected=['population/','status/','sim/','outfitter/','world-info/','world-chat/'].map(p=>new URL(p,BASE).href);
  for(const route of ROUTES){
    const urls=rendered(route,'../').flatMap(g=>g.links).filter(l=>l.href).map(l=>{const u=new URL(l.href,new URL(route+'/',BASE));return u.origin+u.pathname;});
    assert.deepEqual(urls,expected,route);
  }
});

test('separators are thin borders between groups only, matching the header rule',()=>{
  const css=readFileSync(new URL('site-theme.css',docs),'utf8');
  assert.match(css,/\.nav-group\+\.nav-group\{[^}]*border-left:1px solid var\(--line\)/);
  assert.match(css,/site-header\{[^}]*border-bottom:1px solid var\(--line\)/);   // same colour token as the line under the header
  assert.doesNotMatch(css,/\.nav-group a\+a/);                                     // none between links within a group
  assert.match(css,/@media\(max-width:1000px\)\{[^@]*border-top:1px solid var\(--line\)/); // horizontal rule when stacked on narrow screens
});

test('the home page keeps direct access to the available tools',()=>{
  const html=readFileSync(new URL('index.html',docs),'utf8');
  const hrefs=[...html.matchAll(/class="home-card" href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(hrefs,['population/#server=all','status/','sim/','outfitter/','world-info/','world-chat/']);
});

test('tab size is pinned in the shared theme so pages that restyle .page-nav a cannot make tabs taller or thinner',()=>{
  const css=readFileSync(new URL('site-theme.css',docs),'utf8');
  assert.match(css,/\.page-nav \.nav-group a\{[^}]*height:38px[^}]*padding:0 13px[^}]*font-size:12px/);
});

test('the header box model is fixed in the shared theme, so every tab has the same header height',()=>{
  const css=readFileSync(new URL('site-theme.css',docs),'utf8');
  assert.match(css,/\.site-header,\.planner-view \.site-header\{box-sizing:border-box\}/);
  assert.match(css,/min-height:74px/);
});

test('the disabled Auction House page cannot load its polling scripts',()=>{
  const html=page('auction-house');
  assert.match(html,/<main class="ah-maintenance-background" inert>/);
  assert.match(html,/<\/main>\s*<div class="ah-maintenance-notice"><h1>CURRENTLY DISABLED\.<\/h1>/);
  assert.doesNotMatch(html,/<script[^>]+(?:auction\.js|viewer-presence\.js)/);
});
