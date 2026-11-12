import {racialPassives,validRace} from './class-rules.mjs?v=20261112-audit1';
import {CONSUMABLE_BY_ID,consumablePassiveStats,consumableRestriction} from './consumables.mjs?v=20261112-audit1';
import {BASE_STATS} from './base-stats.mjs?v=20261112-stats1';
import {BUFF_STATS,normaliseBuffs} from './buffs.mjs?v=20261112-stats1';
import {ENCHANTS} from './equipment-options.mjs?v=20261111-classes1';
// Original planner calculations. Vanilla coefficients are a reference baseline,
// not an assertion that OctoWoW implements the same rules. See SOURCES.md.
const COEFFICIENTS={
 warrior:[2,0,.05,.05,0,0,0],paladin:[2,0,.0506,.0506,.0167,.7,3.5],hunter:[1,0,.0189,.0378,.0165,0,3.6],rogue:[1,1,1/29,1/14.5,0,0,0],priest:[1,0,.05,.05,.0168,3,.8],shaman:[2,0,.0508,.0508,.0169,1.7,2.3],mage:[1,0,.0514,.0514,.0168,3.2,.2],warlock:[1,0,.05,.05,.0165,2,1.7],druid:[2,0,.05,.05,.0167,.9,1.8]
};
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const pct=(n,d=1)=>Number.isFinite(n)?`${n.toFixed(d)}%`:'—';
const num=n=>Number.isFinite(n)?String(Math.round(n)):'—';
const pair=values=>values.join(' | ');
const sameOrPair=values=>values.every(v=>v===values[0])?values[0]:pair(values);
const ATTRIBUTES={Strength:'str',Agility:'agi',Stamina:'sta',Intellect:'int',Spirit:'spi',Armour:'armour','Arcane Resistance':'arcaneRes','Fire Resistance':'fireRes','Nature Resistance':'natureRes','Frost Resistance':'frostRes','Shadow Resistance':'shadowRes',Fortune:'fortune'};
export function passiveItemStats(item){
 const result={};const add=(key,value)=>{result[key]=(result[key]||0)+value;};
 for(const [key,value] of Object.entries(item.attributes||{}))if(ATTRIBUTES[key]&&Number.isFinite(value))add(ATTRIBUTES[key],value);
 for(const raw of item.effects||[]){
  const text=raw.replace(/^Equip:\s*/,'');if(/chance on hit|when|after|for \d+ sec|every|on hit/i.test(text))continue;
  let m;
  if((m=text.match(/^\+(\d+) Attack Power\.?$/i)))add('ap',+m[1]);
  else if((m=text.match(/Increases (?:your )?attack power by (\d+)\.?$/i)))add('ap',+m[1]);
  else if((m=text.match(/(?:chance to hit|chance to get a critical strike) with spells by (\d+(?:\.\d+)?)%/i)))add(/critical/i.test(text)?'spellCrit':'spellHit',+m[1]);
  else if((m=text.match(/(?:chance to hit|chance to get a critical strike|chance to dodge|chance to parry) by (\d+(?:\.\d+)?)%/i)))add(/dodge/i.test(text)?'dodge':/parry/i.test(text)?'parry':/critical/i.test(text)?'crit':'hit',+m[1]);
  else if((m=text.match(/Increased Defense \+(\d+)/i)))add('defense',+m[1]);
  else if((m=text.match(/damage and healing done by magical spells and effects by up to (\d+)/i)))add('sp',+m[1]);
  else if((m=text.match(/damage done by (Fire|Frost|Nature|Shadow|Arcane) spells and effects by up to (\d+)/i)))add(m[1].toLowerCase()+'Sp',+m[2]);
  else if((m=text.match(/(?:attack speed|haste) by (\d+(?:\.\d+)?)%/i)))add('haste',+m[1]);
  else if((m=text.match(/(?:ignore|ignores|reduces).*?(\d+) (?:of.*? )?(?:armor|armour)/i)))add('armorPen',+m[1]);
  else if((m=text.match(/(?:decreases|reduces).*?magical resistances.*?(\d+)/i)))add('spellPen',+m[1]);
 }
 return result;
}
function enchantStats(id){
 const name=ENCHANTS.find(e=>e.id===id)?.name||'',result={};
 // School-specific power must not inflate general Spell Power.
 const school=id?.match(/_(shadow|fire|frost|nature)_power$/)?.[1];
 const keys={Agi:'agi',Agility:'agi',Str:'str',Strength:'str',SP:school?school+'Sp':'sp',AP:'ap',Dodge:'dodge',Crit:'crit',Haste:'haste',ArPen:'armorPen',Defense:'defense','Spell Crit':'spellCrit'};
 for(const m of name.matchAll(/\+(\d+(?:\.\d+)?)%?\s+(All Stats|All|Spell Crit|Weapon Damage|Agility|Strength|Agi|Str|SP|AP|Dodge|Crit|Haste|ArPen|Defense)\b/g)){
  if(m[2].startsWith('All'))for(const key of ['str','agi','sta','int','spi'])result[key]=+m[1];
  else if(keys[m[2]])result[keys[m[2]]]=+m[1];
 }
 return result;
}
export function characterStats(build,talentData,gear={}){
 if(!validRace(build.classId,build.race))throw new Error('Invalid class/race combination.');
 const racial=racialPassives(build.race);
 const c=build.classId,level=build.level,base=BASE_STATS[`${build.race}:${c}`]?.[level-1];
 const s={str:base?.[0]??null,agi:base?.[1]??null,sta:base?.[2]??null,int:base?.[3]??null,spi:base?.[4]??null,health:0,mana:0,mp5:0,ap:0,sp:0,hit:0,crit:0,haste:0,spellHit:0,spellCrit:0,armorPen:0,spellPen:0,armour:0,defense:0,dodge:0,parry:0,weaponSkill:0,poisonChance:0,arcaneRes:0,fireRes:0,natureRes:0,frostRes:0,shadowRes:0,fortune:0,natureSp:0,fireSp:0,frostSp:0,shadowSp:0,arcaneSp:0};
 let haste=1;
 const add=values=>{for(const [key,value] of Object.entries(values)){if(key==='haste')haste*=1+value/100;else if(key in s&&s[key]!==null)s[key]+=value;}};
 for(const [slot,item] of Object.entries(gear)){add(passiveItemStats(item));add(enchantStats(build.gear[slot]?.enchantId));}
 const buffs=normaliseBuffs(build.controls.buffIds);for(const id of buffs)add(BUFF_STATS[id]||{});
 const has=id=>buffs.includes(id);
 for(const id of build.controls.consumableIds||[]){const item=CONSUMABLE_BY_ID.get(id);if(!consumableRestriction(item,build))add(consumablePassiveStats(item));}
 const talents=new Map((talentData?.talents||[]).map(t=>[t.name,{...t,rank:build.talents[t.id]||0}]));
 const value=name=>{const t=talents.get(name);return t?.rank?Number(t.descriptions[t.rank-1]?.match(/(\d+(?:\.\d+)?)%?/)?.[1]||0):0;};
 const selected=name=>(talents.get(name)?.rank||0)>0;
 const mult=(key,percentage)=>{if(s[key]!==null)s[key]=Math.floor(s[key]*(1+percentage/100));};
 if(c==='paladin'){mult('str',value('Divine Strength'));mult('int',value('Divine Intellect'));s.hit+=value('Precision');s.spellHit+=value('Precision');}
 if(c==='rogue'){s.crit+=value('Malice');s.hit+=value('Precision');s.dodge+=value('Lightning Reflexes');s.weaponSkill+=value('Weapon Expertise');s.poisonChance+=value('Improved Poisons');}
 if(c==='warrior')s.crit+=value('Cruelty');
 if(c==='hunter'){mult('agi',value('Lightning Reflexes'));s.crit+=value('Killer Instinct');}
 if(c==='priest')mult('int',value('Mental Strength'));
 if(c==='warlock'){mult('sta',value('Demonic Embrace'));mult('spi',-value('Demonic Embrace')/3);}
 if(c==='shaman'){for(const k of ['str','agi','sta','int','spi'])mult(k,value('Ancestral Knowledge'));s.crit+=value('Thundering Strikes');}
 if(c==='druid'){mult('int',value('Heart of the Wild'));if(build.classOptions.form==='Cat')mult('str',value('Heart of the Wild'));if(build.classOptions.form==='Bear')mult('sta',value('Heart of the Wild'));if(selected('Natural Weapons')){const t=talents.get('Natural Weapons');const text=t.descriptions[t.rank-1];s.hit+=Number(text.match(/melee attacks and spells by (\d+)%/)?.[1]||0);s.spellHit+=Number(text.match(/melee attacks and spells by (\d+)%/)?.[1]||0);}}
 if(has('kings'))for(const k of ['str','agi','sta','int','spi'])mult(k,10);
 if(racial.intellectMultiplier)mult('int',(racial.intellectMultiplier-1)*100);
 if(racial.agilityMultiplier)mult('agi',(racial.agilityMultiplier-1)*100);
 s.parry+=value('Deflection');s.defense+=value('Anticipation');
 s.armour*=1+value('Toughness')/100+(c==='druid'?value('Thick Hide')/100:0);
 const [aps,apa,critAgi,dodgeAgi,critInt,baseCrit,baseSpellCrit]=COEFFICIENTS[c];
 let apBase=['warrior','paladin'].includes(c)?3*level-20:['rogue','hunter','shaman'].includes(c)?2*level-20:c==='druid'?-20:-10;
 let ap=base?apBase+s.str*aps+s.agi*apa+s.ap:null;
 if(c==='druid'&&build.classOptions.form==='Cat'&&base)ap=2*level-20+s.str*2+s.agi+s.ap;
 if(c==='druid'&&build.classOptions.form==='Bear'&&base)ap=3*level-20+s.str*2+s.ap;
 if(c==='hunter'&&selected('Lightning Reflexes')&&base)ap+=s.agi*value('Lightning Reflexes')*10/100;
 if(has('trueshot')&&ap!==null)ap*=1.03;
 if(c==='priest'&&base)s.sp+=s.spi*value('Spiritual Guidance')/100;
 const health=base?(base[5]+s.health+Math.min(20,s.sta)+Math.max(0,s.sta-20)*10)*(racial.healthMultiplier||1):null;
 let armour=base?s.armour+s.agi*2:null;
 if(c==='druid'&&base){
  if(build.classOptions.form==='Bear')armour=s.armour*(level>=40?4.6:2.8)+s.agi*2;
  if(build.classOptions.form==='Moonkin')armour=selected('Moonkin Form')?s.armour*(1+value('Moonkin Form')/100)+s.agi*2:null;
 }
 for(const name of ['Arcane','Fire','Nature','Frost','Shadow'])s[name.toLowerCase()+'Res']+=racial[name.toLowerCase()+'Resistance']||0;
 let spellCrit=level===60&&base?baseSpellCrit+s.int*critInt+s.spellCrit:null;
 if(c==='druid'&&build.classOptions.form==='Moonkin'&&selected('Moonkin Form')&&spellCrit!==null)spellCrit+=3;
 const parryClasses=['warrior','paladin','rogue','hunter','shaman'];
 const parry=parryClasses.includes(c)?5+s.parry+s.defense*.04:0;
 const dodge=level===60&&base?baseCrit+s.agi*dodgeAgi+s.dodge+s.defense*.04+(racial.dodge||0):null;
 const target=build.planning,targetDefense=target.targetLevel*5;
 const weaponSkill=slot=>{const weapon=gear[slot];const bonus=racial.meleeSkills?.[weapon?.subclass]||0;return level*5+s.weaponSkill+bonus;};
 const skills=['mainhand','offhand'].map(weaponSkill),delta=skills.map(skill=>Math.max(0,targetDefense-skill));
 const wsCrit=skills.map(skill=>(skill-level*5)*.04);
 const crit=skills.map((_,i)=>level===60&&base?baseCrit+s.agi*critAgi+s.crit+wsCrit[i]+(c==='warrior'&&build.classOptions.stance==='Berserker'?3:0)+(c==='rogue'&&[4,15,13].includes(gear[i?'offhand':'mainhand']?.subclass)?value('Close Quarters Combat'):0):null);
 const dual=Boolean(gear.offhand?.classs===2),miss=delta.map(d=>clamp(5+d*.2+(dual?19:0)-s.hit));
 const yellow=clamp(5+delta[0]*.2-s.hit),dodgeTarget=delta.map(d=>clamp(5+d*.1)),glance=delta.map(d=>clamp(95-d*2,0,95));
 const glanceChance=clamp(10+Math.max(0,target.targetLevel-level)*10,0,40);
 const cap=miss.map((m,i)=>clamp(100-m-dodgeTarget[i]-glanceChance));
 const effectiveCrit=crit.map((v,i)=>v===null?null:clamp(Math.min(cap[i],v-Math.max(0,target.targetLevel-level))));
 const levelDiff=target.targetLevel-level,baseSpellMiss=levelDiff<=2?4+levelDiff:17+(levelDiff-3)*11;
 const spellMiss=clamp(baseSpellMiss-s.spellHit,1,99);
 const targetArmour=Math.max(0,target.targetArmour+buffs.reduce((n,id)=>n+(BUFF_STATS[id]?.targetArmour||0),0)-s.armorPen);
 const mitigation=100*targetArmour/(targetArmour+400+85*level);
 const damage=slot=>{const weapon=gear[slot];if(!weapon||weapon.classs!==2)return {damage:'0-0',speed:'0.00'};const m=weapon.tooltipText?.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s+Damage/i);const speed=Number(weapon.speed||weapon.tooltipText?.match(/Speed\s+(\d+(?:\.\d+)?)/)?.[1]);if(!m||!speed||ap===null)return {damage:'—',speed:'—'};const extra=Number(ENCHANTS.find(e=>e.id===build.gear[slot]?.enchantId)?.name.match(/^\+(\d+) Weapon Damage/)?.[1]||0);const scale=slot==='offhand'?.5*(1+(c==='rogue'?value('Dual Wield Specialization')/100:0)):1;return {damage:`${Math.round((+m[1]+ap/14*speed+extra)*scale)}-${Math.round((+m[2]+ap/14*speed+extra)*scale)}`,speed:(speed/haste).toFixed(2)};};
 const weapons=['mainhand','offhand'].map(damage);
 const groups=[];const group=(name,rows)=>groups.push({name,rows:rows.map(([label,value,note])=>({label,value,note}))});
 group('Base Stats',[['Strength',num(s.str)],['Agility',num(s.agi)],['Stamina',num(s.sta)],...(!['warrior','rogue'].includes(c)?[['Intellect',num(s.int)],['Spirit',num(s.spi)]]:[])]);
 group('Melee',[
 ['Wep Skill',pair(skills.map(num))],['Damage',pair(weapons.map(w=>w.damage))],['Speed',pair(weapons.map(w=>w.speed))],['Power',num(ap)],['Hit Rating',pct(s.hit,0)],['WS Crit',sameOrPair(wsCrit.map(n=>'+'+pct(n,2)))],['Crit Chance',sameOrPair(crit.map(n=>pct(n,2)))],['Haste',pct((haste-1)*100)],['Armor Pen',num(s.armorPen)],['Poison Chance','+'+pct(s.poisonChance,0)],['Poison Crit',pct(spellCrit,2)]
 ]);
 group('Melee vs Target',[
 ['Miss %',pair(miss.map(n=>pct(n)))],['Yellow Miss %',pct(yellow)],['Dodge %',pair(dodgeTarget.map(n=>pct(n)))],['Spell Miss %',pct(spellMiss)],['Poison Resist %',pct(target.targetNatureRes?null:spellMiss),'Against zero Nature resistance; additional resistance modelling is pending.'],['Glance Dmg',pair(glance.map(n=>pct(n,0)))],['Crit Cap',pair(cap.map(n=>pct(n)))],['Eff. Crit',pair(effectiveCrit.map(n=>pct(n,2)))],['Armour',num(targetArmour)],['Phys Reduced',pct(mitigation)]
 ]);
 group('Defence',[
 ['Health',num(health)],...(!['warrior','rogue'].includes(c)?[['Mana',num(base?base[6]+s.mana+Math.min(20,s.int)+Math.max(0,s.int-20)*15:null)],['Mana / 5s',num(s.mp5)]]:[]),['Parry %',pct(parry)],['Dodge %',pct(dodge)],['Armour',num(armour)],...['Arcane','Fire','Nature','Frost','Shadow'].map(name=>[name+' Res',num(s[name.toLowerCase()+'Res'])])
 ]);
 group('Spell',[
 ['Spell Power',num(s.sp)],['Spell Hit',pct(s.spellHit,0)],['Spell Pen',num(s.spellPen)],['Spell Crit',pct(spellCrit,2)],['Fortune',pct(s.fortune,0),'Flat Fortune bonuses only. Proc and server-specific Fortune conversions have not been verified.'],...['Nature','Fire','Frost','Shadow','Arcane'].filter(name=>s[name.toLowerCase()+'Sp']).map(name=>[name+' Power',num(s.sp+s[name.toLowerCase()+'Sp'])])
 ]);
 return {groups,sourceNote:'Planning estimates: Vanilla base attributes and level-60 coefficients; Combat Gum reference buffs and target table. Passive supported effects only; temporary procs and unimplemented set effects are excluded. OctoWoW server formulas are not yet verified. A dash means unavailable, not zero.'};
}
