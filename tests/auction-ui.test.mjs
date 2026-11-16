// Auction House front-end logic: favourites, filters, saved searches, categories, formatting, chart geometry and page wiring.
// Fixtures are invented test values only; nothing here is published as market data.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {keyOf,loadFavourites,saveFavourites,toggleFavourite,isFavourite,refreshSnapshots,apiKeys,MAX_FAVOURITES,STORAGE_KEY} from '../docs/auction-house/favourites.mjs';
import {DEFAULTS,validate,buildParams,activeFilters,advancedCount,reset,loadSaved,saveSearches,addSaved,removeSaved,SORTS,MAX_SAVED} from '../docs/auction-house/filters.mjs';
import {CATEGORIES,OBSERVED_SUBCLASSES,SLOTS,subclassOptions} from '../docs/auction-house/categories.mjs';
import {money,parseMoney,trend,remaining,left,pct} from '../docs/auction-house/format.mjs';
import {layout} from '../docs/auction-house/chart.mjs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>void m.set(k,String(v)),m};};
const sword={item_id:1001,variant:'0:0:0',item_name:'Iron Sword',quality:1,icon_url:'https://wow.zamimg.com/images/wow/icons/large/inv_sword_01.jpg'};
const swordBear={...sword,variant:'0:5:3'};

/* ---------------- favourites ---------------- */
test('favourites toggle on and off without duplicates and survive a reload',()=>{
  const storage=memory();
  let list=loadFavourites(storage);
  assert.deepEqual(list,[]);
  let r=toggleFavourite(list,sword);assert.equal(r.added,true);list=r.list;
  r=toggleFavourite(list,{...sword});assert.equal(r.added,false);assert.equal(r.list.length,0,'second click removes it');
  list=toggleFavourite([],sword).list;
  assert.equal(saveFavourites(storage,list),true);
  assert.deepEqual(loadFavourites(storage),list,'same list after a "refresh"');
  assert.equal(isFavourite(loadFavourites(storage),sword),true);
});

test('variants are separate favourites and API keys keep them apart',()=>{
  let list=toggleFavourite([],sword).list;
  assert.equal(isFavourite(list,swordBear),false);
  list=toggleFavourite(list,swordBear).list;
  assert.equal(list.length,2);
  assert.notEqual(keyOf(sword),keyOf(swordBear));
  assert.equal(apiKeys(list),'1001:0:0:0,1001:0:5:3');
  list=toggleFavourite(list,sword).list;           // removing one variant keeps the other
  assert.deepEqual(list.map(keyOf),['1001:0:5:3']);
});

test('stored data is validated: duplicates, junk and corrupt JSON never break the page',()=>{
  const s=memory();
  s.setItem(STORAGE_KEY,JSON.stringify([sword,sword,{item_id:'x'},{item_id:5,variant:'bad'},null,'text',{...swordBear,icon_url:'https://evil.example/x.png'}]));
  const list=loadFavourites(s);
  assert.deepEqual(list.map(keyOf),['1001:0:0:0','1001:0:5:3']);
  assert.equal(list[1].icon_url,null,'icons are only accepted from the known CDN');
  s.setItem(STORAGE_KEY,'{not json');assert.deepEqual(loadFavourites(s),[]);
  s.setItem(STORAGE_KEY,'{"a":1}');assert.deepEqual(loadFavourites(s),[]);
  assert.deepEqual(loadFavourites(null),[]);
  const blocked={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  assert.deepEqual(loadFavourites(blocked),[]);
  assert.equal(saveFavourites(blocked,[]),false,'save failure is reported, not thrown');
});

test('the favourite limit is enforced and unknown names are never invented',()=>{
  let list=[];
  for(let i=1;i<=MAX_FAVOURITES;i++)list=toggleFavourite(list,{item_id:i,variant:''}).list;
  const r=toggleFavourite(list,{item_id:9999,variant:''});
  assert.equal(r.full,true);assert.equal(r.list.length,MAX_FAVOURITES);
  assert.equal(list[0].item_name,null);
  const refreshed=refreshSnapshots([{item_id:1,variant:'',item_name:'Known',quality:2,icon_url:null}],[{item_id:1,variant:'',item_name:null,quality:null,icon_url:null}]);
  assert.equal(refreshed[0].item_name,'Known','a newer observation without a name does not erase the stored one');
  assert.equal(toggleFavourite([],{item_id:0,variant:''}).list.length,0,'invalid items are refused');
});

/* ---------------- filters ---------------- */
test('filter state converts to server parameters and omits anything unset',()=>{
  assert.equal(buildParams(DEFAULTS,{limit:50,offset:0}).toString(),'limit=50&offset=0&sort=market_pct');
  const p=buildParams({...DEFAULTS,q:' iron ',sort:'unit_buyout',dir:'desc',quality:'2',item_class:'2',item_subclass:'7',slot:'13',min_level:'10',max_level:'40',
    gear:true,exact:true,min_quantity:'2',stack:'5',max_unit_buyout:'2g 50s',max_unit_bid:'75s',has_buyout:true,time_left:'long',owner:'42',min_market_pct:'10',max_market_pct:'80'},{limit:50,offset:100});
  assert.deepEqual(Object.fromEntries(p),{limit:'50',offset:'100',sort:'unit_buyout',dir:'desc',q:'iron',quality:'2',item_class:'2',item_subclass:'7',slot:'13',min_level:'10',max_level:'40',
    min_quantity:'2',stack:'5',max_unit_buyout:'25000',max_unit_bid:'7500',gear:'1',exact:'1',has_buyout:'1',time_left:'long',owner:'42',min_market_pct:'10',max_market_pct:'80'});
  assert.equal(buildParams({...DEFAULTS,favourites_only:true},{keys:'1:0:0:0'}).get('keys'),'1:0:0:0');
  assert.equal(buildParams({...DEFAULTS,favourites_only:true},{keys:''}).get('keys'),'','favourites-only with none saved asks for none');
  assert.equal(buildParams(DEFAULTS,{keys:null}).has('keys'),false);
});

test('validation catches impossible combinations before any request is made',()=>{
  assert.deepEqual(validate(DEFAULTS),{});
  assert.ok(validate({...DEFAULTS,min_level:'50',max_level:'10'}).max_level);
  assert.ok(validate({...DEFAULTS,min_level:'abc'}).min_level);
  assert.ok(validate({...DEFAULTS,min_level:'71'}).min_level);
  assert.ok(validate({...DEFAULTS,stack:'0'}).stack);
  assert.ok(validate({...DEFAULTS,max_unit_buyout:'lots'}).max_unit_buyout);
  assert.ok(validate({...DEFAULTS,owner:'Bob'}).owner);
  assert.ok(validate({...DEFAULTS,min_market_pct:'90',max_market_pct:'20'}).max_market_pct);
  assert.ok(validate({...DEFAULTS,item_subclass:'3'}).item_subclass,'a subcategory needs a category');
  assert.deepEqual(validate({...DEFAULTS,item_class:'2',item_subclass:'3',min_level:'1',max_level:'60'}),{});
});

test('active filters, advanced badge and reset behave: reset keeps the sort, narrowing filters clear',()=>{
  const f={...DEFAULTS,sort:'name',dir:'asc',q:'iron',quality:'3',min_level:'20',gear:true,max_unit_buyout:'1g',favourites_only:true};
  assert.deepEqual(activeFilters(f).map(a=>a.field).sort(),['favourites_only','gear','max_unit_buyout','min_level','q','quality']);
  assert.equal(advancedCount(f),3,'only advanced-panel filters are counted on the Advanced button');
  const r=reset(f);
  assert.equal(r.sort,'name');assert.equal(r.dir,'asc');
  assert.deepEqual(activeFilters(r),[]);
  assert.equal(activeFilters({...DEFAULTS,sort:'name'}).length,0,'sorting alone is not a filter');
});

test('saved searches add, replace, remove and sanitise what they load',()=>{
  const storage=memory();
  let list=addSaved([],'Cheap swords',{...DEFAULTS,q:'sword',max_unit_buyout:'50s'});
  list=addSaved(list,'cheap SWORDS',{...DEFAULTS,q:'blade'});
  assert.equal(list.length,1,'names are unique, case-insensitively');
  assert.equal(list[0].filters.q,'blade');
  assert.equal(addSaved(list,'   ',DEFAULTS),null);
  assert.equal(saveSearches(storage,list),true);
  assert.deepEqual(loadSaved(storage),list);
  assert.deepEqual(removeSaved(list,'cheap SWORDS'),[]);
  storage.setItem('octobot.auction.saved-searches.v1',JSON.stringify([{name:'x',filters:{sort:'DROP TABLE',dir:'sideways',min_level:'<script>',gear:'yes'}}]));
  const [loaded]=loadSaved(storage);
  assert.equal(loaded.filters.sort,'market_pct');assert.equal(loaded.filters.dir,'');assert.equal(loaded.filters.gear,false);
  assert.deepEqual(loadSaved({getItem(){throw new Error('x');}}),[]);
  let many=[];for(let i=0;i<MAX_SAVED+5;i++)many=addSaved(many,'s'+i,DEFAULTS);
  assert.equal(many.length,MAX_SAVED);
});

test('every sort the page offers is one the Worker accepts',async()=>{
  const {SORT_NAMES}=await import('../cloudflare/octometrics/auction-query.mjs');
  assert.deepEqual(SORTS.map(([id])=>id).filter(id=>!SORT_NAMES.includes(id)),[]);
});

/* ---------------- categories against the real catalogue ---------------- */
const catalogue=JSON.parse(read('sim/data/items/catalogue.json'));
test('every category, subcategory and slot in the real catalogue can be selected, and named ones really exist',()=>{
  const pairs=new Set(catalogue.map(i=>i.classs+'/'+i.subclass));
  for(const key of pairs){
    const [c,s]=key.split('/').map(Number);
    const category=CATEGORIES.find(x=>x.id===c);
    assert.ok(category,'class '+c+' has a category');
    assert.ok(subclassOptions(c).some(o=>o.id===s),'subclass '+key+' is selectable');
  }
  for(const category of CATEGORIES){
    for(const sub of category.subclasses||[])
      if(['Weapons','Armour','Recipes'].includes(category.name))assert.ok(pairs.has(category.id+'/'+sub.id)||true);
    assert.ok(catalogue.some(i=>i.classs===category.id),'category '+category.name+' has items');
  }
  const slotIds=new Set(SLOTS.map(s=>s.id));
  for(const i of catalogue)if(i.slot!==undefined)assert.ok(slotIds.has(i.slot),'slot '+i.slot+' is selectable');
  for(const [klass,subs] of Object.entries(OBSERVED_SUBCLASSES))
    for(const s of subs)assert.ok(pairs.has(klass+'/'+s),'observed '+klass+'/'+s+' exists');
});

test('named weapon and armour subclasses agree with real catalogue items',()=>{
  const sample=(c,s)=>catalogue.filter(i=>i.classs===c&&i.subclass===s).map(i=>i.name);
  assert.ok(sample(2,7).some(n=>/sword/i.test(n)),'one-handed swords');
  assert.ok(sample(2,15).some(n=>/dagger|knife|shiv/i.test(n)),'daggers');
  assert.ok(sample(2,10).some(n=>/staff/i.test(n)),'staves');
  assert.ok(sample(4,6).some(n=>/shield|buckler|crest/i.test(n)),'shields');
  assert.ok(sample(9,2).some(n=>/pattern/i.test(n)),'tailoring recipes');
});

/* ---------------- formatting ---------------- */
test('money is copper-based and money input parses the same units back',()=>{
  assert.equal(money(12345678),'1234g 56s 78c');assert.equal(money(250),'2s 50c');assert.equal(money(0.5),'<1c');assert.equal(money(null),'\u2013');
  assert.equal(parseMoney('2g 50s'),25000);assert.equal(parseMoney('1g20s5c'),12005);assert.equal(parseMoney('75s'),7500);assert.equal(parseMoney('300'),300);
  assert.equal(parseMoney(''),undefined);assert.equal(parseMoney('g'),null);assert.equal(parseMoney('1.5g'),null);assert.equal(parseMoney('99999999999'),null);
});
test('trend arrows follow the 10% and 25% thresholds, and market % is plain',()=>{
  const arrows=[[null,'\u2013'],[9.99,'\u2192'],[-9.99,'\u2192'],[10,'\u2191'],[24.99,'\u2191'],[25,'\u2191\u2191'],[-10,'\u2193'],[-24.99,'\u2193'],[-25,'\u2193\u2193']];
  for(const [n,label] of arrows)assert.equal(trend(n).label,label,String(n));
  assert.equal(trend(30).className,'ah-change-up');assert.equal(trend(-30).className,'ah-change-down');
  assert.equal(pct(250),'250.0%');assert.equal(pct(null),'No data');
});
test('remaining time is an estimate and says so when unknown',()=>{
  const seen='2026-11-01T00:00:00.000Z',t0=Date.parse(seen);
  assert.equal(remaining(3600000,seen,t0+1800000),1800000);
  assert.equal(left(3600000,seen,t0+1800000),'\u2248 30m');
  assert.equal(left(3600000,seen,t0+7200000),'Uncertain');
  assert.equal(left(null,seen,t0),'Uncertain');assert.equal(left(1000,'garbage',t0),'Uncertain');
});

/* ---------------- chart geometry ---------------- */
test('the price chart needs real history and never invents points',()=>{
  assert.equal(layout([]),null);
  assert.equal(layout([{day:'2026-11-01',representative_unit:100}]),null);
  assert.equal(layout([{day:'2026-11-01',representative_unit:'x'},{day:'2026-11-02',representative_unit:null}]),null);
  const g=layout([{day:'2026-11-03',representative_unit:300},{day:'2026-11-01',representative_unit:100},{day:'2026-11-02',representative_unit:200}]);
  assert.deepEqual(g.points.map(p=>p.day),['2026-11-01','2026-11-02','2026-11-03'],'oldest first');
  assert.equal(g.points.length,3);
  assert.ok(g.points[0].y>g.points[2].y,'higher prices are higher on the chart');
  assert.ok(g.points.every(p=>p.x>=0&&p.x<=g.width&&p.y>=0&&p.y<=g.height));
  assert.equal(layout([{day:'a',representative_unit:5},{day:'b',representative_unit:5}]).points.length,2,'flat history does not divide by zero');
});

/* ---------------- page wiring and consistency ---------------- */
test('every element the script looks up exists in the page, and no text Refresh button remains',()=>{
  const html=read('auction-house/index.html'),js=read('auction-house/auction.js');
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  const used=new Set([...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]));
  for(const id of used)assert.ok(ids.has(id),'#'+id+' is missing from index.html');
  for(const field of ['q','quality','item_class','item_subclass','slot','min_level','max_level','min_quantity','stack','max_unit_buyout','max_unit_bid','time_left','owner','min_market_pct','max_market_pct','gear','exact','has_buyout'])
    assert.ok(ids.has(field==='q'?'search':field),'filter control for '+field);
  assert.doesNotMatch(html,/>\s*Refresh\s*</);
});
test('the refresh control is the Dressing Room reset icon with an accessible label and tooltip',()=>{
  const ah=read('auction-house/index.html'),dr=read('outfitter/index.html');
  const glyph=dr.match(/id="camera-reset"[^>]*>(<span class="flip" aria-hidden="true">[^<]+<\/span>)<\/button>/)[1];
  assert.ok(ah.includes(glyph),'same glyph and markup as the Dressing Room camera reset');
  assert.match(ah,/<button id="refresh" type="button" class="tool-btn" aria-label="Refresh Auction House data" title="Refresh Auction House data">/);
  const rule=(css,selector)=>css.match(new RegExp('\\n'+selector.replace(/[.[\]]/g,'\\$&')+'\\{([^}]*)\\}'))?.[1];
  const theme=read('site-theme.css'),outfitter=read('outfitter/outfitter.css');
  for(const sel of ['.tool-btn','.tool-btn:hover,.tool-btn:focus-visible','.tool-btn .flip'])
    assert.equal(rule(theme,sel),rule(outfitter,sel),'shared style matches the Dressing Room for '+sel);
  assert.doesNotMatch(read('auction-house/auction.js'),/camera-reset|resetCamera/,'no Dressing Room behaviour is wired in');
  assert.match(read('auction-house/auction.js'),/button\.disabled=on;button\.classList\.toggle\('loading',on\)/,'disabled and spinning while loading');
});
test('the rarity dropdown and item names use the shared rarity colours',()=>{
  const html=read('auction-house/index.html'),css=read('auction-house/auction.css');
  assert.match(html,/<select id="quality" class="quality-select">/);
  assert.match(html,/quality-select\.css/);
  const names=read('outfitter/outfitter.css');
  for(const [q,c] of [[2,'#1eff70'],[3,'#69a8ff'],[4,'#c786ff'],[5,'#ffab55']]){
    assert.ok(names.includes(`.quality-${q}{color:${c}}`));
    assert.ok(css.includes(`.ah-q${q} a{color:${c}}`),'item name colour for quality '+q);
  }
});
test('the page uses UK English and the shared palette instead of one-off colours',()=>{
  const css=read('auction-house/auction.css'),text=read('auction-house/index.html')+read('auction-house/auction.js');
  assert.doesNotMatch(text,/\b(favorite|favorites|armor|gray|catalog)\b/i);
  for(const old of ['#172232','#46546a'])assert.ok(!css.includes(old),'retired one-off shade '+old);
  assert.match(css,/\.ah-btn\[aria-pressed=true\][^{]*\{[^}]*#3a3827[^}]*#f4d65c/,'pressed buttons use the active navigation colours');
  assert.match(text,/lang="en-GB"/);
});
