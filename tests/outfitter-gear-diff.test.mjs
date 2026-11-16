import test from 'node:test';
import assert from 'node:assert/strict';
import {planGearChanges,applyGearChanges} from '../docs/outfitter/gear-diff.mjs';

// A stand-in for the Zam viewer that behaves the way the real one was observed to behave in the browser: wv(slot) only drops the item, and the
// set of visible geosets is recomputed from the character's own geosets minus what the worn items hide only when setItems() is called.
const GROUP_OF=id=>id<100?0:Math.floor(id/100);
function fakeViewer(base,hideRules){
 const worn=new Map();let visible=[...base];const calls=[];
 const recompute=()=>{
  const hidden=new Set();
  for(const [slot,display] of worn)for(const group of hideRules[display]?.[slot]||[])hidden.add(group);
  visible=base.filter(id=>id===0||!hidden.has(GROUP_OF(id)));       // geoset 0 is the body; group 0 means hair, which is 1 to 99
 };
 return {
  calls,
  wv(slot){calls.push(`wv${slot}`);worn.delete(slot);},
  setItems(list){calls.push(`set[${list.map(i=>i.slot).join(',')}]`);for(const item of list)worn.set(item.slot,item.display);recompute();},
  visible:()=>[...visible].sort((a,b)=>a-b),
  worn:()=>new Map(worn),
 };
}
// The old behaviour, kept here as a control: it only called setItems when something was added.
function legacyApply(actor,applied,next){
 for(const [slot,display] of applied)if(next.get(slot)!==display)actor.wv(slot);
 const added=[...next].filter(([slot,display])=>applied.get(slot)!==display);
 if(added.length)actor.setItems(added.map(([slot,display])=>({slot,display,visual:0})));
}

// Goblin: 0 body, 5 hair (group 0), 102 head (group 1), 302 moustache (group 3). High Elf man: 0 body, 5 hair, 104 beard (group 1), 701 ears (group 7).
const GOBLIN=[0,5,102,302,401,501],ELF=[0,5,104,701,401,501];
const RULES={
 hood:{1:[3]},                 // open face: hides only the moustache piece
 openHelm:{1:[0,3]},           // hair and moustache, face stays
 fullHelm:{1:[0,1,3]},         // covers the whole head (on the Goblin group 1 is the head)
 elfHood:{1:[1,2,3]},
 robe:{5:[4,5]},               // a chest piece that hides the arm and glove geosets
};
const HOOD=new Map([[1,'hood']]),OPEN=new Map([[1,'openHelm']]),FULL=new Map([[1,'fullHelm']]),NONE=new Map();

test('the plan names exactly what changed',()=>{
 assert.deepEqual(planGearChanges(new Map(),new Map()),{remove:[],add:[]});
 assert.deepEqual(planGearChanges(HOOD,HOOD),{remove:[],add:[]});
 assert.deepEqual(planGearChanges(HOOD,NONE),{remove:[1],add:[]});
 assert.deepEqual(planGearChanges(NONE,HOOD),{remove:[],add:[[1,'hood']]});
 assert.deepEqual(planGearChanges(HOOD,FULL),{remove:[1],add:[[1,'fullHelm']]});
 assert.deepEqual(planGearChanges(new Map([[1,'hood'],[5,'robe']]),new Map([[1,'hood']])),{remove:[5],add:[]});
});

test('control: the old code left the head hidden after a helm was removed, with nothing else changed',()=>{
 const actor=fakeViewer(GOBLIN,RULES);
 actor.setItems([{slot:1,display:'fullHelm'}]);
 assert.ok(!actor.visible().includes(102),'the full helm hides the Goblin head');
 legacyApply(actor,FULL,NONE);
 assert.ok(!actor.visible().includes(102),'the bug: still headless after removal');
});

test('removing a helm restores the head, hair and moustache immediately',()=>{
 const actor=fakeViewer(GOBLIN,RULES);
 let applied=new Map();
 const apply=next=>{applyGearChanges(actor,applied,next);applied=next;};
 assert.deepEqual(actor.visible(),GOBLIN.slice().sort((a,b)=>a-b),'no helm: everything visible');
 apply(FULL);
 assert.deepEqual(actor.visible(),[0,401,501],'full helm: hair, head and moustache hidden, body and equipment kept');
 apply(NONE);
 assert.deepEqual(actor.visible(),GOBLIN.slice().sort((a,b)=>a-b),'removed: the head is back at once');
});

test('the equipment transitions of the Dressing Room leave the correct geosets each time, with no stale hide flags',()=>{
 const actor=fakeViewer(GOBLIN,RULES);
 let applied=new Map();
 const apply=next=>{applyGearChanges(actor,applied,next);applied=next;return actor.visible();};
 const expected=helm=>GOBLIN.filter(id=>id===0||!new Set(RULES[helm]?.[1]||[]).has(GROUP_OF(id))).sort((a,b)=>a-b);
 assert.deepEqual(apply(NONE),expected());
 assert.deepEqual(apply(HOOD),expected('hood'));
 assert.deepEqual(apply(NONE),expected(),'remove hood');
 assert.deepEqual(apply(OPEN),expected('openHelm'));
 assert.ok(apply(OPEN).includes(102),'an open-faced helm keeps the face');
 assert.deepEqual(apply(FULL),expected('fullHelm'),'replace open helm with a full helm');
 assert.deepEqual(apply(HOOD),expected('hood'),'replace the full helm with a hood: the head returns');
 assert.deepEqual(apply(FULL),expected('fullHelm'));
 assert.deepEqual(apply(OPEN),expected('openHelm'),'and back to an open helm: nothing from the full helm lingers');
 assert.deepEqual(apply(NONE),expected(),'remove everything');
 assert.deepEqual([...actor.worn()],[],'nothing is left on the model');
});

test('repeated equip and remove cycles never accumulate hidden geosets',()=>{
 const actor=fakeViewer(GOBLIN,RULES);
 let applied=new Map();
 const baseline=actor.visible();
 for(let cycle=0;cycle<25;cycle++) {
  for(const helm of [HOOD,FULL,OPEN]) {
   applyGearChanges(actor,applied,helm);applied=helm;
   applyGearChanges(actor,applied,NONE);applied=NONE;
   assert.deepEqual(actor.visible(),baseline,`cycle ${cycle}`);
  }
 }
});

test('rapid changes end in exactly the state of the last outfit, whatever the order',()=>{
 const states=[HOOD,FULL,NONE,OPEN,NONE,NONE,FULL,HOOD,NONE,OPEN,FULL,NONE];
 const actor=fakeViewer(GOBLIN,RULES);let applied=new Map();
 for(const next of states){applyGearChanges(actor,applied,next);applied=next;}
 assert.deepEqual(actor.visible(),GOBLIN.slice().sort((a,b)=>a-b));
 const second=fakeViewer(GOBLIN,RULES);applied=new Map();
 for(const next of [FULL,HOOD,OPEN]){applyGearChanges(second,applied,next);applied=next;}
 assert.deepEqual(second.visible(),GOBLIN.filter(id=>id===0||(GROUP_OF(id)!==0&&GROUP_OF(id)!==3)).sort((a,b)=>a-b),'final state is the open helm only');
});

test('hiding the head is a removal and restoring it is an addition; both leave the correct geosets',()=>{
 const actor=fakeViewer(GOBLIN,RULES);let applied=new Map();
 applyGearChanges(actor,applied,FULL);applied=FULL;                      // helm on
 applyGearChanges(actor,applied,NONE);applied=NONE;                      // Hide Head ticked: the helm is dropped from the appearances
 assert.ok(actor.visible().includes(102));
 applyGearChanges(actor,applied,FULL);applied=FULL;                      // Hide Head cleared
 assert.ok(!actor.visible().includes(102));
});

test('other slots too: removing a robe brings back the geosets it hid, while a worn helm keeps hiding its own',()=>{
 const actor=fakeViewer([0,5,102,302,401,501,401,501],RULES);
 const both=new Map([[1,'hood'],[5,'robe']]);
 let applied=new Map();
 applyGearChanges(actor,applied,both);applied=both;
 assert.ok(!actor.visible().includes(401)&&!actor.visible().includes(501),'robe hides arms and gloves');
 assert.ok(!actor.visible().includes(302));
 applyGearChanges(actor,applied,HOOD);applied=HOOD;
 assert.ok(actor.visible().includes(401)&&actor.visible().includes(501),'robe removed: back at once');
 assert.ok(!actor.visible().includes(302),'the hood still hides the moustache piece');
});

test('only the slots that changed are touched: no reload-like churn',()=>{
 const actor=fakeViewer(GOBLIN,RULES);
 const robeAndHood=new Map([[1,'hood'],[5,'robe']]);
 applyGearChanges(actor,new Map(),robeAndHood);actor.calls.length=0;
 applyGearChanges(actor,robeAndHood,robeAndHood);
 assert.deepEqual(actor.calls,[],'an unchanged outfit makes no calls at all');
 applyGearChanges(actor,robeAndHood,new Map([[1,'hood']]));
 assert.deepEqual(actor.calls,['wv5','set[]'],'removing one item drops only that slot and refreshes once');
 actor.calls.length=0;
 applyGearChanges(actor,new Map([[1,'hood']]),new Map([[1,'fullHelm']]));
 assert.deepEqual(actor.calls,['wv1','set[1]'],'a replacement is one removal and one set');
});

test('original races are unaffected: the same rules and transitions work for a High Elf man and a human-style layout',()=>{
 const actor=fakeViewer(ELF,{...RULES,elfHood:{1:[1,2,3]}});let applied=new Map();
 const hood=new Map([[1,'elfHood']]);
 applyGearChanges(actor,applied,hood);applied=hood;
 assert.deepEqual(actor.visible(),[0,5,401,501,701],'beard hidden, hair and ears kept');
 applyGearChanges(actor,applied,NONE);applied=NONE;
 assert.deepEqual(actor.visible(),ELF.slice().sort((a,b)=>a-b),'removed: beard back');
});

test('a viewer that throws on a missing slot does not stop the refresh',()=>{
 const calls=[];
 const actor={wv(slot){calls.push('wv'+slot);throw Error('no such slot');},setItems(list){calls.push('set'+list.length);}};
 assert.deepEqual(applyGearChanges(actor,HOOD,NONE),{removed:[1],added:[]});
 assert.deepEqual(calls,['wv1','set0']);
});
