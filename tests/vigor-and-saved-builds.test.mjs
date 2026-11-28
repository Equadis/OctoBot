import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {maxEnergy,vigorEnergy,clampEnergy,reconcileStartingEnergy,initialEnergy,addEnergy,spendEnergy,energyTick,ENERGY_TICK} from '../docs/sim/core/resources.mjs';
import {validateClassOptions,defaultClassOptions} from '../docs/sim/core/class-options.mjs';
import {newBuild,validateBuild} from '../docs/sim/core/builds.mjs';
import {setPendingBuild,takePendingBuild,PENDING_BUILD_KEY} from '../docs/sim/ui-state.mjs';
import {wireDialogs} from '../docs/dialogs.mjs';
import {SECONDARY_SKILLS} from '../docs/sim/core/classes.mjs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const rogue=JSON.parse(read('sim/data/talents/rogue.json'));
const vigor=rogue.talents.find(talent=>talent.name==='Vigor');
const memory=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};

test('Vigor sets maximum energy from the OctoWoW talent data: 100, 105, 110',()=>{
 assert.deepEqual(vigor.rankParameters[0],[5,10],'the data lists +5 then +10 maximum energy');
 assert.equal(maxEnergy('rogue',rogue,{}),100);
 assert.equal(maxEnergy('rogue',rogue,{[vigor.id]:0}),100);
 assert.equal(maxEnergy('rogue',rogue,{[vigor.id]:1}),105);
 assert.equal(maxEnergy('rogue',rogue,{[vigor.id]:2}),110);
 assert.equal(maxEnergy('rogue',rogue,{[vigor.id]:9}),110,'ranks beyond the talent maximum do not add more');
 assert.equal(vigorEnergy(rogue,{[vigor.id]:1}),5);
 assert.equal(maxEnergy('warrior',rogue,{[vigor.id]:2}),0,'classes without energy have none');
 assert.equal(maxEnergy('druid',rogue,{[vigor.id]:2}),100,'Vigor is a rogue talent');
});
test('Starting Energy follows the cap: full stays full, lower values are kept, nothing exceeds the cap',()=>{
 assert.equal(reconcileStartingEnergy(100,100,105),105,'full stays full when the cap rises');
 assert.equal(reconcileStartingEnergy(105,105,110),110);
 assert.equal(reconcileStartingEnergy(60,100,110),60,'a deliberately lower start is preserved');
 assert.equal(reconcileStartingEnergy(110,110,100),100,'clamped when Vigor is removed');
 assert.equal(reconcileStartingEnergy(70,110,100),70);
 assert.equal(clampEnergy(150,110),110);assert.equal(clampEnergy(-5,110),0);
 assert.equal(initialEnergy({startingEnergy:110},105),105);
 let cap=100,start=100;
 for(const next of [105,110,105,100,110]){start=reconcileStartingEnergy(start,cap,next);cap=next;assert.equal(start,cap,'full start tracks the cap through '+next);}
 start=40;cap=110;for(const next of [100,105,110]){start=reconcileStartingEnergy(start,cap,next);cap=next;}
 assert.equal(start,40);
});
test('Energy gains stop at the cap and report the waste; spending cannot go negative',()=>{
 assert.deepEqual(addEnergy(95,20,100),{value:100,wasted:15});
 assert.deepEqual(addEnergy(95,20,110),{value:110,wasted:5},'Vigor makes the extra room usable');
 assert.deepEqual(addEnergy(0,100,110),{value:100,wasted:0},'Thistle Tea from empty');
 assert.deepEqual(energyTick(100,105),{value:105,wasted:15});
 assert.equal(ENERGY_TICK,20);
 assert.equal(spendEnergy(40,35),5);assert.equal(spendEnergy(30,35),null);
 assert.deepEqual(addEnergy(50,-10,100),{value:50,wasted:0},'a gain is never negative');
});
test('saved and imported builds keep valid Starting Energy and clamp the rest instead of failing',()=>{
 assert.equal(validateClassOptions({startingEnergy:105},'rogue',{energyCap:110}).startingEnergy,105);
 assert.equal(validateClassOptions({startingEnergy:110},'rogue',{energyCap:100}).startingEnergy,100,'older saves stay valid');
 assert.equal(validateClassOptions({startingEnergy:110},'rogue',{energyCap:110}).startingEnergy,110);
 assert.throws(()=>validateClassOptions({startingEnergy:-1},'rogue',{energyCap:110}));
 assert.throws(()=>validateClassOptions({startingEnergy:111},'rogue',{energyCap:110}),'beyond the absolute maximum is still rejected');
 const build=newBuild('rogue');build.classOptions.startingEnergy=110;
 assert.equal(validateBuild(build,rogue).classOptions.startingEnergy,100,'no Vigor: clamped to 100');
 assert.equal(defaultClassOptions('rogue').startingEnergy,100);
 const planner=read('sim/planner.mjs');
 assert.match(planner,/energy\.max=String\(energyCap\(\)\)/,'the input limit follows the cap');
 for(const where of ['changeTalentExtent','function changeRank','clear-talents'])assert.ok(planner.includes(where),where);
 assert.match(planner,/reconcileStartingEnergy\(build\.classOptions\.startingEnergy,before,after\)/);
});
test('a saved build is carried to its own class and applied there once',()=>{
 const tab=memory();
 setPendingBuild(tab,{classId:'rogue',build:{name:'My rogue'}});
 assert.equal(takePendingBuild(tab,'paladin'),null,'another planner leaves it alone');
 assert.ok(tab.getItem(PENDING_BUILD_KEY));
 assert.equal(takePendingBuild(tab,'rogue').build.name,'My rogue');
 assert.equal(takePendingBuild(tab,'rogue'),null,'it is applied only once');
 tab.setItem(PENDING_BUILD_KEY,'not json');assert.equal(takePendingBuild(tab,'rogue'),null);assert.equal(tab.getItem(PENDING_BUILD_KEY),null);
 const planner=read('sim/planner.mjs');
 assert.match(planner,/const stored = pendingBuild \? null :/,'startup restoration never overwrites the build being loaded');
 assert.match(planner,/if\(entry\.classId!==classId\)/);
 assert.match(planner,/library\.listAll\(\)/);
 const html=read('sim/index.html');
 assert.match(html,/id="saved-class-filter"><option value="">All classes<\/option>/);
 assert.match(html,/placeholder="Build, character or class"/);
 assert.match(html,/>Export builds<\/button><button id="import-library" type="button">Import builds</);
 assert.doesNotMatch(html,/Export class builds|Import class builds/);
 assert.match(planner,/librarySchema:2/);assert.match(planner,/\[1,2\]\.includes\(backup\.librarySchema\)/,'class-specific version 1 backups still import');
});
test('every dialog closes from its x button, the backdrop and Escape (the x bug came from removing the shared handler)',()=>{
 const closed=[];
 const dialog={dataset:{},hasAttribute:()=>false,getBoundingClientRect:()=>({left:100,right:300,top:100,bottom:300}),close(){closed.push('dialog');},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
 const button={dataset:{close:'x'},addEventListener(type,fn){this.fn=fn;}};
 const root={querySelectorAll:selector=>selector==='[data-close]'?[button]:[dialog],getElementById:id=>id==='x'?dialog:null};
 wireDialogs(root);
 button.fn();assert.equal(closed.length,1,'x closes');
 dialog.listeners.click({target:dialog,clientX:10,clientY:10});assert.equal(closed.length,2,'backdrop click closes');
 dialog.listeners.click({target:dialog,clientX:150,clientY:150});assert.equal(closed.length,2,'a click inside does not');
 dialog.listeners.click({target:{},clientX:10,clientY:10});assert.equal(closed.length,2,'clicks on content do not');
 assert.match(read('sim/planner.mjs'),/wireDialogs\(document\)/);assert.match(read('outfitter/outfitter.mjs'),/wireDialogs\(document\)/);
 assert.match(read('outfitter/index.html'),/<dialog id="crop-dialog" class="crop-dialog" data-no-backdrop-close>/);
});
test('the item preview hands the wheel back to the page, and the Character fields are compact',()=>{
 const css=read('sim/combat-layout.css');
 assert.match(css,/\.planner-view \.gear-preview\{overscroll-behavior:auto\}/);
 assert.match(css,/#item-selector \.item-results\{[^}]*overscroll-behavior:contain/,'the item list still scrolls on its own');
 assert.match(css,/\.character-summary #gear-stats\{flex:1 1 0;min-height:0;[^}]*overscroll-behavior:contain/,'so do the character stats');
 assert.doesNotMatch(read('sim/planner.mjs')+read('sim/item-picker.mjs'),/addEventListener\('wheel'/,'no handler cancels wheel events');
 const html=read('sim/index.html');
 const row1=html.match(/<div class="character-controls">([\s\S]*?)<\/div>\s*<div class="character-options"/)[1];
 assert.ok(row1.indexOf('id="character-race"')<row1.indexOf('id="build-name"')&&row1.indexOf('id="build-name"')<row1.indexOf('id="character-level"'));
 assert.doesNotMatch(html,/Build details|<summary/,'no Build details toggle: the fields are always shown');
 const details=html.match(/<div class="character-options">([\s\S]*?)<p id="storage-status"/)[1];
 assert.ok(details.indexOf('id="character-name"')<details.indexOf('id="character-gender"')&&details.indexOf('id="character-gender"')<details.indexOf('id="profession-primary"'));
 assert.doesNotMatch(html,/profession-secondary/,'no secondary professions row');
 assert.match(html,/<option value="male">♂ Male<\/option><option value="female">♀ Female<\/option>/);
 const planner=read('sim/planner.mjs');
 assert.doesNotMatch(planner,/profession-rank-|type='number';rank\.min=1/,'no skill level boxes for the main professions');
 assert.deepEqual([...SECONDARY_SKILLS],['Cooking','First Aid','Fishing']);
 assert.match(css,/\.details-row\.row-character\{grid-template-columns:minmax\(0,1\.4fr\) minmax\(0,\.85fr\) minmax\(0,1\.2fr\) minmax\(0,1\.2fr\)\}/,'the character name gets the widest column');
});
test('gender is saved with the build and defaults to male',()=>{
 const build=newBuild('rogue');build.gender='female';
 assert.equal(validateBuild(build,rogue).gender,'female');
 delete build.gender;assert.equal(validateBuild(build,rogue).gender,undefined);
 build.gender='other';assert.throws(()=>validateBuild(build,rogue),/Invalid gender/);
 const skills=newBuild('rogue');skills.skills={Cooking:300,Alchemy:300};
 assert.deepEqual(validateBuild(skills,rogue).skills,{Cooking:300,Alchemy:300},'saved secondary skills are kept');
});
