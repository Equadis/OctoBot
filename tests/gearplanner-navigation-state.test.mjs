import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {consumeReload,markInternalReload,clearUi,loadUi,saveUi,sanitiseUi,INTERNAL_RELOAD_KEY} from '../docs/sim/ui-state.mjs';
import {plannerView,rememberPlannerView,rememberedPlannerView} from '../docs/sim/core/interface.mjs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const memory=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),get length(){return data.size},key:i=>[...data.keys()][i],_data:data};};
// Object.keys(storage) works for plain objects; wrap so the helper can enumerate.
const enumerable=()=>{const m=memory();return new Proxy(m,{ownKeys:()=>[...m._data.keys()],getOwnPropertyDescriptor:(t,k)=>m._data.has(k)?{enumerable:true,configurable:true,value:m._data.get(k)}:undefined});};

test('a real refresh is detected, but the planner\'s own history reload is not',()=>{
 const storage=memory();
 assert.equal(consumeReload(storage,'reload'),true);
 assert.equal(consumeReload(storage,'navigate'),false);
 assert.equal(consumeReload(storage,'back_forward'),false);
 markInternalReload(storage);
 assert.equal(consumeReload(storage,'reload'),false,'an internal reload is not a refresh');
 assert.equal(storage.getItem(INTERNAL_RELOAD_KEY),null,'the flag is single use');
 assert.equal(consumeReload(storage,'reload'),true);
});
test('the remembered view survives page moves in a tab and is empty in a new session',()=>{
 const tab=memory();
 assert.equal(plannerView('https://x.test/sim/',rememberedPlannerView(tab)),'classes','first visit');
 rememberPlannerView('rogue',tab);
 assert.equal(plannerView('https://x.test/sim/',rememberedPlannerView(tab)),'rogue','back from another page');
 assert.equal(plannerView('https://x.test/sim/?classes',rememberedPlannerView(tab)),'classes','All classes always wins');
 assert.equal(plannerView('https://x.test/sim/',rememberedPlannerView(memory())),'classes','new session');
});
test('view state is validated and cleared without touching anything else',()=>{
 const storage=enumerable();
 storage.setItem('octosim.planner.draft.rogue.v2','{"build":true}');
 saveUi(storage,'rogue',{slot:'chest',filters:{search:'x',sort:'bad',quality:'4',direction:'asc'},panels:{buffs:true},groups:{food:false},optionsOpen:true,collapsedStats:['Melee'],scrollY:420,itemScroll:90});
 const loaded=loadUi(storage,'rogue');
 assert.equal(loaded.slot,'chest');assert.equal(loaded.filters.direction,'asc');assert.equal(loaded.scrollY,420);assert.deepEqual(loaded.collapsedStats,['Melee']);assert.equal(loaded.groups.food,false);
 clearUi(storage);
 assert.equal(loadUi(storage,'rogue'),null);
 assert.equal(storage.getItem('octosim.planner.draft.rogue.v2'),'{"build":true}','saved builds are untouched');
 assert.equal(sanitiseUi({slot:'<script>',scrollY:-4,groups:{'bad key!':true}}).slot,null);
});
test('the planner wires refresh and navigation as specified, and never uses localStorage to skip the selector',()=>{
 const code=read('sim/planner.mjs');
 assert.match(code,/consumeReload\(tabStorage,performance\.getEntriesByType\?\.\('navigation'\)\?\.\[0\]\?\.type\)/);
 assert.match(code,/selectedView=reloaded&&!sharedLink\?'classes':plannerView\(location\.href,sessionView\)/);
 assert.match(code,/markInternalReload\(tabStorage\);\s*location\.reload\(\)/);
 assert.doesNotMatch(code,/rememberPlannerView\([^)]*localStorage\)|rememberedPlannerView\(localStorage\)/);
 assert.match(code,/addEventListener\('pagehide',saveUiState\)|addEventListener\('pagehide', saveUiState\)/);
});
test('class tiles are large, equal and artwork backed, and the gear columns share one height',()=>{
 const css=read('sim/combat-layout.css'),code=read('sim/planner.mjs');
 assert.match(css,/#class-selection \.class-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:18px\}/);
 assert.match(css,/\.class-card\.has-art\{[^}]*min-height:210px/);
 assert.match(code,/CLASS_ART = Object\.freeze\(\{ warrior: 0, paladin: 0, hunter: 0, rogue: 0, priest: 0, shaman: 0, mage: 1, warlock: 2, druid: 0 \}\)/);
 assert.match(css,/@media\(min-width:1200px\)\{[^}]*\.gear-workspace\{align-items:stretch\}[\s\S]*?contain:size/);
 assert.match(css,/\.character-summary #gear-stats\{flex:1 1 0;min-height:0;[^}]*overflow-y:auto/,'stats scroll inside the class panel');
 assert.match(css,/\.gear-preview\{overflow-y:auto/);
 assert.match(css,/#item-selector \.item-results\{background:#152030;[^}]*scrollbar-color:#66758c #1b293c/,'item list matches the Dressing Room');
 assert.match(css,/\.slot \.item-name\.ah-name-clip\{[^}]*white-space:nowrap/);
 assert.match(code,/item-name ah-name-clip/);
});
test('Dressing Room Reset all shares the navigation row',()=>{
 const html=read('outfitter/index.html');
 assert.match(html,/<div class="planner-topbar"><nav class="page-nav"[^>]*><\/nav><script[^>]*><\/script><div class="planner-actions-status"><button id="reset" class="reset-all">Reset all<\/button>/);
 assert.doesNotMatch(html,/<div class="toolbar">/);
});
