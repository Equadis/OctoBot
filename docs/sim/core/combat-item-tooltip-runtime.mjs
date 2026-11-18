import {equipmentSetAudit} from './item-effects.mjs';
// Exact complete tooltip patterns only. Unsupported composite lines must not
// silently become partial effects. Cooldowns/proc eligibility remain inputs.
export function parseTimedEquipmentTooltip(raw){
 const s=String(raw??'').trim().replace(/\s+/g,' ');
 let m=s.match(/^Use: Increases (?:your )?(?:melee )?attack power by (\d+) for (\d+) sec(?:onds?)?\.?$/i);
 if(m)return {trigger:'use',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:[{stat:'attackPower',mode:'flat',value:+m[1]}]}};
 m=s.match(/^Use: Increases (?:damage and healing done by magical spells and effects|your spell damage and healing power) by (?:up to )?(\d+) for (\d+) sec(?:onds?)?\.?$/i);
 if(m)return {trigger:'use',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:['fire','frost','nature','shadow','arcane','holy','healingPower'].map(stat=>({stat,mode:'flat',value:+m[1]}))}};
 m=s.match(/^Chance on hit: (?:Blasts|Strikes|Hits) the target (?:with|for) (\d+)(?: to (\d+))? (Fire|Frost|Nature|Shadow|Arcane|Holy) damage\.?$/i);
 if(m)return {trigger:'landed',effect:{kind:'damage',min:+m[1],max:+(m[2]??m[1]),school:m[3].toLowerCase()}};
 m=s.match(/^Chance on hit: Grants (\d+) extra attacks?\.?$/i);
 if(m)return {trigger:'landed',effect:{kind:'extra-attack',count:+m[1]}};
 return null;
}
export function compileEquipmentTooltips(gear,build,requests=[]){
 if(!Array.isArray(requests))throw Error('Explicit item effect requests required');
 const seen=new Set(),sets=equipmentSetAudit(gear,build).active;
 return requests.map(r=>{
  let raw,name,identity;
  if(r.set!==undefined){const s=sets.find(x=>x.set===r.set&&x.pieces===r.pieces&&x.effect===r.tooltip);if(!s)throw Error('Set bonus is not active');raw=s.effect;name=s.set+' ('+s.pieces+' pieces)';identity=['set',s.set,s.pieces,raw];}
  else {const item=gear[r.slot];if(!item||item.id!==r.itemId||!item.effects?.includes(r.tooltip))throw Error('Item effect requires exact equipped tooltip');raw=r.tooltip;name=item.name;identity=['item',r.slot,item.id,raw];}
  const key=JSON.stringify(identity);if(seen.has(key))throw Error('Duplicate tooltip effect');seen.add(key);
  const parsed=parseTimedEquipmentTooltip(raw);if(!parsed)throw Error('Unmapped equipment tooltip: '+raw);
  if(r.acknowledgeUnverifiedTiming!==true)throw Error('Explicit research timing acknowledgement required');
  const effect={...parsed.effect};if(effect.kind==='damage'){effect.outcomes=r.outcomes;effect.mitigation=r.mitigation;effect.threat=r.threat??null;}if(effect.kind==='extra-attack')effect.hand=r.hand;
  return {id:'tooltip:'+key,source:name,provenance:'Imported exact tooltip: '+raw,trigger:parsed.trigger,effect,cooldownMs:r.cooldownMs,...(parsed.trigger==='use'?{atMs:r.atMs}:{chance:r.chance,sources:r.sources}),...(r.sharedGroup?{sharedGroup:r.sharedGroup,sharedCooldownMs:r.sharedCooldownMs}:{})};
 });
}
