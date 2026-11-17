import {scopedEquipmentEffect} from './equipment-scopes.mjs?v=20261117-item-audit2';
// Conservative equipment effects: exact permanent lines only; classify every
// other line for review. Percentages are percentage points, not ratings.
const attrs={Strength:'str',Agility:'agi',Stamina:'sta',Intellect:'int',Spirit:'spi',Armor:'armour',Armour:'armour',Health:'health',Mana:'mana',Fortune:'fortune','Arcane Resistance':'arcaneRes','Fire Resistance':'fireRes','Nature Resistance':'natureRes','Frost Resistance':'frostRes','Shadow Resistance':'shadowRes'};
const schools=['arcane','fire','nature','frost','shadow'];
const skills={'Axes':[0],'Two-handed Axes':[1],'Bows':[2],'Guns':[3],'Maces':[4],'Two-handed Maces':[5],'Polearms':[6],'Swords':[7],'Two-handed Swords':[8],'Staves':[10],'Fist Weapons':[13],'Daggers':[15],'Thrown':[16],'Crossbows':[18]};
const number='([+-]?\\d+(?:\\.\\d+)?)';
const rx=(s)=>new RegExp('^'+s+'\\.?$','i');
const add=(out,k,v)=>{if(Number.isFinite(v))out[k]=(out[k]||0)+v;};
const line=(raw)=>String(raw||'').trim().replace(/\s+/g,' ');
export function classifyEquipmentEffect(raw){
 const text=line(raw);
 if(!text)return {status:'empty',stats:{}};
 if(/^(Use:|Chance on hit:)/i.test(text))return {status:'event',stats:{}};
 const t=text.replace(/^Equip:\s*/i,'');
 const stats={},put=(key,x)=>add(stats,key,Number(x)),match=s=>t.match(rx(s));
 let m;
 // Never use substring matches to add a contingent, composite or on-use effect.
 if((m=match('\\+'+number+' (Strength|Agility|Stamina|Intellect|Spirit|Armor|Armour|Health|Mana|Fortune|(?:Arcane|Fire|Nature|Frost|Shadow) Resistance)'))){const key=Object.keys(attrs).find(k=>k.toLowerCase()===m[2].toLowerCase());put(attrs[key],m[1]);}
 else if((m=match('\\+'+number+' All Resistances'))){for(const school of schools)put(school+'Res',m[1]);}
 else if((m=match('\\+'+number+' (?:to )?All Stats'))){for(const key of ['str','agi','sta','int','spi'])put(key,m[1]);}
 else if((m=match('\\+'+number+' Attack Power'))||(m=match('Increases (?:your )?attack power by '+number)))put('ap',m[1]);
 else if((m=match('\\+'+number+' ranged Attack Power'))||(m=match('Increases (?:your )?ranged attack power by '+number)))put('rangedAP',m[1]);
 else if((m=match('(?:Increases|Improves) your chance to (hit|get a critical strike) with spells and attacks by '+number+'%'))){put(/critical/i.test(m[1])?'crit':'hit',m[2]);put(/critical/i.test(m[1])?'spellCrit':'spellHit',m[2]);}
 else if((m=match('(?:Increases|Improves) your chance to (hit|get a critical strike) with spells by '+number+'%')))put(/critical/i.test(m[1])?'spellCrit':'spellHit',m[2]);
 else if((m=match('(?:Increases|Improves) your chance to (hit|get a critical strike) with (?:missile weapons|ranged weapons|ranged attacks) by '+number+'%')))put(/critical/i.test(m[1])?'rangedCrit':'rangedHit',m[2]);
 else if((m=match('(?:Increases|Improves) your chance to (hit|get a critical strike|dodge|parry) by '+number+'%')))put(({hit:'hit','get a critical strike':'crit',dodge:'dodge',parry:'parry'})[m[1].toLowerCase()],m[2]);
 else if((m=match('Increases your chance to (dodge|parry) an attack by '+number+'%')))put(m[1].toLowerCase(),m[2]);
 else if((m=match('Decreases your chance to parry an attack by '+number+'%')))put('parry',-Number(m[1]));
 else if((m=match('Increases your chance to block attacks with a shield by '+number+'%')))put('blockChance',m[1]);
 else if((m=match('Increases the block value of your shield by '+number)))put('blockValue',m[1]);
 else if((m=match('Increased Defense \\+'+number)))put('defense',m[1]);
 else if((m=match('Increased (.+) \\+'+number))&&Object.keys(skills).some(k=>k.toLowerCase()===m[1].toLowerCase())){const key=Object.keys(skills).find(k=>k.toLowerCase()===m[1].toLowerCase());for(const sub of skills[key])put('weaponSkill:'+sub,m[2]);}
 else if((m=match('Restores '+number+' (mana|health) (?:per|every) '+number+' sec'))&&Number(m[3])>0)put(m[2].toLowerCase()==='mana'?'mp5':'hp5',Number(m[1])*5/Number(m[3]));
 else if((m=match('Increases damage and healing done by magical spells and effects by up to '+number)))put('sp',m[1]);
 else if((m=match('Increases healing done by spells and effects by up to '+number)))put('healingPower',m[1]);
 else if((m=match('Increases damage done by (Fire|Frost|Nature|Shadow|Arcane|Holy) spells and effects by up to '+number)))put(m[1].toLowerCase()+'Sp',m[2]);
 else if((m=match('Increases your spell damage by up to '+number+' and your healing by up to '+number))){put('damageOnlySp',m[1]);put('healingPower',m[2]);}
 else if((m=match('Increases the damage you do with all spells by '+number)))put('damageOnlySp',m[1]);
 else if((m=match('Increases melee and ranged attack power by '+number)))put('ap',m[1]);
 else if((m=match('Increases your casting speed by '+number+'%')))put('castSpeedPct',m[1]);
 else if((m=match('Reduces all spell damage taken by '+number+'%')))put('spellDamageTakenReductionPct',m[1]);
 else if((m=match('Spell Damage received is reduced by '+number)))put('spellDamageTakenReductionFlat',m[1]);
 else if((m=match('Reduces damage taken from area of effect spells and abilities by '+number+'%')))put('aoeDamageTakenReductionPct',m[1]);
 else if((m=match('Reduces damage taken from critical hits and damage over time effects by '+number+'%'))){put('critDamageTakenReductionPct',m[1]);put('dotDamageTakenReductionPct',m[1]);}
 else if((m=match('Increases your resistance to silence(?: effects)? by '+number+'%')))put('silenceResistPct',m[1]);
 else if((m=match('Reduces the duration of interrupt effects used against you by '+number+'%')))put('interruptDurationReductionPct',m[1]);
 else if((m=match('Increases (?:your )?(run|swim|mount) speed by '+number+'%')))put(m[1].toLowerCase()+'SpeedPct',m[2]);
 else if((m=match('Increases (?:your )?(?:ranged attack speed|ranged haste) by '+number+'%')))put('rangedHaste',m[1]);
 else if((m=match('Increases (?:your )?(?:attack speed|haste) by '+number+'%')))put('haste',m[1]);
 else if((m=match("Your attacks ignore "+number+" of the target's armor"))||(m=match("Your attacks ignore "+number+" of the target's armour")))put('armorPen',m[1]);
 else if((m=match('Decreases the magical resistances of your spell targets by '+number)))put('spellPen',m[1]);
 else if((m=match('Allows '+number+'% of your Mana regeneration to continue while casting')))put('castingRegenPct',m[1]);
 else if((m=match('Reduces damage taken from critical hits by '+number+'%')))put('critDamageTakenReductionPct',m[1]);
 else if((m=match('Reduces damage taken from damage over time effects by '+number+'%')))put('dotDamageTakenReductionPct',m[1]);
 else if((m=match('\\+'+number+' Attack Power in Cat, Bear, Dire Bear, and Moonkin forms only')))return {status:'conditional',stats:{formAP:+m[1]},condition:'druid-form'};
 else {const scoped=scopedEquipmentEffect(raw);if(scoped)return scoped;
  if(/chance|when|while|for \d+ sec|only|against|your pet|your [A-Z][a-z]+ ability|your [A-Z][a-z]+ spell|in combat|per attack|on hit|on use|returned as healing|melee attacks|nearby party/i.test(t))return {status:'conditional',stats:{}};
  return {status:'unmapped',stats:{}};
 }
 return {status:'passive',stats};
}
export function equipmentItemAudit(item,build={}){
 const stats={},effects=[],merge=a=>{for(const [k,v] of Object.entries(a))add(stats,k,v);};
 for(const [k,v] of Object.entries(item.attributes||{}))if(attrs[k]&&Number.isFinite(v))add(stats,attrs[k],v);
 // Recover signed primary attributes missing from the original importer.
 // Read only the primary tooltip block, never named set bonuses or use text.
 const primary=String(item.tooltipText||'').split(/\n[^\n]*\(\d+\/\d+\)(?:\s*Requires [A-Za-z ]+ \(\d+\))?\s*(?:\n|$)/)[0];
 for(const l of primary.split('\n')){
  const m=l.trim().match(/^([+-]\d+)\s+(Strength|Agility|Stamina|Intellect|Spirit|Health|Mana|Fortune|(?:Arcane|Fire|Nature|Frost|Shadow) Resistance)$/i);
  if(m){const attr=Object.keys(attrs).find(k=>k.toLowerCase()===m[2].toLowerCase());if(!Object.hasOwn(item.attributes||{},attr))add(stats,attrs[attr],+m[1]);}
 }
 for(const raw of item.effects||[]){const result=classifyEquipmentEffect(raw);effects.push({raw,...result});
  if(result.status==='passive')merge(result.stats);
  if(result.condition==='druid-form'&&build.classId==='druid'&&['Cat','Bear','Moonkin'].includes(build.classOptions?.form))add(stats,'ap',result.stats.formAP);
 }
 return {stats,effects};
}
export function parseItemSet(item){
 const lines=String(item.tooltipText||'').split('\n').map(s=>s.trim()).filter(Boolean);
 const i=lines.findIndex(l=>/^.+ \(\d+\/\d+\)(?:\s*Requires [A-Za-z ]+ \(\d+\))?$/.test(l));
 if(i<0)return null;
 const m=lines[i].match(/^(.+) \((\d+)\/(\d+)\)(?:\s*Requires ([A-Za-z ]+) \((\d+)\))?$/),size=+m[3];
 const name=m[1].replace(/^"[^"\n]*"\s*/,''),requirement=m[4]?{skill:m[4],rank:+m[5]}:null;
 const members=lines.slice(i+1,i+1+size);
 if(size<2||members.length!==size||!members.includes(item.name))return null;
 const bonuses=lines.slice(i+1+size).map(l=>l.match(/^\((\d+)\) Set:\s*(.+)$/i)).filter(Boolean).map(([,n,effect])=>({pieces:+n,effect}));
 if(!bonuses.length||bonuses.some(x=>x.pieces<1||x.pieces>size))return null;
 // Full roster identity prevents same-name PvP variants from cross-counting.
 return {key:JSON.stringify([name,[...members].sort(),requirement]),name,members,bonuses,requirement};
}
export function equipmentSetAudit(gear,build={}){
 const sets=new Map(),stats={},active=[],unresolved=[],seenIds=new Set();
 for(const item of Object.values(gear)){
  if(!item||!Number.isInteger(item.id)||seenIds.has(item.id))continue;seenIds.add(item.id);
  const set=parseItemSet(item);if(!set){if(/\(\d+\/\d+\)/.test(item.tooltipText||''))unresolved.push({item:item.name,reason:'Unverified set roster'});continue;}
  const old=sets.get(set.key)||{...set,pieces:new Map(),conflict:false};
  const signature=s=>JSON.stringify(s.bonuses.map(b=>[b.pieces,b.effect]).sort());
  if(signature(set)!==signature(old))old.conflict=true;
  const allowed=set.members.filter(n=>n===item.name).length;old.pieces.set(item.name,Math.min(allowed,(old.pieces.get(item.name)||0)+1));sets.set(set.key,old);
 }
 for(const s of sets.values()){
  if(s.conflict){unresolved.push({set:s.name,reason:'Conflicting member tooltip bonuses'});continue;}
  const seen=new Set(),count=[...s.pieces.values()].reduce((a,b)=>a+b,0);
  for(const bonus of s.bonuses){
   const key=JSON.stringify(bonus);if(seen.has(key))continue;seen.add(key);
   if(count<bonus.pieces)continue;
   if(s.requirement&&(build.skills?.[s.requirement.skill]||0)<s.requirement.rank){unresolved.push({set:s.name,reason:'Set bonus requires '+s.requirement.skill+' ('+s.requirement.rank+')'});continue;}
   const result=classifyEquipmentEffect(bonus.effect);
   active.push({set:s.name,count,...bonus,...result});
   if(result.status==='passive')for(const [k,v] of Object.entries(result.stats))add(stats,k,v);
  }
 }
 return {stats,active,unresolved};
}
export function weaponSkillBonus(stats,item){return item?.classs===2?(stats['weaponSkill:'+item.subclass]||0):0;}
