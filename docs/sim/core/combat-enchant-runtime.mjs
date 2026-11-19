import {ppmChance} from './combat-proc-rates.mjs';
import {ENCHANTS,validEnchant,enchantAvailable} from './equipment-options.mjs';
const known=new Set(['crusader','lifestealing','fiery_weapon']);
export function compileEnchantProcs(build,gear,policies={},snapshot=null){
 const result=[];
 for(const [slot,p] of Object.entries(policies)){
  const item=gear[slot],selected=build.gear?.[slot]?.enchantId,entry=ENCHANTS.find(x=>x.id===selected);
  if(!['mainhand','offhand'].includes(slot)||!item||item.classs!==2||!entry||entry.effectStatus!=='event'||!validEnchant(selected,slot,build.classId,item,build.level)||!enchantAvailable(entry)||p.enchantId!==selected)throw Error('Proc requires matching equipped weapon enchant');
  const family=selected.replace(/_(mh|oh)$/,'');
  if(!known.has(family)||typeof p.provenance!=='string'||!p.provenance.trim()||p.acknowledgeUnverified===false||p.acknowledgeUnverified!==true)throw Error('Explicit supported enchant reference policy required');
  const number=(n)=>{if(!Number.isFinite(n)||n<0)throw Error('Explicit enchant magnitude required');return n;};
  let effect;
  if(family==='crusader'){
   if(!Number.isSafeInteger(p.durationMs)||p.durationMs<1)throw Error('Explicit Crusader duration required');
   // Direct strength conversion is not supported dynamically. Caller supplies
   // measured AP conversion and explicitly acknowledges omitted strength effects.
   if(p.strength===undefined&&p.acknowledgeAPOnly!==true)throw Error('Crusader requires explicit AP-only acknowledgement');if(p.strength!==undefined&&p.attackPower!==undefined)throw Error('Crusader requires exclusive strength or AP model');
   effect={kind:'compound',effects:[{kind:'aura',durationMs:p.durationMs,modifiers:[{stat:p.strength===undefined?'attackPower':'strength',mode:'flat',value:number(p.strength??p.attackPower)}],exclusiveGroup:p.exclusiveGroup??null},{kind:'heal',min:number(p.healMin),max:number(p.healMax)}]};
  }else{
   effect={kind:'damage',school:family==='fiery_weapon'?'fire':'shadow',min:number(p.min),max:number(p.max),outcomes:p.outcomes,mitigation:p.mitigation,threat:p.threat??null};
   if(family==='lifestealing'){if(!['effective','post-mitigation'].includes(p.leechBasis))throw Error('Explicit lifestealing basis required');effect.leech={basis:p.leechBasis,fraction:1};}
  }
  let chance=p.chance;if(p.ppm!==undefined){if(p.chance!==undefined||p.rateBasis!=='base-weapon-speed-landed'||!['white-only','named-attacks'].includes(p.eligibleAttacks))throw Error('Explicit exclusive PPM rate and event policy required');chance=ppmChance(p.ppm,snapshot?.melee?.[slot]?.baseSpeedSeconds);}
  result.push({id:'enchant:'+slot+':'+selected,source:entry.name,provenance:p.provenance,trigger:'landed',eligibility:p.ppm!==undefined&&p.eligibleAttacks==='white-only'?'white-melee':'melee',hand:slot,sources:p.sources,chance,cooldownMs:p.cooldownMs,effect});
 }
 return result;
}
