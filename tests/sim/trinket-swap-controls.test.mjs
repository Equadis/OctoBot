import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild,validateBuild} from '../../docs/sim/core/builds.mjs';
function element(tag){
 const attrs=new Map(),events=new Map();
 return {tagName:tag,children:[],style:{},hidden:false,textContent:'',
  append(...items){this.children.push(...items)},prepend(...items){this.children.unshift(...items)},
  after(item){this.sibling=item},setAttribute(k,v){attrs.set(k,String(v))},
  removeAttribute(k){attrs.delete(k)},getAttribute(k){return attrs.get(k)},
  addEventListener(k,v){events.set(k,v)},fire(k){return events.get(k)?.({type:k})}};
}
const options=element('div'),body=element('body');
globalThis.document={body,createElement:element,getElementById:()=>options,addEventListener(){}};
globalThis.window={addEventListener(){}};
const {trinketSwapControls}=await import('../../docs/sim/trinket-swaps.mjs');
const descendants=n=>[n,...n.children.flatMap(descendants)];
test('Hunter control sets Pet None, routes replacement picker separately, and resets only swap settings',()=>{
 const data=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/hunter.json',import.meta.url)));
 let build=newBuild('hunter'),selection;build.classOptions.pet='Cat';build.gear.trinket1={id:19953,label:'Opening'};
 trinketSwapControls({getBuild:()=>build,onChange:next=>{build=validateBuild(next,data)},openPicker:(slot,context)=>{selection={slot,context}},inspect:async()=>null});
 const nodes=descendants(options.sibling),find=id=>nodes.find(n=>n.id===id);
 assert.ok(nodes.some(n=>n.textContent==='Petless Feign Death Trinket Swap'));
 const enabled=find('trinket-swap-enabled');enabled.checked=true;enabled.fire('change');
 assert.equal(build.classOptions.pet,'None');assert.equal(build.trinketSwap.enabled,true);
 const time=find('trinket-swap-time');time.value='25.5';time.fire('change');assert.equal(build.trinketSwap.atSeconds,25.5);
 const choose=nodes.find(n=>n.tagName==='button'&&n.textContent.startsWith('Trinket 1:'));choose.fire('click');
 assert.equal(selection.slot,'trinket1');selection.context.onEquip('trinket1',{id:11815,label:'Replacement'});
 assert.equal(build.gear.trinket1.id,19953);assert.equal(build.trinketSwap.gear.trinket1.id,11815);
 assert.equal(selection.context.getBuild().gear.trinket1.id,11815);
 selection.context.onClear();assert.deepEqual(build.trinketSwap.gear,{});
 nodes.find(n=>n.textContent==='Reset').fire('click');assert.equal(build.trinketSwap.enabled,false);
 assert.equal(build.gear.trinket1.id,19953);assert.equal(build.trinketSwap.atSeconds,20);
});
test('other classes do not receive swap controls',()=>{
 const before=options.sibling;
 trinketSwapControls({getBuild:()=>newBuild('mage')}).render();
 assert.equal(options.sibling,before);
});
