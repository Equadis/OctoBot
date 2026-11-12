// Display-only helpers. Never feed formatted strings back into calculations.
export function statTone(group,label,value){
 const numbers=String(value).match(/[+-]?\d+(?:\.\d+)?/g)?.map(Number)||[];
 if(!numbers.length||numbers.every(n=>n===0)&&['Armor Pen','Poison Chance','Spell Power','Spell Hit','Spell Pen','Fortune','Mana / 5s','Arcane Res','Fire Res','Nature Res','Frost Res','Shadow Res'].includes(label))return 'muted';
 if(/(?:^|[|,])\s*-\d/.test(String(value))&&numbers.some(n=>n<0))return 'negative';
 if(group==='Melee vs Target'){
  if(['Miss %','Yellow Miss %','Dodge %','Spell Miss %','Poison Resist %','Armour','Phys Reduced'].includes(label))return numbers.some(n=>n>0)?'negative':'muted';
  if(label==='Glance Dmg')return 'warning';
  if(label==='Eff. Crit')return 'positive';
 }
 if(label==='WS Crit'&&numbers.some(n=>n>0))return 'positive';
 return 'normal';
}
export function enchantSummary(enchant){
 if(!enchant)return 'No enchant';
 const name=enchant.name;
 const bonuses=[...name.matchAll(/\(([^()]*(?:[+-]\d)[^()]*)\)/g)].map(m=>m[1]);
 let summary=bonuses.length?bonuses.join(', '):/^[-+]\d/.test(name)?name.replace(/\s*\((?:MH|OH)\)/g,'').trim():'On-hit effect';
 const school=name.match(/\b(Shadow|Fire|Frost|Nature|Arcane) Power\b/i)?.[1];
 if(school)summary=summary.replace(/\bSP\b/g,`${school} SP`);
 return summary.replace(/\bAll\b(?! Stats)/g,'All Stats');
}
export function bonusTone(value){return /-\d/.test(value)?'negative':/\+\d/.test(value)?'positive':'normal';}
