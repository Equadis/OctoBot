import {expectedOutcome} from './combat-math.mjs';
const n=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit seal '+k+' required');return x;};
const integer=(x,k,min=0)=>{if(!Number.isSafeInteger(x)||x<min)throw new Error('Explicit seal '+k+' required');return x;};
const one=[{name:'hit',probability:1,multiplier:1,landed:true}];
export function sealTemplate(){const v=()=>({min:null,max:null,spellPowerCoefficient:null,apCoefficient:null,weaponCoefficient:null,outcomes:null,threat:null});return {durationMs:null,rateType:null,rate:null,internalCooldownMs:null,weaponBasis:null,weaponSeconds:null,proc:v(),judgement:v()};}
export function compileSealModel(model){
 if(!model||!['chance','ppm'].includes(model.rateType)||!['base-white','post-mitigation-white'].includes(model.weaponBasis))throw new Error('Explicit seal rate type and weapon basis required');
 integer(model.durationMs,'duration',1);integer(model.internalCooldownMs,'internal cooldown');n(model.rate,'rate',0,model.rateType==='chance'?1:Infinity);
 n(model.weaponSeconds,'unhasted weapon seconds',.01);
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
export function sealProcEffect(model,hit){const b=model.weaponBasis==='base-white'?hit.base:hit.raw,f=model.proc.formula,q=b*model.proc.weaponCoefficient;return {...model.proc,formula:{...f,min:f.min+q,max:f.max+q}};}
export function sealProbability(model){return model.rateType==='chance'?model.rate:Math.min(1,model.rate*model.weaponSeconds/60);}
