import {expectedOutcome} from './combat-math.mjs';
import {attemptProc} from './combat-timeline.mjs';
// Weapon imbues: explicit current-server hypotheses, not a legacy default.
const names=['Windfury Weapon','Flametongue Weapon','Frostbrand Weapon','Rockbiter Weapon'];
const finite=(v,n,min=0,max=Infinity)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error('Explicit imbue '+n+' required');return v;};
const integer=(v,n,min=0,max=Infinity)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error('Explicit imbue '+n+' required');return v;};
export function imbueTemplate(name,eligibleAbilityIds=[]){
 const common={name,provenance:'',durationMs:null,eligibleAbilityIds,white:true};
 if(name==='Rockbiter Weapon')return {...common,damageBonus:null,threatMultiplier:null};
 return {...common,rateType:null,rate:null,weaponSeconds:null,internalCooldownMs:null,attacks:name==='Windfury Weapon'?null:1,oncePerAction:null,damage:{min:null,max:null,apCoefficient:null,spellPowerCoefficient:null,multiplier:null,outcomes:null,mitigation:null,flatReduction:null,threat:null},...(name==='Frostbrand Weapon'?{slow:null}:{})};
}
export function validateImbueModel(m,abilityIds){
 if(!m||!names.includes(m.name)||typeof m.provenance!=='string'||!m.provenance.trim())throw new Error('Explicit imbue identity and provenance required');
 integer(m.durationMs,'duration',1);if(typeof m.white!=='boolean'||!Array.isArray(m.eligibleAbilityIds)||new Set(m.eligibleAbilityIds).size!==m.eligibleAbilityIds.length||m.eligibleAbilityIds.some(a=>!abilityIds.has(a)))throw new Error('Explicit imbue contact eligibility required');
 if(m.elementalWeapons!==undefined){const t=m.elementalWeapons;integer(t.rank,'Elemental Weapons rank',0,3);if(t.rank>0&&m.name==='Frostbrand Weapon'){if(!['relative','percentage-points'].includes(t.chanceMode)||!['owner','any'].includes(t.frostShockScope))throw new Error('Explicit Frostbrand talent chance and Frost Shock scope required');finite(t.criticalMultiplier,'Frostbrand guaranteed critical multiplier',1);}}
 if(m.name==='Rockbiter Weapon'){finite(m.damageBonus,'Rockbiter per-contact base damage');finite(m.threatMultiplier,'Rockbiter threat multiplier');if((m.elementalWeapons?.rank??0)>0){const t=m.elementalWeapons;if(!['effective','post-mitigation'].includes(t.bulwarkBasis)||typeof t.shieldEquipped!=='boolean')throw new Error('Explicit Rockbiter bulwark damage basis and shield status required');}return m;}
 if(!['chance','ppm'].includes(m.rateType)||typeof m.oncePerAction!=='boolean')throw new Error('Explicit imbue proc rate and once-per-action policy required');
 finite(m.rate,'proc rate',0,m.rateType==='chance'?1:Infinity);finite(m.weaponSeconds,'unhasted weapon seconds',.01);integer(m.internalCooldownMs,'internal cooldown');integer(m.attacks,'bonus attacks',1,m.name==='Windfury Weapon'?8:1);
 const d=m.damage;if(!d)throw new Error('Explicit imbue damage formula required');
 finite(d.min,'base minimum');finite(d.max,'base maximum',d.min);finite(d.apCoefficient,'AP coefficient');finite(d.spellPowerCoefficient,'spell power coefficient');if(m.name==='Windfury Weapon'&&d.spellPowerCoefficient!==0)throw new Error('Windfury spell power coefficient must be zero');finite(d.multiplier,'damage multiplier');finite(d.mitigation,'mitigation',0,1);finite(d.flatReduction,'flat reduction');expectedOutcome({min:0,max:0,outcomes:d.outcomes});if(d.outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit imbue landed outcomes required');
 if(d.threat!==null){finite(d.threat?.coefficient,'threat coefficient');finite(d.threat?.flat,'flat threat');}
 if(m.name==='Frostbrand Weapon'&&m.slow!==null){integer(m.slow?.durationMs,'Frostbrand slow duration',1);finite(m.slow?.percent,'Frostbrand slow percent',0,100);}
 return m;
}
export function buildImbueConfig(build,gear,policy,abilityIds){
 if(build.classId!=='shaman'||!build.classOptions.mhImbue||build.classOptions.mhImbue==='None')return null;
 if(gear.mainhand?.classs!==2)throw new Error('Weapon imbue requires an equipped main-hand weapon');
 if(policy?.name!==build.classOptions.mhImbue)throw new Error('Explicit selected weapon imbue model required');
 const rank=Number(build.talents?.['263']??0);
 return validateImbueModel({...policy,elementalWeapons:{...policy.elementalWeapons,rank,shieldEquipped:gear.offhand?.classs===4&&gear.offhand?.subclass===6}},abilityIds);
}
export function createImbueRuntime(model,abilityIds){
 if(model===null)return null;const m=validateImbueModel(model,abilityIds);
 const eligible=(e,{hand,white,abilityId})=>e.timeline.now<m.durationMs&&hand==='mainhand'&&(white?m.white:m.eligibleAbilityIds.includes(abilityId));
 const rank=m.elementalWeapons?.rank??0;
 const rockbiter=(e,contact)=>eligible(e,contact)&&m.name==='Rockbiter Weapon'?m:null;
 const flameBuff=(e,contact)=>{if(rank>0&&m.name==='Flametongue Weapon'&&eligible(e,contact))e.auras.apply({id:'elemental-weapons-flame',name:'Elemental Weapons (Flametongue)',targetId:contact.actor,ownerId:contact.actor,kind:'buff',durationMs:5000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'elementalWeaponsFirePct',mode:'flat',value:10*rank}]});};
 const windBuff=(e,actor)=>{if(rank>0&&m.name==='Windfury Weapon')e.auras.apply({id:'elemental-weapons-wind',name:'Elemental Weapons (Windfury)',targetId:actor,ownerId:actor,kind:'buff',durationMs:5000,maxStacks:2,stacks:1,stackPolicy:'add',refreshPolicy:'refresh',modifiers:[{stat:'meleeHasteFactor',mode:'addPct',value:rank}]});};
 const attempt=(e,contact)=>{
  if(m.name==='Rockbiter Weapon'||!eligible(e,contact)||m.oncePerAction&&contact.actionState?.imbueRolled)return null;
  if(m.oncePerAction&&contact.actionState)contact.actionState.imbueRolled=true;
  const base=m.rateType==='chance'?m.rate:Math.min(1,m.rate*m.weaponSeconds/60),bonus=m.name==='Frostbrand Weapon'?[0,.08,.16,.25][rank]:0;const chance=Math.min(1,m.elementalWeapons?.chanceMode==='relative'?base*(1+bonus):base+bonus);
  const roll=attemptProc(e.resources.cooldowns,{id:'imbue:'+contact.actor+':'+m.name,chance,internalCooldownMs:m.internalCooldownMs},e.random);if(!roll.triggered)return null;
  const school=m.name==='Windfury Weapon'?'physical':m.name==='Flametongue Weapon'?'fire':'frost',d=m.damage;
  const effect={kind:'damage',when:'always',school,formula:{min:d.min,max:d.max,terms:[{stat:'attackPower',coefficient:d.apCoefficient},...(school==='physical'?[]:[{stat:school,coefficient:d.spellPowerCoefficient}])],multiplier:d.multiplier},outcomes:d.outcomes,mitigation:d.mitigation,flatReduction:d.flatReduction,threat:d.threat===null?null:{...d.threat,multipliers:[],distribution:'each'}};
  if(rank>0&&m.name==='Frostbrand Weapon'&&e.auras.active(contact.target,'debuff').some(a=>a.name==='Frost Shock'&&(m.elementalWeapons.frostShockScope==='any'||a.ownerId===contact.actor))){effect.outcomes=effect.outcomes.map(o=>o.landed?{...o,name:'forced-crit:'+o.name,critical:true,multiplier:o.critical===true||o.name==='crit'?o.multiplier:o.multiplier*m.elementalWeapons.criticalMultiplier}:o);}
  return {name:m.name,attacks:m.attacks,effect,slow:m.name==='Frostbrand Weapon'?m.slow:null};
 };
 const bulwark=(e,actor,raw,effective)=>{if(m.name!=='Rockbiter Weapon'||rank===0||e.timeline.now>=m.durationMs||!e.unit(actor).alive)return;const t=m.elementalWeapons,basis=t.bulwarkBasis==='effective'?effective:raw,capacity=basis*.2*(t.shieldEquipped?3:1);if(capacity>0)e.applyAbsorb({id:'elemental-weapons-bulwark',targetId:actor,actorId:actor,source:'Elemental Weapons (Rockbiter)',amount:capacity,durationMs:8000,fraction:.05*rank,capacityCap:e.unit(actor).maxHealth*.2,refresh:'add-capped'});};
 return {rockbiter,attempt,flameBuff,windBuff,bulwark};
}
