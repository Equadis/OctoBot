import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const BASE='https://equadis.github.io/OctoBot/';
const ROUTES=['population','status','sim','outfitter','world-info','auction-house'];
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

test('navigation has exactly three groups in the required order',()=>{
  const groups=rendered('sim','');
  assert.deepEqual(groups.map(g=>g.links.map(l=>l.text)),[
    ['Population','Server Status'],
    ['Gear Planner','Dressing Room'],
    ['World Info','Auction House']]);
  assert.equal(GROUPS.length,3);
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

test('links resolve to the six canonical directory URLs from every page, in the same order',()=>{
  const expected=['population/','status/','sim/','outfitter/','world-info/','auction-house/'].map(p=>new URL(p,BASE).href);
  for(const route of ROUTES){
    const urls=rendered(route,'../').flatMap(g=>g.links).map(l=>{const u=new URL(l.href,new URL(route+'/',BASE));return u.origin+u.pathname;});
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

test('the home page lists the tools in the same order as the navigation',()=>{
  const html=readFileSync(new URL('index.html',docs),'utf8');
  const hrefs=[...html.matchAll(/class="home-card" href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(hrefs,['population/#server=all','status/','sim/','outfitter/','world-info/','auction-house/']);
});

test('tab size is pinned in the shared theme so pages that restyle .page-nav a cannot make tabs taller or thinner',()=>{
  const css=readFileSync(new URL('site-theme.css',docs),'utf8');
  assert.match(css,/\.page-nav \.nav-group a\{[^}]*height:38px[^}]*padding:0 13px[^}]*font-size:12px/);
});

test('no tab carries a WIP marker, and the World Info tab drops N\'Zoth while its page title keeps it',()=>{
  const labels=rendered('sim','').flatMap(g=>g.links.map(l=>l.text));
  assert.ok(labels.includes('Dressing Room')&&labels.includes('Gear Planner'));
  assert.ok(!labels.some(l=>/(Dressing Room|Gear Planner).*WIP/.test(l)));
  assert.ok(page('outfitter').includes('<title>OctoBot · Dressing Room</title>')&&page('outfitter').includes('<h1>Dressing Room</h1>'));
  assert.ok(page('sim').includes('<title>OctoBot · Gear Planner &amp; DPS Simulator</title>')&&page('sim').includes('<h1>Gear Planner &amp; DPS Simulator</h1>'));
  const home=readFileSync(new URL('index.html',docs),'utf8');
  assert.doesNotMatch(home,/Dressing Room <em>WIP<\/em>/);
  assert.doesNotMatch(home,/Gear ?Planner[^<]*<em>WIP<\/em>/);
  assert.doesNotMatch(home,/Auction House <em>WIP<\/em>/);
  const labels2=rendered('sim','').flatMap(g=>g.links.map(l=>l.text));
  assert.deepEqual(labels2.filter(l=>/WIP/.test(l)),[]);
  assert.ok(labels2.includes('World Info')&&!labels2.some(l=>/N'Zoth/.test(l)));
  assert.ok(page('world-info').includes('<h1>World Info – N&#39;Zoth</h1>')||page('world-info').includes("<h1>World Info – N'Zoth</h1>"),'the page heading keeps N\'Zoth');
  assert.match(page('world-info'),/<title>OctoBot · World Info – N(?:'|&#39;)Zoth<\/title>/);
});

test('the header box model is fixed in the shared theme, so every tab has the same header height',()=>{
  const css=readFileSync(new URL('site-theme.css',docs),'utf8');
  assert.match(css,/\.site-header,\.planner-view \.site-header\{box-sizing:border-box\}/);
  assert.match(css,/min-height:74px/);
});
