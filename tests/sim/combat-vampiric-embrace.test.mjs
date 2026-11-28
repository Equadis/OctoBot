import test from 'node:test';import assert from 'node:assert/strict';
import {compileVampiricEmbrace,validateVampiricParty} from '../../docs/sim/core/combat-vampiric-embrace.mjs';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}];
const policy={basis:'effective',recipients:['player','ally'],manaRecipients:{player:'mana',ally:'partyMana:ally'},healThreat:null,outcomes:hit};
const model=compileVampiricEmbrace({talents:{214:1,215:2}},policy);
const action=(abilityId,spellId,effects,extra={})=>({abilityId,spellId,rank:1,learnLevel:1,source:'fixture',evidenceStatus:'synthetic',actorId:'player',kind:'instant',castMs:0,gcdMs:1500,cooldownMs:0,sharedCooldown:null,costs:[],targets:['enemy'],minRangeYards:0,maxRangeYards:30,position:null,comboRequired:null,requiredContext:null,effects,...extra});
const damage=school=>({kind:'damage',when:'always',school,formula:{min:100,max:100,terms:[],multiplier:1},outcomes:hit,mitigation:0,flatReduction:0,threat:null});
const sc={mode:'research',provenance:'Vampiric fixture',classId:'priest',level:60,seed:1,durationMs:5000,decisionIntervalMs:50,pools:{mana:{current:10,max:100},'partyMana:ally':{current:99,max:100}},units:[{id:'player',maxHealth:1000,health:100},{id:'ally',maxHealth:1000,health:100},{id:'boss',maxHealth:10000}],playerId:'player',primaryId:'boss',targetIds:['boss'],allyIds:['ally'],stats:{player:{}},classContext:{},geometry:{player:{boss:{distance:10,position:'front'}}},autos:[],regeneration:[]};
test('Vampiric Embrace and Touch use imported rank values',()=>{for(let i=0;i<3;i++){const p=compileVampiricEmbrace({talents:{214:1,215:i}},policy);assert.equal(p.healFraction,[.2,.22,.25][i]);assert.equal(p.manaFraction,[0,.01,.02][i]);}assert.throws(()=>compileVampiricEmbrace({talents:{215:2}},policy),/requires its talent/);assert.throws(()=>validateVampiricParty(model,'player',['ally'],{mana:{}}),/separate mana pool/);});
test('Vampiric Embrace heals each party member and returns mana to separate capped pools only after owned Shadow damage',()=>{
 const aura=action('priest:vampiric-embrace',15286,[{kind:'vampiric-embrace',when:'always',model}],{cooldownMs:60000});
 const mind=action('priest:mind-blast',10947,[damage('shadow')],{cooldownMs:60000});
 const holy=action('priest:smite',10934,[damage('holy')]);
 const r=createExplicitClassEncounter({...sc,actions:[aura,mind,holy],rows:[{ability:'Vampiric Embrace',target:'primary',conditions:[]},{ability:'Mind Blast',target:'primary',conditions:[]},{ability:'Smite',target:'primary',conditions:[]}]}).run();
 assert.deepEqual(r.events.filter(e=>e.type==='heal'&&e.source==='Vampiric Embrace').map(e=>[e.targetId,e.effective]),[['player',25],['ally',25]]);
 assert.equal(r.resources.mana.current,12);assert.equal(r.resources['partyMana:ally'].current,100);
 assert.deepEqual(r.events.filter(e=>e.type==='resource-change'&&e.source==='Vampiric Touch').map(e=>[e.targetId,e.delta,e.overflow]),[['player',2,0],['ally',1,1]]);
});
test('resisted Vampiric Embrace generates no returns',()=>{
 const aura=action('priest:vampiric-embrace',15286,[{kind:'vampiric-embrace',when:'always',model:{...model,outcomes:[{name:'miss',probability:1,multiplier:0,landed:false}]}}],{cooldownMs:60000});
 const mind=action('priest:mind-blast',10947,[damage('shadow')]);
 const r=createExplicitClassEncounter({...sc,actions:[aura,mind],rows:[{ability:'Vampiric Embrace',target:'primary',conditions:[]},{ability:'Mind Blast',target:'primary',conditions:[]}]}).run();assert.ok(!r.events.some(e=>e.source==='Vampiric Touch'||e.type==='heal'));
});
