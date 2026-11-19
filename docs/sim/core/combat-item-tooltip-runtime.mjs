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
 m=s.match(/^Equip: Gives a chance when your harmful spells land to deal (\d+) Shadow damage and restore (\d+) mana to you\.?$/i);
 if(m)return {trigger:'landed',effect:{kind:'compound',effects:[{kind:'damage',school:'shadow',min:+m[1],max:+m[1]},{kind:'resource',resource:'mana',amount:+m[2]}]}};
 m=s.match(/^Chance on hit: Increases your attack speed by (\d+)% for (\d+) sec\.?$/i);
 if(m)return {trigger:'landed',eligibility:'melee',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:[{stat:'meleeHasteFactor',mode:'multiplyPct',value:+m[1]}]}};
 m=s.match(/^Use: Increases (?:your )?armor by (\d+) for (\d+) sec(?:onds?)?\.?$/i);
 if(m)return {trigger:'use',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:[{stat:'incomingArmourDelta',mode:'flat',value:+m[1]}]}};
 m=s.match(/^Use: Increases (?:your )?(Fire|Frost|Nature|Shadow|Arcane) resistance by (\d+) for (\d+) sec(?:onds?)?\.?$/i);
 if(m)return {trigger:'use',effect:{kind:'aura',durationMs:+m[3]*1000,modifiers:[{stat:'incoming'+m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()+'ResistanceDelta',mode:'flat',value:+m[2]}]}};
 m=s.match(/^When struck in combat has a chance of returning (\d+) mana, (\d+) rage, or (\d+) energy to the wearer\.?$/i);
 if(m)return {trigger:'struck',effect:{kind:'resource-choice',amounts:{mana:+m[1],rage:+m[2],energy:+m[3]}}};
 m=s.match(/^Your Eviscerate has a (\d+)% chance per combo point to reveal a flaw in your opponent's armor, granting a 100% critical hit chance for your next Backstab, Sinister Strike, Noxious Assault, or Hemorrhage\.?$/i);
 if(m)return {trigger:'landed',sources:['Eviscerate'],chancePerComboPoint:+m[1]/100,effect:{kind:'aura',modifiers:[],guaranteedCrit:{sources:['Backstab','Sinister Strike','Noxious Assault','Hemorrhage']}}};
 m=s.match(/^(\d+)% chance to restore (\d+) energy and increase dodge and melee attack speed by (\d+)% for (\d+) sec\.?$/i);
 if(m)return {trigger:'landed',chance:+m[1]/100,effect:{kind:'compound',effects:[{kind:'resource',resource:'energy',amount:+m[2]},{kind:'aura',durationMs:+m[4]*1000,modifiers:[{stat:'incomingDodgeDeltaPct',mode:'flat',value:+m[3]},{stat:'meleeHasteFactor',mode:'multiplyPct',value:+m[3]}]}]}};
 m=s.match(/^Equip: Gives a chance when your harmful spells land to increase the damage of your spells and effects by up to (\d+) for (\d+) sec\.?$/i);
 if(m)return {trigger:'landed',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:['fire','frost','nature','shadow','arcane','holy'].map(stat=>({stat,mode:'flat',value:+m[1]}))}};
 m=s.match(/^Use: Increases your attack speed by (\d+)% for (\d+) sec\.?$/i);
 if(m)return {trigger:'use',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:[{stat:'meleeHasteFactor',mode:'multiplyPct',value:+m[1]}]}};
 m=s.match(/^Grants a small chance when ranged or melee damage is dealt to infuse the wielder with a blessing from the Primal Gods\. Ranged and melee attack power increased by (\d+) for (\d+) seconds\.$/i);
 if(m)return {trigger:'landed',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:['attackPower','rangedAP'].map(stat=>({stat,mode:'flat',value:+m[1]}))}};
 m=s.match(/^Use: Reduces (?:your )?threat (?:generated|caused) by (\d+)% for (\d+) sec(?:onds?)?\.?$/i);
 if(m&&+m[1]<=100)return {trigger:'use',effect:{kind:'aura',durationMs:+m[2]*1000,modifiers:[{stat:'globalThreatFactor',mode:'multiplyPct',value:-Number(m[1])}]}};
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
  const compileEffect=raw=>{const effect={...raw};if(effect.kind==='resource-choice'){if(!Object.hasOwn(effect.amounts,r.resource)||r.resource!==({warrior:'rage',rogue:'energy',druid:r.resource} [build.classId]??'mana'))throw Error('Explicit compatible resource choice required');return {kind:'resource',resource:r.resource,amount:effect.amounts[r.resource]};}if(effect.kind==='compound')return {...effect,effects:effect.effects.map(compileEffect)};if(['damage','periodic-damage'].includes(effect.kind)){if(effect.requiresSchool){effect.school=r.school;delete effect.requiresSchool;}if(effect.requiresLeech){if(!['effective','post-mitigation'].includes(r.leechBasis))throw Error('Explicit leech basis required');effect.leech={basis:r.leechBasis,fraction:1};delete effect.requiresLeech;}effect.outcomes=r.outcomes;effect.mitigation=r.mitigation;effect.threat=r.threat??null;if(effect.kind==='periodic-damage'){effect.refresh=r.refresh;effect.tickAtExpiry=r.tickAtExpiry;}}if(effect.kind==='extra-attack')effect.hand=r.hand;if(effect.guaranteedCrit){if(build.classId!=='rogue'||!Number.isSafeInteger(r.durationMs)||r.durationMs<1||!['attempt','landed'].includes(r.consume))throw Error('Explicit Rogue critical charge duration and consumption required');effect.durationMs=r.durationMs;effect.guaranteedCrit={...effect.guaranteedCrit,consume:r.consume};}return effect;};const effect=compileEffect(parsed.effect);
  return {id:'tooltip:'+key,source:name,provenance:'Imported exact tooltip: '+raw,trigger:parsed.trigger,effect,cooldownMs:r.cooldownMs,...(r.conditions?{conditions:r.conditions}:{}),...(parsed.trigger==='use'?{atMs:r.atMs}:{chance:parsed.chancePerComboPoint!==undefined?0:parsed.chance??r.chance,sources:parsed.sources??r.sources,...(parsed.chancePerComboPoint!==undefined?{chancePerComboPoint:parsed.chancePerComboPoint}:{}),...(parsed.eligibility?{eligibility:parsed.eligibility}:{})}),...(r.sharedGroup?{sharedGroup:r.sharedGroup,sharedCooldownMs:r.sharedCooldownMs}:{})};
 });
}
