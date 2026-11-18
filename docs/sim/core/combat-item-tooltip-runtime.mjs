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
 m=s.match(/^Chance on melee attack to restore (\d+) (energy|mana|rage)\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'resource',resource:m[2].toLowerCase(),amount:+m[1]}};
 m=s.match(/^Your normal melee swings have a chance to Invigorate you, healing you for (\d+) to (\d+)\.?$/i);
 if(m)return {trigger:'landed',eligibility:'white-melee',effect:{kind:'heal',min:+m[1],max:+m[2]}};
 m=s.match(/^Use: Restores (\d+)(?: to (\d+))? health\.?$/i);
 if(m)return {trigger:'use',effect:{kind:'heal',min:+m[1],max:+(m[2]??m[1])}};
 m=s.match(/^Chance on hit: (?:Increases (?:your )?attack power by) (\d+) for (\d+) sec\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:[{stat:'attackPower',mode:'flat',value:+m[1]}]}};
 m=s.match(/^Chance on hit: (?:Blasts a target for|Sends a shadowy bolt at the enemy causing) (\d+)(?: to (\d+))? (Fire|Frost|Nature|Shadow|Arcane|Holy) damage\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'damage',min:+m[1],max:+(m[2]??m[1]),school:m[3].toLowerCase()}};
 m=s.match(/^(\d+)% chance of dealing (\d+) to (\d+) (Fire|Frost|Nature|Shadow|Arcane|Holy) damage on a successful melee attack\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',chance:+m[1]/100,effect:{kind:'damage',min:+m[2],max:+m[3],school:m[4].toLowerCase()}};
 m=s.match(/^Equip: (\d+)% chance on melee hit to gain (\d+) extra attacks?\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',chance:+m[1]/100,effect:{kind:'extra-attack',count:+m[2]}};
 m=s.match(/^Chance on hit: Poisons target for (\d+) Nature damage every (\d+) sec for (\d+) sec\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'periodic-damage',school:'nature',min:+m[1],max:+m[1],intervalMs:+m[2]*1000,durationMs:+m[3]*1000}};
 m=s.match(/^Use: Absorbs (\d+) to (\d+) damage\.\s*Lasts (\d+) sec\.?$/i);
 if(m)return {trigger:'use',effect:{kind:'absorb',min:+m[1],max:+m[2],durationMs:+m[3]*1000,schools:null}};
 m=s.match(/^Chance on hit: Shields the wielder from physical damage, absorbing (\d+) to (\d+) damage\. Lasts (\d+) sec\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'absorb',min:+m[1],max:+m[2],durationMs:+m[3]*1000,schools:['physical']}};
 m=s.match(/^Chance on hit: Steals (\d+) life from target enemy\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'damage',min:+m[1],max:+m[1],requiresSchool:true,requiresLeech:true}};
 m=s.match(/^Chance on hit: Drains target for (\d+) Shadow damage every (\d+) sec and transfers it to the caster\. Lasts for (\d+) sec\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'periodic-damage',school:'shadow',min:+m[1],max:+m[1],intervalMs:+m[2]*1000,durationMs:+m[3]*1000,requiresLeech:true}};
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
  const effect={...parsed.effect};if(['damage','periodic-damage'].includes(effect.kind)){if(effect.requiresSchool){effect.school=r.school;delete effect.requiresSchool;}if(effect.requiresLeech){if(!['effective','post-mitigation'].includes(r.leechBasis))throw Error('Explicit leech basis required');effect.leech={basis:r.leechBasis,fraction:1};delete effect.requiresLeech;}effect.outcomes=r.outcomes;effect.mitigation=r.mitigation;effect.threat=r.threat??null;if(effect.kind==='periodic-damage'){effect.refresh=r.refresh;effect.tickAtExpiry=r.tickAtExpiry;}}if(effect.kind==='extra-attack')effect.hand=r.hand;
  return {id:'tooltip:'+key,source:name,provenance:'Imported exact tooltip: '+raw,trigger:parsed.trigger,effect,cooldownMs:r.cooldownMs,...(parsed.trigger==='use'?{atMs:r.atMs}:{chance:parsed.chance??r.chance,sources:r.sources,...(parsed.eligibility?{eligibility:parsed.eligibility}:{})}),...(r.sharedGroup?{sharedGroup:r.sharedGroup,sharedCooldownMs:r.sharedCooldownMs}:{})};
 });
}
