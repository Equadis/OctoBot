import {expectedOutcome} from './combat-math.mjs';
import {sampleAttack} from './combat-attack-tables.mjs';
import {attemptProc} from './combat-timeline.mjs';
const n=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit seal '+k+' required');return x;};
const integer=(x,k,min=0)=>{if(!Number.isSafeInteger(x)||x<min)throw new Error('Explicit seal '+k+' required');return x;};
const one=[{name:'hit',probability:1,multiplier:1,landed:true}];
export function sealTemplate(abilityId=null,fields={}){if(abilityId==='paladin:seal-of-light')return {kind:'light',durationMs:fields.referenceSealDurationMs??30000,rateType:null,rate:null,internalCooldownMs:null,weaponBasis:'base-white',weaponSeconds:null,procHealing:fields.referenceSealHeal??null,procHealingCoefficient:null,procAbilityIds:[],judgement:{durationMs:fields.referenceJudgementDurationMs??10000,healing:fields.referenceJudgementHeal??null,healingCoefficient:null,enabled:null,rate:null,internalCooldownMs:null,white:true,abilityIds:[],outcomes:null}};if(abilityId==='paladin:seal-of-wisdom')return {kind:'wisdom',durationMs:30000,rateType:null,rate:null,internalCooldownMs:null,weaponBasis:'base-white',weaponSeconds:null,procMana:187,procAbilityIds:[],judgement:{durationMs:10000,mana:59,enabled:null,rate:null,internalCooldownMs:null,white:true,abilityIds:[],outcomes:null}};const v=()=>({min:null,max:null,spellPowerCoefficient:null,apCoefficient:null,weaponCoefficient:null,outcomes:null,threat:null});return {durationMs:null,rateType:null,rate:null,internalCooldownMs:null,weaponBasis:null,weaponSeconds:null,proc:v(),judgement:v()};}
export function compileSealModel(model){
 if(!model||!['chance','ppm'].includes(model.rateType)||!['base-white','post-mitigation-white'].includes(model.weaponBasis))throw new Error('Explicit seal rate type and weapon basis required');
 integer(model.durationMs,'duration',1);integer(model.internalCooldownMs,'internal cooldown');n(model.rate,'rate',0,model.rateType==='chance'?1:Infinity);
 n(model.weaponSeconds,'unhasted weapon seconds',.01);
 if(model.kind==='wisdom'||model.kind==='light'){validateUtilitySealModel(model);return structuredClone(model);}
 const build=(x,judge=false)=>{
  if(!x)throw new Error('Explicit seal damage model required');const min=n(x.min,'damage minimum'),max=n(x.max,'damage maximum',min);
  n(x.apCoefficient,'AP coefficient');n(x.spellPowerCoefficient,'spell power coefficient');n(x.weaponCoefficient,'weapon coefficient');
  if(judge&&x.weaponCoefficient!==0)throw new Error('Judgement cannot depend on a previous white swing');
  expectedOutcome({min:0,max:0,outcomes:x.outcomes});if(x.outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit seal landed outcomes required');
  if(x.threat!==null){n(x.threat,'threat coefficient');}
  return {kind:'damage',when:'always',school:'holy',formula:{min,max,terms:[{stat:'holy',coefficient:x.spellPowerCoefficient},{stat:'attackPower',coefficient:x.apCoefficient}],multiplier:1},weaponCoefficient:x.weaponCoefficient,outcomes:x.outcomes,mitigation:0,flatReduction:0,threat:x.threat===null?null:{coefficient:x.threat,flat:0,multipliers:[],distribution:'each'}};
 };
 return {...model,proc:build(model.proc),judgement:build(model.judgement,true)};
}
export function activeSeal(e,actor,models){const aura=e.auras.active(actor,'buff').find(a=>models.has(a.id)&&a.ownerId===actor);return aura?{aura,model:models.get(aura.id)}:null;}
export function sealProcEffect(model,hit){if(model.kind==='wisdom')return {kind:'resource',when:'always',resource:'mana',delta:model.procMana};const b=model.weaponBasis==='base-white'?hit.base:hit.raw,f=model.proc.formula,q=b*model.proc.weaponCoefficient;return {...model.proc,formula:{...f,min:f.min+q,max:f.max+q}};}
const namesOk=(list,ids)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(x=>typeof x==='string'&&x.length>0&&(!ids||ids.has(x)));
export function validateWisdomSealModel(m,ids=null){if(m?.kind!=='wisdom')throw new Error('Explicit Wisdom seal model required');return validateUtilitySealModel(m,ids);}
export function validateUtilitySealModel(m,ids=null){
 if(!m||!['wisdom','light'].includes(m.kind))throw new Error('Explicit utility seal model required');
 integer(m.durationMs,'duration',1);integer(m.internalCooldownMs,'internal cooldown');if(!['chance','ppm'].includes(m.rateType))throw new Error('Explicit Wisdom seal rate type required');n(m.rate,'rate',0,m.rateType==='chance'?1:Infinity);n(m.weaponSeconds,'weapon seconds',.01);if(m.kind==='wisdom')n(m.procMana,'Wisdom seal mana');else {n(m.procHealing,'Light seal healing');n(m.procHealingCoefficient,'Light seal healing coefficient');}
 const j=m.judgement;if(!j||typeof j.enabled!=='boolean'||typeof j.white!=='boolean'||!namesOk(j.abilityIds,ids)||!namesOk(m.procAbilityIds,ids))throw new Error('Explicit Wisdom Judgement proc mode and contact eligibility required');
 integer(j.durationMs,'Judgement duration',1);integer(j.internalCooldownMs,'Judgement internal cooldown');if(m.kind==='wisdom')n(j.mana,'Judgement mana');else {n(j.healing,'Judgement healing');n(j.healingCoefficient,'Judgement healing coefficient');}n(j.rate,'Judgement chance',0,1);expectedOutcome({min:0,max:0,outcomes:j.outcomes});if(j.outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit Judgement landed outcomes required');return m;
}
export function applyWisdomJudgement(e,actor,target,model){
 const kind=model.kind,name=kind==='light'?'Judgement of Light':'Judgement of Wisdom',j=model.judgement,h=sampleAttack({min:0,max:0,outcomes:j.outcomes,random:e.random});e.recordMechanic('attack-result',{actorId:actor,targetId:target,source:name+' (apply)',school:'holy',...h});
 if(h.landed){for(const a of e.auras.active(undefined,'debuff'))if(a.ownerId===actor&&a.id.startsWith('paladin-judgement:'))e.auras.remove(a,'judgement-replaced');e.auras.apply({id:'paladin-judgement:'+kind,name,targetId:target,ownerId:actor,kind:'debuff',durationMs:j.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[]});}return h;
}
export function refreshJudgements(e,actor,target,all=false){for(const a of e.auras.active(target,'debuff'))if(a.id.startsWith('paladin-judgement:')&&(all||a.ownerId===actor))e.auras.apply({...a,durationMs:a.expiresAt-a.appliedAt,stackPolicy:'replace',refreshPolicy:'refresh'});}
export function procWisdomJudgement(e,actor,target,models,{white,abilityId}){
 const m=models.get('paladin:seal-of-wisdom');if(m?.kind!=='wisdom'||!m.judgement.enabled||!e.auras.active(target,'debuff').some(a=>a.id==='paladin-judgement:wisdom'&&a.ownerId===actor))return;
 const j=m.judgement;if(!(white?j.white:j.abilityIds.includes(abilityId)))return;
 if(!attemptProc(e.resources.cooldowns,{id:'judgement-wisdom:'+actor,chance:j.rate,internalCooldownMs:j.internalCooldownMs},e.random).triggered)return;
 const q=e.resources.change([{resource:'mana',delta:j.mana}]);if(!q.ok)throw new Error('Judgement mana return failed');e.recordMechanic('proc',{actorId:actor,targetId:target,source:'Judgement of Wisdom',procId:'judgement-wisdom'});e.recordMechanic('resource-change',{actorId:actor,targetId:target,source:'Judgement of Wisdom',resource:'mana',delta:j.mana,overflow:q.overflow.mana??0});
}
export function lightSealHeal(e,actor,model,stats){const power=e.auras.stat(actor,'healingPower',stats.healingPower??0);e.heal({actorId:actor,targetId:actor,source:'Seal of Light (proc)',value:Math.max(0,model.procHealing+model.procHealingCoefficient*power)});}
export function procLightJudgement(e,actor,target,models,{white,abilityId},stats){
 const m=models.get('paladin:seal-of-light');if(m?.kind!=='light'||!m.judgement.enabled||!e.auras.active(target,'debuff').some(a=>a.id==='paladin-judgement:light'&&a.ownerId===actor))return;
 const j=m.judgement;if(!(white?j.white:j.abilityIds.includes(abilityId)))return;
 if(!attemptProc(e.resources.cooldowns,{id:'judgement-light:'+actor,chance:j.rate,internalCooldownMs:j.internalCooldownMs},e.random).triggered)return;
 const power=e.auras.stat(actor,'healingPower',stats.healingPower??0);e.recordMechanic('proc',{actorId:actor,targetId:target,source:'Judgement of Light',procId:'judgement-light'});e.heal({actorId:actor,targetId:actor,source:'Judgement of Light',value:Math.max(0,j.healing+j.healingCoefficient*power)});
}
export function sealProbability(model){return model.rateType==='chance'?model.rate:Math.min(1,model.rate*model.weaponSeconds/60);}
