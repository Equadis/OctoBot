import {racialPassives,validRace} from './class-rules.mjs?v=20261112-audit1';
import {CONSUMABLE_BY_ID,consumablePassiveStats,consumableRestriction} from './consumables.mjs?v=20261112-consumes1';
import {BASE_STATS} from './base-stats.mjs?v=20261112-stats1';
import {BUFF_STATS,normaliseBuffs} from './buffs.mjs?v=20261112-stats1';
import {ENCHANTS} from './equipment-options.mjs?v=20261113-swaps1';
import {resolveTalentEffects} from './talent-effects.mjs?v=20261117-talent-audit2';
import {abilityEstimates} from './talent-calculations.mjs?v=20261117-talent-audit2';
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
  else if((m=text.match(/^Increases your chance to (dodge|parry) an attack by (\d+(?:\.\d+)?)%\.?$/i)))add(m[1].toLowerCase()==='dodge'?'dodge':'parry',+m[2]);
  else if((m=text.match(/^Restores (\d+) mana per 5 sec\.?$/i)))add('mp5',+m[1]);
  else if((m=text.match(/^\+(\d+) All Resistances\.?$/i)))for(const key of ['arcaneRes','fireRes','natureRes','frostRes','shadowRes'])add(key,+m[1]);
  else if((m=text.match(/damage and healing done by magical spells and effects by up to (\d+)/i)))add('sp',+m[1]);
  else if((m=text.match(/damage done by (Fire|Frost|Nature|Shadow|Arcane) spells and effects by up to (\d+)/i)))add(m[1].toLowerCase()+'Sp',+m[2]);
  else if((m=text.match(/(?:attack speed|haste) by (\d+(?:\.\d+)?)%/i)))add('haste',+m[1]);
  else if((m=text.match(/(?:ignore|ignores|reduces).*?(\d+) (?:of.*? )?(?:armor|armour)/i)))add('armorPen',+m[1]);
  else if((m=text.match(/(?:decreases|reduces).*?magical resistances.*?(\d+)/i)))add('spellPen',+m[1]);
 }
 return result;
}
function enchantStats(id){
 const scope=ENCHANTS.find(e=>e.id===id)?.rangedEffects;if(scope)return {...scope};
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
const auditedTalentSummary=audit=>({calculated:audit.details.filter(x=>x.status==='calculated').length,inactive:audit.details.filter(x=>x.status==='inactive').length,pending:audit.pending.length});
export function characterStats(build,talentData,gear={}){
 if(!validRace(build.classId,build.race))throw new Error('Invalid class/race combination.');
 const racial=racialPassives(build.race);
 const c=build.classId,level=build.level,base=BASE_STATS[`${build.race}:${c}`]?.[level-1];
 const s={str:base?.[0]??null,agi:base?.[1]??null,sta:base?.[2]??null,int:base?.[3]??null,spi:base?.[4]??null,health:0,mana:0,mp5:0,ap:0,sp:0,hit:0,crit:0,haste:0,spellHit:0,spellCrit:0,armorPen:0,spellPen:0,armour:0,defense:0,dodge:0,parry:0,weaponSkill:0,poisonChance:0,arcaneRes:0,fireRes:0,natureRes:0,frostRes:0,shadowRes:0,fortune:0,natureSp:0,fireSp:0,frostSp:0,shadowSp:0,arcaneSp:0};
 let haste=1;
 const add=values=>{for(const [key,value] of Object.entries(values)){if(key==='haste')haste*=1+value/100;else if(key in s&&s[key]!==null)s[key]+=value;}};
 let itemArmour=0,shieldArmour=0;
 for(const [slot,item] of Object.entries(gear)){
  const stats=passiveItemStats(item);itemArmour+=stats.armour||0;
  if(slot==='offhand'&&item?.classs===4&&item?.subclass===6)shieldArmour=stats.armour||0;
  add(stats);add(enchantStats(build.gear[slot]?.enchantId));
 }
 const buffs=normaliseBuffs(build.controls.buffIds);for(const id of buffs)add(BUFF_STATS[id]||{});
 const has=id=>buffs.includes(id);
 for(const id of build.controls.consumableIds||[]){const item=CONSUMABLE_BY_ID.get(id);if(!consumableRestriction(item,build))add(consumablePassiveStats(item));}
 const talents=new Map((talentData?.talents||[]).map(t=>[t.name,{...t,rank:build.talents[t.id]||0}]));
 const value=name=>{const t=talents.get(name);return t?.rank?Number(t.descriptions[t.rank-1]?.match(/(\d+(?:\.\d+)?)%?/)?.[1]||0):0;};
 const selected=name=>(talents.get(name)?.rank||0)>0;
 const mult=(key,percentage)=>{if(s[key]!==null)s[key]=Math.floor(s[key]*(1+percentage/100));};
 const audit=resolveTalentEffects(build,talentData,gear);
 if(audit.active){
  add(audit.flat);
  for(const [key,percentage] of Object.entries(audit.percent))mult(key,percentage);
  s.armour+=itemArmour*(audit.special.itemArmourPct||0)/100;
  s.armour+=shieldArmour*(audit.special.shieldArmourPct||0)/100;
  if(audit.special.meleeHastePct)haste*=1+audit.special.meleeHastePct/100;
  if(audit.special.feralPackCrit&&!has('pack'))s.crit+=audit.special.feralPackCrit;
 }
 if(!audit.active&&c==='paladin'){mult('str',value('Divine Strength'));mult('int',value('Divine Intellect'));s.hit+=value('Precision');s.spellHit+=value('Precision');}
 if(!audit.active&&c==='rogue'){s.crit+=value('Malice');s.hit+=value('Precision');s.dodge+=value('Lightning Reflexes');s.weaponSkill+=value('Weapon Expertise');s.poisonChance+=value('Improved Poisons');}
 if(!audit.active&&c==='warrior')s.crit+=value('Cruelty');
 if(!audit.active&&c==='hunter'){mult('agi',value('Lightning Reflexes'));s.crit+=value('Killer Instinct');}
 if(!audit.active&&c==='priest')mult('int',value('Mental Strength'));
 if(!audit.active&&c==='warlock'){mult('sta',value('Demonic Embrace'));mult('spi',-value('Demonic Embrace')/3);}
 if(!audit.active&&c==='shaman'){for(const k of ['str','agi','sta','int','spi'])mult(k,value('Ancestral Knowledge'));s.crit+=value('Thundering Strikes');}
 if(!audit.active&&c==='druid'){mult('int',value('Heart of the Wild'));if(build.classOptions.form==='Cat')mult('str',value('Heart of the Wild'));if(build.classOptions.form==='Bear')mult('sta',value('Heart of the Wild'));if(selected('Natural Weapons')){const t=talents.get('Natural Weapons');const text=t.descriptions[t.rank-1];s.hit+=Number(text.match(/melee attacks and spells by (\d+)%/)?.[1]||0);s.spellHit+=Number(text.match(/melee attacks and spells by (\d+)%/)?.[1]||0);}}
 if(has('kings'))for(const k of ['str','agi','sta','int','spi'])mult(k,10);
 if(racial.intellectMultiplier)mult('int',(racial.intellectMultiplier-1)*100);
 if(racial.agilityMultiplier)mult('agi',(racial.agilityMultiplier-1)*100);
 if(!audit.active){s.parry+=value('Deflection');s.defense+=value('Anticipation');}
 if(!audit.active)s.armour*=1+value('Toughness')/100+(c==='druid'?value('Thick Hide')/100:0);
 const [aps,apa,critAgi,dodgeAgi,critInt,baseCrit,baseSpellCrit]=COEFFICIENTS[c];
 let apBase=['warrior','paladin'].includes(c)?3*level-20:['rogue','hunter','shaman'].includes(c)?2*level-20:c==='druid'?-20:-10;
 let ap=base?apBase+s.str*aps+s.agi*apa+s.ap:null;
 if(c==='druid'&&build.classOptions.form==='Cat'&&base)ap=2*level-20+s.str*2+s.agi+s.ap;
 if(c==='druid'&&build.classOptions.form==='Bear'&&base)ap=3*level-20+s.str*2+s.ap;
 if(c==='hunter'&&!audit.active&&selected('Lightning Reflexes')&&base)ap+=s.agi*value('Lightning Reflexes')*10/100;
 if(audit.active&&ap!==null){ap+=s.agi*(audit.special.apFromAgiPct||0)/100;ap*=1+(audit.special.apPct||0)/100;}
 if(has('trueshot')&&ap!==null)ap*=1.03;
 if(c==='priest'&&!audit.active&&base)s.sp+=s.spi*value('Spiritual Guidance')/100;
 if(audit.active&&s.spi!==null)s.sp+=s.spi*(audit.special.spFromSpiritPct||0)/100;
 const health=base?(base[5]+s.health+Math.min(20,s.sta)+Math.max(0,s.sta-20)*10)*(racial.healthMultiplier||1)*(1+(audit.special.maxHealthPct||0)/100):null;
 let armour=base?s.armour+s.agi*2:null;
 if(c==='druid'&&base){
  const adjustedItemArmour=itemArmour*(1+(audit.special.itemArmourPct||0)/100);
  if(build.classOptions.form==='Bear')armour=audit.active?s.armour+adjustedItemArmour*((level>=40?4.6:2.8)-1)+s.agi*2:s.armour*(level>=40?4.6:2.8)+s.agi*2;
  if(build.classOptions.form==='Moonkin')armour=selected('Moonkin Form')?(audit.active?s.armour+adjustedItemArmour*(audit.special.formItemArmourPct||0)/100+s.agi*2:s.armour*(1+value('Moonkin Form')/100)+s.agi*2):null;
 }
 for(const name of ['Arcane','Fire','Nature','Frost','Shadow'])s[name.toLowerCase()+'Res']+=racial[name.toLowerCase()+'Resistance']||0;
 let spellCrit=level===60&&base?baseSpellCrit+s.int*critInt+s.spellCrit:null;
 if(c==='druid'&&build.classOptions.form==='Moonkin'&&selected('Moonkin Form')&&spellCrit!==null)spellCrit+=3;
 const parryClasses=['warrior','paladin','rogue','hunter','shaman'];
 const parry=parryClasses.includes(c)?5+s.parry+s.defense*.04:0;
 const dodge=level===60&&base?baseCrit+s.agi*dodgeAgi+s.dodge+s.defense*.04+(racial.dodge||0):null;
 const target=build.planning,targetDefense=target.targetLevel*5;
 const weaponSkill=slot=>{const weapon=gear[slot];const bonus=racial.meleeSkills?.[weapon?.subclass]||0;return level*5+s.weaponSkill+bonus+(audit.weapon[slot]?.skill||0);};
 const skills=['mainhand','offhand'].map(weaponSkill),delta=skills.map(skill=>Math.max(0,targetDefense-skill));
 const wsCrit=skills.map(skill=>(skill-level*5)*.04);
 const crit=skills.map((_,i)=>level===60&&base?baseCrit+s.agi*critAgi+s.crit+wsCrit[i]+(c==='warrior'&&build.classOptions.stance==='Berserker'?3:0)+(c==='rogue'&&!audit.active&&[4,15,13].includes(gear[i?'offhand':'mainhand']?.subclass)?value('Close Quarters Combat'):0)+(audit.weapon[i?'offhand':'mainhand']?.crit||0):null);
 const dual=Boolean(gear.mainhand?.classs===2&&gear.offhand?.classs===2),meleeHit=s.hit+(dual?(audit.special.dualWieldHit||0):0),miss=delta.map((d,i)=>clamp(5+d*.2+(dual?19:0)-meleeHit-(i?(audit.offhand.hit||0):0)));
 const yellow=clamp(5+delta[0]*.2-meleeHit),dodgeTarget=delta.map(d=>clamp(5+d*.1)),glance=delta.map(d=>clamp(95-d*2,0,95));
 const glanceChance=clamp(10+Math.max(0,target.targetLevel-level)*10,0,40);
 const cap=miss.map((m,i)=>clamp(100-m-dodgeTarget[i]-glanceChance));
 const effectiveCrit=crit.map((v,i)=>v===null?null:clamp(Math.min(cap[i],v-Math.max(0,target.targetLevel-level))));
 const levelDiff=target.targetLevel-level,baseSpellMiss=levelDiff<=2?4+levelDiff:17+(levelDiff-3)*11;
 const spellMiss=clamp(baseSpellMiss-s.spellHit,1,99);
 const targetArmour=Math.max(0,target.targetArmour+buffs.reduce((n,id)=>n+(BUFF_STATS[id]?.targetArmour||0),0)-s.armorPen);
 const targetArmours=['mainhand','offhand'].map(slot=>Math.max(0,targetArmour-(audit.weapon[slot]?.armorPen||0)));
 const mitigation=targetArmours.map(armour=>100*armour/(armour+400+85*level));
 const damage=slot=>{const weapon=gear[slot];if(!weapon||weapon.classs!==2)return {damage:'0-0',speed:'0.00'};const m=weapon.tooltipText?.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s+Damage/i);const speed=Number(weapon.speed||weapon.tooltipText?.match(/Speed\s+(\d+(?:\.\d+)?)/)?.[1]);if(!m||!speed||ap===null)return {damage:'—',speed:'—'};const extra=Number(ENCHANTS.find(e=>e.id===build.gear[slot]?.enchantId)?.name.match(/^\+(\d+) Weapon Damage/)?.[1]||0);const offhandBonus=audit.active?(audit.offhand.damagePct||0):(c==='rogue'?value('Dual Wield Specialization'):0);
  const scale=(slot==='offhand'?.5*(1+offhandBonus/100):1)*(1+((audit.weapon[slot]?.damagePct||0)+(audit.special.weaponDamagePct||0))/100);return {damage:`${Math.round((+m[1]+ap/14*speed+extra)*scale)}-${Math.round((+m[2]+ap/14*speed+extra)*scale)}`,speed:(speed/haste).toFixed(2)};};
 const weapons=['mainhand','offhand'].map(damage);
 const rangedSkill=level*5+(racial.rangedSkills?.[gear.ranged?.subclass]||0);
 const rangedCrit=level===60&&base?baseCrit+s.agi*critAgi+s.crit+(rangedSkill-level*5)*.04+(audit.ranged.crit||0):null;
 const rangedHit=s.hit+(audit.ranged.hit||0),rangedMiss=clamp(5+Math.max(0,targetDefense-rangedSkill)*.2-rangedHit);
 const equippedShield=gear.offhand?.classs===4&&gear.offhand?.subclass===6?gear.offhand:null;
 const shieldBlockBase=equippedShield?Number(equippedShield.block??equippedShield.attributes?.Block??equippedShield.tooltipText?.match(/(?:^|\n)\s*(\d+)\s+Block\b/i)?.[1]):NaN;
 const shieldBlock=Number.isFinite(shieldBlockBase)?shieldBlockBase*(1+(audit.special.shieldBlockValuePct||0)/100):null;
 const abilities=audit.active?abilityEstimates(c,audit,{spell:{missPct:spellMiss,critPct:spellCrit},heal:{critPct:spellCrit},melee:{missPct:yellow,critPct:crit[0]},ranged:{missPct:clamp(5+Math.max(0,targetDefense-rangedSkill)*.2-s.hit),critPct:rangedCrit===null?null:rangedCrit-(audit.ranged.crit||0)}},build):[];
 const groups=[];const group=(name,rows)=>groups.push({name,rows:rows.map(([label,value,note])=>({label,value,note}))});
 group('Base Stats',[['Strength',num(s.str)],['Agility',num(s.agi)],['Stamina',num(s.sta)],...(!['warrior','rogue'].includes(c)?[['Intellect',num(s.int)],['Spirit',num(s.spi)]]:[])]);
 group('Melee',[
 ['Wep Skill',pair(skills.map(num))],['Damage',pair(weapons.map(w=>w.damage))],['Speed',pair(weapons.map(w=>w.speed))],['Power',num(ap)],['Hit Rating',pct(meleeHit,0)],['WS Crit',sameOrPair(wsCrit.map(n=>'+'+pct(n,2)))],['Crit Chance',sameOrPair(crit.map(n=>pct(n,2)))],['Haste',pct((haste-1)*100)],['Armor Pen',sameOrPair(['mainhand','offhand'].map(slot=>num(s.armorPen+(audit.weapon[slot]?.armorPen||0))))],['Poison Chance','+'+pct(s.poisonChance,0)],['Poison Crit',pct(spellCrit,2)]
 ]);
 if(audit.active&&c==='hunter')group('Ranged',[
  ['Weapon Skill',num(rangedSkill)],['Hit',pct(rangedHit,0)],['Crit Chance',pct(rangedCrit,2),'Existing level-60 reference crit coefficient, with ranged-only talent bonus; live formula unverified.'],['Miss vs Target',pct(rangedMiss,1)],['Ranged Damage Multiplier','×'+(1+(audit.ranged.damagePct||0)/100).toFixed(3),'Relative ranged talent contribution, not weapon or shot damage.'],['Ranged Talent Haste',pct(audit.ranged.hastePct||0,1)]
 ]);
 group('Melee vs Target',[
 ['Miss %',pair(miss.map(n=>pct(n)))],['Yellow Miss %',pct(yellow)],['Dodge %',pair(dodgeTarget.map(n=>pct(n)))],['Spell Miss %',pct(spellMiss)],['Poison Resist %',pct(target.targetNatureRes?null:spellMiss),'Against zero Nature resistance; additional resistance modelling is pending.'],['Glance Dmg',pair(glance.map(n=>pct(n,0)))],['Crit Cap',pair(cap.map(n=>pct(n)))],['Eff. Crit',pair(effectiveCrit.map(n=>pct(n,2)))],['Armour',sameOrPair(targetArmours.map(num))],['Phys Reduced',sameOrPair(mitigation.map(n=>pct(n)))]
 ]);
 group('Defence',[
 ['Health',num(health)],...(!['warrior','rogue'].includes(c)?[['Mana',num(base?base[6]+s.mana+Math.min(20,s.int)+Math.max(0,s.int-20)*15:null)],['Mana / 5s',num(s.mp5)]]:[]),['Parry %',pct(parry)],['Dodge %',pct(dodge)],['Armour',num(armour)],...(audit.active&&equippedShield?[['Talent Block Chance Bonus',pct(audit.special.blockChance||0,0)],['Shield Item Block Contribution',num(shieldBlock),'Only the shield item’s block value, not a verified full block formula.']]:[]),...['Arcane','Fire','Nature','Frost','Shadow'].map(name=>[name+' Res',num(s[name.toLowerCase()+'Res'])])
 ]);
 group('Spell',[
 ['Spell Power',num(s.sp)],['Spell Hit',pct(s.spellHit,0)],['Spell Pen',num(s.spellPen)],['Spell Crit',pct(spellCrit,2)],['Fortune',pct(s.fortune,0),'Flat Fortune bonuses only. Proc and server-specific Fortune conversions have not been verified.'],...['Nature','Fire','Frost','Shadow','Arcane'].filter(name=>s[name.toLowerCase()+'Sp']).map(name=>[name+' Power',num(s.sp+s[name.toLowerCase()+'Sp'])])
 ]);
 if(audit.active){
  const fmt=(stat,n)=>{
   if(/Seconds$/i.test(stat))return Number(n.toFixed(2))+' s';
   if(/Minutes$/i.test(stat))return Number(n.toFixed(2))+' min';
   if(/Yards$/i.test(stat))return Number(n.toFixed(2))+' yd';
   if(/Points$|skill$|^allRes$|^armorPen$|^armour$|^maxRage$|^maxEnergy$/i.test(stat))return num(n);
   return /crit|hit|pct|haste|chance|speed|damage|healing|block|effectiveness/i.test(stat)?pct(n,Number.isInteger(n)?0:1):num(n);
  };
  const scoped=[];
  for(const [school,stats] of Object.entries(audit.spell)){
   for(const [stat,value] of Object.entries(stats)){
    scoped.push([school+' '+stat,fmt(stat,value),'Talent contribution only; not included in global spell stats.']);
    if(stat==='hit')scoped.push([school+' Estimated Spell Miss',pct(clamp(baseSpellMiss-s.spellHit-value,1,99),1),'Uses the shared target-level miss baseline. Actual spell-family resistance mechanics remain unverified.']);
    if(stat==='crit'&&spellCrit!==null)scoped.push([school+' Estimated Spell Crit',pct(spellCrit+value,2),'General spell crit baseline plus this scoped bonus; not an independent server measurement.']);
   }
  }
  for(const [stat,value] of Object.entries(audit.ranged))scoped.push(['Ranged '+stat,fmt(stat,value),'Ranged weapon bonus, not melee.']);
  for(const [stat,value] of Object.entries(audit.pet))scoped.push(['Pet '+stat,fmt(stat,value),'Pet-only bonus; excluded from the player character stats.']);
  for(const [label,value] of Object.entries(audit.scoped))scoped.push([label,fmt(label,value),'Ability-specific or conditional bonus; not used as a general combat statistic.']);
  for(const [stat,key] of [['Maximum Rage','maxRage'],['Maximum Energy','maxEnergy'],['Block Chance','blockChance'],['Shield Block Value','shieldBlockValuePct'],['Healing from Item Armour','healingFromItemArmourPct']]){
   if(audit.special[key]){
    const val=key==='healingFromItemArmourPct'?itemArmour*audit.special[key]/100:audit.special[key];
    scoped.push([stat,fmt(key==='healingFromItemArmourPct'?'healingPowerPoints':key,val),key==='healingFromItemArmourPct'?'Based on the equipped item Armour only; excludes temporary armour bonuses.':'Talent contribution, not a complete resource or spell calculation.']);
   }
  }
  const regen=(audit.scoped['Mana regeneration while casting regenPct']||0)+(audit.scoped['Mana regeneration while casting extraRegenPct']||0);
  if(regen)scoped.push(['Natural Mana Regeneration While Casting',pct(regen,0),'Percentage of natural regeneration; actual spirit-based mana per five seconds is not yet verified.']);
  if(audit.special.maxHealthPct)scoped.push(['Maximum Health Bonus',pct(audit.special.maxHealthPct,0),'Applied to the displayed health estimate.']);
  if(c==='warrior')scoped.push(['Rage Capacity',num(100+(audit.special.maxRage||0)),'Base capacity plus selected passive talent.']);
  if(c==='rogue')scoped.push(['Energy Capacity',num(100+(audit.special.maxEnergy||0)),'Base capacity plus selected passive talent.']);
  if(audit.special.damageTakenReductionPct)scoped.push(['Incoming Damage Multiplier (talent)','×'+(1-audit.special.damageTakenReductionPct/100).toFixed(3),'Only the active talent condition; not a full mitigation calculation.']);
  if(audit.special.physicalDamageTakenReductionPct)scoped.push(['Physical Damage Taken Multiplier (talent)','×'+(1-audit.special.physicalDamageTakenReductionPct/100).toFixed(3),'Only the active form talent, excluding armour and other reductions.']);
  for(const hand of ['mainhand','offhand'])if(audit.weapon[hand]?.rangeYards)scoped.push([hand==='mainhand'?'Main-hand Melee Range Bonus':'Off-hand Melee Range Bonus',audit.weapon[hand].rangeYards+' yd','Weapon-specific bonus; base melee range not verified.']);
  if(scoped.length)group('Talent Scope Bonuses',scoped);
  const calculated=[];
  for(const a of abilities){
   const v=a.values,m=a.modifiers,n=a.profile.name,note='Talent-adjusted relative calculation: '+[...new Set(a.matched.map(x=>x.talent))].join(', ')+'. Existing hit/crit baseline is a reference estimate; no unverified ability base damage or cost has been invented.';
   const addRow=(label,value)=>calculated.push([n+' — '+label,value,note]);
   if(v.hitBonusPct&&v.missPct!==null)addRow('Miss',pct(v.missPct,1));
   if(v.critBonusPct&&v.critPct!==null)addRow('Crit',pct(v.critPct,2));
   if(v.damageFactor!==1)addRow('Damage','×'+v.damageFactor.toFixed(3));
   if(v.healingFactor!==1)addRow('Healing','×'+v.healingFactor.toFixed(3));
   if(v.manaFactor!==1)addRow('Mana cost','×'+v.manaFactor.toFixed(3));
   if(v.castTimeReductionSeconds)addRow('Cast time reduction',v.castTimeReductionSeconds+' s');
   if(v.castFactor!==1)addRow('Cast time multiplier','×'+v.castFactor.toFixed(4));
   if(v.cooldownReductionSeconds)addRow('Cooldown reduction',v.cooldownReductionSeconds+' s');
   if(m.cooldownReductionPct)addRow('Cooldown multiplier','×'+(1-m.cooldownReductionPct/100).toFixed(3));
   if(v.criticalBonusFactor!==1&&!['periodic','heal-periodic','utility'].includes(a.profile.type))addRow('Critical damage bonus','×'+v.criticalBonusFactor.toFixed(3));
   if(m.rageCostReduction||m.rageEnergyCostReduction)addRow('Rage cost reduction',num((m.rageCostReduction||0)+(m.rageEnergyCostReduction||0)));
   if(m.energyCostReduction||m.rageEnergyCostReduction)addRow('Energy cost reduction',num((m.energyCostReduction||0)+(m.rageEnergyCostReduction||0)));
   if(m.globalCooldownReductionSeconds)addRow('GCD reduction',m.globalCooldownReductionSeconds+' s');
   if(m.durationIncreaseSeconds)addRow('Duration increase',m.durationIncreaseSeconds+' s');
   if(m.durationPct)addRow('Duration multiplier','×'+(1+m.durationPct/100).toFixed(3));
   if(m.absorbPct)addRow('Absorb multiplier','×'+(1+m.absorbPct/100).toFixed(3));
   if(m.manaRefundPct)addRow('Conditional mana refund',pct(m.manaRefundPct,0));
   if(v.resistReductionPct)addRow('Resistance chance reduction',pct(v.resistReductionPct,1));
   if(v.rangeBonusYards)addRow('Range increase',v.rangeBonusYards+' yd');
   if(v.rangeFactor!==1)addRow('Range multiplier','×'+v.rangeFactor.toFixed(3));
   if(v.threatFactor!==1)addRow('Threat multiplier','×'+v.threatFactor.toFixed(3));
   if(v.hasteFactor!==1)addRow('Attack speed multiplier','×'+v.hasteFactor.toFixed(3));
  }
  if(calculated.length)group('Calculated Ability Modifiers',calculated);
  if(Object.keys(audit.pet).length){
   const petRows=[],p=audit.pet;
   const row=(n,v,note)=>petRows.push([n,v,note||'Talent contribution only; pet base stats and exact inheritance are not live-verified.']);
   if(p.staminaFromOwnerPct&&s.sta!==null)row('Owner Stamina Contribution',num(s.sta*p.staminaFromOwnerPct/100));
   if(p.intellectFromOwnerPct&&s.int!==null)row('Owner Intellect Contribution',num(s.int*p.intellectFromOwnerPct/100));
   if(p.armourFromOwnerPct)row('Owner Armour Contribution',num(armour===null?null:armour*p.armourFromOwnerPct/100),'Applies published percentage to estimated total owner armour, not pet base armour; live inheritance unverified.');
   if(p.ownerHitCritInheritancePct){row('Inherited Hit Bonus',pct(s.spellHit*p.ownerHitCritInheritancePct/100,2),'Global owner spell hit only. School- or family-specific hit is not inherited.');if(spellCrit!==null)row('Inherited Crit Chance',pct(spellCrit*p.ownerHitCritInheritancePct/100,2));}
   if(p.hit||p.ownerHitCritInheritancePct)row('Total Pet Talent Hit Contribution',pct((p.hit||0)+s.spellHit*(p.ownerHitCritInheritancePct||0)/100,2));
   if(p.crit||p.ownerHitCritInheritancePct)row('Total Pet Talent Crit Contribution',pct(p.ownerHitCritInheritancePct&&spellCrit===null?null:(p.crit||0)+(spellCrit||0)*(p.ownerHitCritInheritancePct||0)/100,2));
   const referenceAP=build.classOptions?.referenceRangedAP;
   if(referenceAP>0&&p.attackPowerFromOwnerRangedPct)row('Pet AP from Reference Ranged AP',num(referenceAP*p.attackPowerFromOwnerRangedPct/100),'Based on explicitly entered reference ranged AP, not an independently verified ranged AP calculation.');
   if(referenceAP>0&&p.spellPowerFromOwnerRangedPct)row('Pet SP from Reference Ranged AP',num(referenceAP*p.spellPowerFromOwnerRangedPct/100),'Based on explicitly entered reference ranged AP.');
   if(p.ownerAndPetHealthRegenPctPer5s&&health!==null)row('Owner Health per 5s',num(health*p.ownerAndPetHealthRegenPctPer5s/100));
   if(p.spellCrit)row('Pet Talent Spell Crit Bonus',pct(p.spellCrit,2));
   if(p.spellHit)row('Pet Talent Spell Hit Bonus',pct(p.spellHit,2));
   if(p.damagePct)row('Pet Damage Multiplier','×'+(1+p.damagePct/100).toFixed(3));
   if(petRows.length)group('Calculated Pet Contributions',petRows);
  }
  const inactive=audit.details.filter(e=>e.status==='inactive');
  if(inactive.length)group('Inactive Talent Conditions',inactive.map(e=>[e.name+' '+e.stat,'Inactive',e.note]));
  const pending=[...new Map(audit.pending.map(x=>[x.name,x])).values()];
  if(pending.length)group('Awaiting Simulation',pending.map(e=>[e.name,'Not calculated',e.note]));
 }
 return {groups,abilityEstimates:abilities,talentAudit:audit.active?{classId:c,selected:auditedTalentSummary(audit)}:null,sourceNote:'Planning estimates: Vanilla base attributes and level-60 coefficients; Combat Gum reference buffs and target table. Reviewed static and relative ability talent calculations are included where scoped; damage/cost/timing baselines, stacking, and live server mechanics remain unverified. Temporary effects require combat validation; published OctoWoW tooltips do not prove live server mechanics. A dash means unavailable, not zero.'};
}
