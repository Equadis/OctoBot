import {resolveBuffEffects} from './buff-effect-audit.mjs?v=20261117-buff-audit4';
import {racialPassives,validRace} from './class-rules.mjs?v=20261117-racial-audit1';
import {petProfile} from './pet-audit.mjs?v=20261117-pet-audit3';
import {petContextAudit} from './pet-context-audit.mjs?v=20261117-pet-audit3';
import {racialEventAudit} from './racial-event-audit.mjs?v=20261117-racial-audit2';
import {CONSUMABLE_BY_ID,consumablePassiveStats,consumableRestriction} from './consumables.mjs?v=20261117-buff-audit4';
import {baseStatProfile,racialAttributeEstimate} from './base-stat-audit.mjs?v=20261117-racial-audit1';
import {BUFF_STATS,normaliseBuffs} from './buffs.mjs?v=20261117-buff-audit4';
import {ENCHANTS,validEnchant} from './equipment-options.mjs?v=20261117-item-audit3';
import {equipmentItemAudit,equipmentSetAudit,weaponSkillBonus} from './item-effects.mjs?v=20261117-item-audit3';
import {combineScopedEquipment} from './equipment-scopes.mjs?v=20261117-item-audit3';
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
export const passiveItemStats=(item,build={})=>equipmentItemAudit(item,build).stats;
export function enchantStats(id){return {...(ENCHANTS.find(e=>e.id===id)?.effects||{})};}
export function characterStats(build,talentData,gear={}){
 if(!validRace(build.classId,build.race))throw new Error('Invalid class/race combination.');
 const racial=racialPassives(build.race);
 const c=build.classId,level=build.level,baseAudit=baseStatProfile(build.race,c,level),base=baseAudit.row;
 const s={str:base?.[0]??null,agi:base?.[1]??null,sta:base?.[2]??null,int:base?.[3]??null,spi:base?.[4]??null,health:0,mana:0,mp5:0,ap:0,sp:0,hit:0,crit:0,haste:0,spellHit:0,spellCrit:0,armorPen:0,spellPen:0,armour:0,defense:0,dodge:0,parry:0,weaponSkill:0,poisonChance:0,arcaneRes:0,fireRes:0,natureRes:0,frostRes:0,shadowRes:0,fortune:0,natureSp:0,fireSp:0,frostSp:0,shadowSp:0,arcaneSp:0,holySp:0,healingPower:0,hp5:0,blockValue:0,blockChance:0,rangedAP:0,rangedHit:0,rangedCrit:0,rangedDamage:0,rangedHaste:0,castingRegenPct:0,critDamageTakenReductionPct:0,dotDamageTakenReductionPct:0,weaponDamage:0,damageOnlySp:0,castSpeedPct:0,spellDamageTakenReductionPct:0,spellDamageTakenReductionFlat:0,aoeDamageTakenReductionPct:0,silenceResistPct:0,interruptDurationReductionPct:0,runSpeedPct:0,swimSpeedPct:0,mountSpeedPct:0};
 let haste=1,rangedHaste=1;const skillBonuses={};const unresolvedEquipment=[],scopedEquipment=[];
 const add=values=>{for(const [key,value] of Object.entries(values)){if(key==='haste')haste*=1+value/100;else if(key==='rangedHaste')rangedHaste*=1+value/100;else if(key.startsWith('weaponSkill:'))skillBonuses[key]=(skillBonuses[key]||0)+value;else if(key in s&&s[key]!==null)s[key]+=value;}};
 for(const [slot,item] of Object.entries(gear)){const audit=equipmentItemAudit(item,build);add(audit.stats);for(const effect of audit.effects)if(effect.status==='scoped')scopedEquipment.push({...effect,source:item.name||slot});else if(!['passive','empty'].includes(effect.status)&&!(effect.condition==='druid-form'&&c==='druid'&&['Cat','Bear','Moonkin'].includes(build.classOptions?.form)))unresolvedEquipment.push({item:item.name||slot,...effect});const id=build.gear[slot]?.enchantId;if(id&&validEnchant(id,slot,c,item,level)){const {weaponDamage:handDamage,...enchantVector}=enchantStats(id);add(enchantVector);if(!Object.keys(enchantStats(id)).length&&!/weapon damage/i.test(ENCHANTS.find(e=>e.id===id)?.name||''))unresolvedEquipment.push({item:item.name||slot,raw:ENCHANTS.find(e=>e.id===id)?.name,status:'unmapped enchant'});}}
 const setAudit=equipmentSetAudit(gear,build);add(setAudit.stats);
 for(const e of setAudit.active)if(e.status==='scoped')scopedEquipment.push({...e,source:e.set+' ('+e.pieces+'pc)'});
 // Pet scopes are gated after companion eligibility has been established.
 const rawItemArmour=s.armour;
 const buffAudit=resolveBuffEffects(build,gear);const buffs=buffAudit.ids;add(buffAudit.weaponMasteryStats);for(const entry of buffAudit.entries)if(entry.active)add(entry.stats);
 const has=id=>buffs.includes(id);
 for(const entry of buffAudit.consumables)if(entry.status==='prepull')add(entry.stats);
 // Imported base values already appear to include the naked Gnome/Human racial modifier.
 // Apply it once to external flat contributions before class and Kings multipliers.
 for(const [key,i,multiplier] of [['int',3,racial.intellectMultiplier],['spi',4,racial.spiritMultiplier],['agi',1,racial.agilityMultiplier]])if(multiplier&&base)s[key]=racialAttributeEstimate(s[key],base[i],multiplier,baseAudit.includedRacialAttributes.includes(key));
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
 if(buffAudit.entries.some(e=>e.id==='kings'&&e.active))for(const k of ['str','agi','sta','int','spi'])mult(k,10);

 s.parry+=value('Deflection');s.defense+=value('Anticipation');
 const nonItemArmour=s.armour-rawItemArmour;
 const improvedItemArmour=rawItemArmour*(1+value('Toughness')/100+(c==='druid'?value('Thick Hide')/100:0));
 s.armour=improvedItemArmour+nonItemArmour;
 const [aps,apa,critAgi,dodgeAgi,critInt,baseCrit,baseSpellCrit]=COEFFICIENTS[c];
 let apBase=['warrior','paladin'].includes(c)?3*level-20:['rogue','hunter','shaman'].includes(c)?2*level-20:c==='druid'?-20:-10;
 let ap=base?apBase+s.str*aps+s.agi*apa+s.ap:null;
 if(c==='druid'&&build.classOptions.form==='Cat'&&base)ap=2*level-20+s.str*2+s.agi+s.ap;
 if(c==='druid'&&build.classOptions.form==='Bear'&&base)ap=3*level-20+s.str*2+s.ap;
 if(c==='hunter'&&selected('Lightning Reflexes')&&base)ap+=s.agi*value('Lightning Reflexes')*10/100;
 // Trueshot uses the explicitly selected database vector, not the conflicting reference multiplier.
 if(c==='priest'&&base)s.sp+=s.spi*value('Spiritual Guidance')/100;
 const health=base?(base[5]+s.health+Math.min(20,s.sta)+Math.max(0,s.sta-20)*10)*(racial.healthMultiplier||1):null;
 let armour=base?s.armour+s.agi*2:null;
 if(c==='druid'&&base){
  if(build.classOptions.form==='Bear')armour=improvedItemArmour*(level>=40?4.6:2.8)+nonItemArmour+s.agi*2;
  if(build.classOptions.form==='Moonkin')armour=selected('Moonkin Form')?improvedItemArmour*(1+value('Moonkin Form')/100)+nonItemArmour+s.agi*2:null;
 }
 for(const name of ['Arcane','Fire','Nature','Frost','Shadow'])s[name.toLowerCase()+'Res']+=racial[name.toLowerCase()+'Resistance']||0;
 let spellCrit=level===60&&base?baseSpellCrit+s.int*critInt+s.spellCrit:null;
 if(c==='druid'&&build.classOptions.form==='Moonkin'&&selected('Moonkin Form')&&spellCrit!==null)spellCrit+=3;
 const parryClasses=['warrior','paladin','rogue','hunter','shaman'];
 const parry=parryClasses.includes(c)?5+s.parry+s.defense*.04:0;
 const dodge=level===60&&base?baseCrit+s.agi*dodgeAgi+s.dodge+s.defense*.04+(racial.dodge||0):null;
 const target=build.planning,targetDefense=target.targetLevel*5;
 const weaponSkill=slot=>{const weapon=gear[slot];const bonus=weapon?.classs===2?(racial.meleeSkills?.[weapon.subclass]||0):0;return level*5+(weapon?.classs===2?s.weaponSkill+bonus+weaponSkillBonus(skillBonuses,weapon):0);};
 const skills=['mainhand','offhand'].map(weaponSkill),delta=skills.map(skill=>targetDefense-skill);
 const wsCrit=skills.map(skill=>(skill-level*5)*.04);
 const crit=skills.map((_,i)=>level===60&&base?baseCrit+s.agi*critAgi+s.crit+wsCrit[i]+(c==='warrior'&&build.classOptions.stance==='Berserker'?3:0)+(c==='rogue'&&[4,15,13].includes(gear[i?'offhand':'mainhand']?.subclass)?value('Close Quarters Combat'):0):null);
 const dual=Boolean(gear.offhand?.classs===2),miss=delta.map(d=>clamp(5+d*.2+(dual?19:0)-s.hit));
 const yellow=clamp(5+delta[0]*.2-s.hit),dodgeTarget=delta.map(d=>clamp(5+Math.max(0,d)*.1)),glance=delta.map(d=>clamp(95-Math.max(0,d)*2,0,95));
 // Developer-confirmed miss formula: 5 - 0.2 * (skill - target defence). Other attack-table formulas remain reference only.
 const glanceChance=clamp(10+Math.max(0,target.targetLevel-level)*10,0,40);
 const cap=miss.map((m,i)=>clamp(100-m-dodgeTarget[i]-glanceChance));
 const effectiveCrit=crit.map((v,i)=>v===null?null:clamp(Math.min(cap[i],v-Math.max(0,target.targetLevel-level))));
 const levelDiff=target.targetLevel-level,baseSpellMiss=levelDiff<=2?4+levelDiff:17+(levelDiff-3)*11;
 const spellMiss=clamp(baseSpellMiss-s.spellHit,1,99);
 const targetArmour=Math.max(0,target.targetArmour+buffAudit.entries.reduce((n,e)=>n+(e.active?e.stats.targetArmour||0:0),0)-s.armorPen);
 const mitigation=100*targetArmour/(targetArmour+400+85*level);
 const damage=slot=>{const weapon=gear[slot];if(!weapon||weapon.classs!==2)return {damage:'0-0',speed:'0.00'};const m=weapon.tooltipText?.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s+Damage/i);const speed=Number(weapon.speed||weapon.tooltipText?.match(/Speed\s+(\d+(?:\.\d+)?)/)?.[1]);if(!m||!speed||ap===null)return {damage:'—',speed:'—'};const enchantId=build.gear[slot]?.enchantId;const extra=s.weaponDamage+(validEnchant(enchantId,slot,c,weapon,level)?(enchantStats(enchantId).weaponDamage||0):0);const scale=slot==='offhand'?.5*(1+(c==='rogue'?value('Dual Wield Specialization')/100:0)):1;return {damage:`${Math.round((+m[1]+ap/14*speed+extra)*scale)}-${Math.round((+m[2]+ap/14*speed+extra)*scale)}`,speed:(speed/haste).toFixed(2)};};
 const weapons=['mainhand','offhand'].map(damage);
 const racialEvents=racialEventAudit(build.race);
 const petAudit=petProfile(build,talentData,{stamina:s.sta,intellect:s.int,itemArmour:rawItemArmour,spellHit:s.spellHit,spellCrit,rangedAP:build.classOptions?.observedRangedAP,fireSpellPower:s.sp+s.damageOnlySp+s.fireSp,shadowSpellPower:s.sp+s.damageOnlySp+s.shadowSp});
 const scoped=combineScopedEquipment(scopedEquipment,petAudit&&!petAudit.active?{...build,classOptions:{...build.classOptions,pet:'None'}}:build);
 const petContext=petContextAudit(build,petAudit,scoped,gear,buffAudit);
 const groups=[];const group=(name,rows)=>groups.push({name,rows:rows.map(([label,value,note])=>({label,value,note}))});
 if(baseAudit.status!=='reference-only')group('Base Stat Audit',[['Source status',baseAudit.status,baseAudit.issues.join(' ')]]);
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
 const extraDef=[];
 if(s.hp5)extraDef.push(['Health / 5s',num(s.hp5)]);
 const shield=gear.offhand?.classs===4&&gear.offhand?.subclass===6?gear.offhand:null;
 if(shield){const block=Number(shield.block??shield.attributes?.Block??shield.tooltipText?.match(/(?:^|\n)\s*(\d+)\s+Block\b/i)?.[1]);extraDef.push(['Shield Block Value',num(Number.isFinite(block)?block+s.blockValue:null),'Item block only; strength and ruleset-dependent base block formulas not verified.'],['Equipment Block Chance',pct(s.blockChance,1)]);}
 if(s.critDamageTakenReductionPct)extraDef.push(['Item Critical Damage Reduction',pct(s.critDamageTakenReductionPct,1)]);
 if(s.dotDamageTakenReductionPct)extraDef.push(['Item Periodic Damage Reduction',pct(s.dotDamageTakenReductionPct,1)]);
 for(const [label,key] of [['Spell Damage Reduction','spellDamageTakenReductionPct'],['Area Damage Reduction','aoeDamageTakenReductionPct'],['Silence Resistance','silenceResistPct'],['Interrupt Duration Reduction','interruptDurationReductionPct']])if(s[key])extraDef.push([label,pct(s[key],1),'Equipment contribution only; combination and effective mitigation not live-verified.']);
 if(s.spellDamageTakenReductionFlat)extraDef.push(['Flat Spell Damage Reduction',num(s.spellDamageTakenReductionFlat)]);
 if(extraDef.length)group('Equipment Defence',extraDef);
 const speedRows=[];for(const [label,key] of [['Run Speed','runSpeedPct'],['Swim Speed','swimSpeedPct'],['Mount Speed','mountSpeedPct']])if(s[key])speedRows.push([label,pct(s[key],1)]);if(speedRows.length)group('Equipment Movement Bonuses',speedRows);
 if(c==='hunter'||s.rangedAP||s.rangedHit||s.rangedCrit||s.rangedDamage||rangedHaste!==1){const rows=[['Ranged Weapon Skill',gear.ranged?.classs===2&&[2,3,16,18].includes(gear.ranged.subclass)?num(level*5+(racial.rangedSkills?.[gear.ranged.subclass]||0)+weaponSkillBonus(skillBonuses,gear.ranged)):'—','Skill contribution only; ranged attack table pending.'],['Ranged-specific AP Bonus',num(s.rangedAP)],['Ranged-only Hit Bonus',pct(s.rangedHit,1)],['Ranged-only Crit Bonus',pct(s.rangedCrit,1)],['Ranged-only Haste',pct((rangedHaste-1)*100,1)],['Scope Damage',num(s.rangedDamage)]];const ammo=gear.ammo;const ranged=gear.ranged;if(ammo&&ranged?.classs===2&&[2,3,18].includes(ranged.subclass)&&ammo.subclass===(ranged.subclass===3?3:2)){const dps=Number(ammo.ammunitionDps??ammo.tooltipText?.match(/Adds ([0-9.]+) damage per second/)?.[1]);rows.push(['Ammunition DPS',Number.isFinite(dps)?String(dps):'—']);}group('Ranged Equipment Contributions',rows);}
 group('Spell',[
 ['Spell Power',num(s.sp+s.damageOnlySp)],...(s.healingPower||s.damageOnlySp?[['Healing Power',num(s.sp+s.healingPower)]]:[]),...(s.castSpeedPct?[['Item Casting Speed',pct(s.castSpeedPct,1)]]:[]),...(s.castingRegenPct?[['Natural Mana Regen While Casting (items)',pct(s.castingRegenPct,1)]]:[]),['Spell Hit',pct(s.spellHit,0)],['Spell Pen',num(s.spellPen)],['Spell Crit',pct(spellCrit,2)],['Fortune',pct(s.fortune,0),'Flat Fortune bonuses only. Proc and server-specific Fortune conversions have not been verified.'],...['Nature','Fire','Frost','Shadow','Arcane','Holy'].filter(name=>s[name.toLowerCase()+'Sp']).map(name=>[name+' Power',num(s.sp+s.damageOnlySp+s[name.toLowerCase()+'Sp'])])
 ]);
 if(petAudit){const rows=[['Selected companion',petAudit.pet],['Status',petAudit.status,petAudit.issues.join(' ')]];if(petAudit.active){rows.push(['Pet level',num(petAudit.level)],['Base Health / Armour / AP','—','No verified OctoWoW companion table.']);}for(const m of petAudit.contributions)rows.push([m.label,Number.isFinite(m.amount)?String(Number(m.amount.toFixed(2)))+(m.unit||''):'—',m.note]);for(const m of petAudit.events)rows.push([m.name,'Conditional / not simulated',m.note]);group('Pet and Demon Contributions',rows);if(petAudit.abilityCandidates?.length)group('Pet Ability Candidates (not trained)',petAudit.abilityCandidates.map(a=>[a.name,a.maxCandidateRank===null?'Rank unknown':a.maxCandidateRank===0?'Below reference level':'Up to rank '+a.maxCandidateRank,[a.rankStatus,a.focus!==undefined?a.focus+' Focus':null,a.cooldownSeconds!==undefined?a.cooldownSeconds+'s cooldown':null,'Actual learned rank and damage are unverified.'].filter(Boolean).join('; ')]));}
 if(petContext&&petAudit.active){const rows=petContext.equipment.filter(m=>m.active).map(m=>[m.label,String(m.amount)+m.unit,m.sources.join(', ')+'; '+m.note]);if(petContext.happiness)rows.push(['Happiness (Classic reference)',petContext.happiness.referenceDamageMultiplier===null?'Unknown':String(petContext.happiness.referenceDamageMultiplier*100)+'%', 'Selected mood; not applied to actual pet damage.']);if(petContext.avoidance)rows.push(['Raid damage avoidance','Unverified',petContext.avoidance.note]);if(petContext.directBuffs.candidates.length)rows.push(['Direct pet buffs','Unverified',petContext.directBuffs.candidates.map(e=>e.name).join(', ')+'; owner aura selection does not grant a pet aura.']);for(const e of petContext.events)rows.push([e.name,'On-use / not simulated',e.note]);if(rows.length)group('Pet Equipment and Encounter Context',rows);}
 if(racialEvents.length)group('Racial Combat Effects (not simulated)',racialEvents.map(e=>[e.name,e.kind==='target-conditional'?'Conditional':'Activated / not simulated',e.note+' Source: '+e.source]));
 if(setAudit.active.length)group('Active Set Bonuses',setAudit.active.map(x=>[x.set+' ('+x.pieces+' pc)',x.status==='passive'?'Applied':x.status==='scoped'?'Scoped contribution':x.status==='utility'?'Utility (unquantified)':'Not simulated',x.effect]));
 if(scoped.length)group('Scoped Equipment Modifiers',scoped.map(x=>[x.scope+' — '+x.stat+(x.condition?.target?' ('+x.condition.target+')':''),String(Number(x.amount.toFixed(3)))+(x.stat.endsWith('Pct')?'%':'')+(x.active?'':' (inactive)'),[...new Set(x.sources)].join(', ')+'; relative contribution only.']));
 if(unresolvedEquipment.length||setAudit.unresolved.length)group('Uncalculated Equipment Effects',[...unresolvedEquipment.map(x=>[x.item,x.status,x.raw]),...setAudit.unresolved.map(x=>[x.set||x.item,'Unverified set',x.reason])]);
 const targetMods={};for(const e of buffAudit.entries)if(e.active)for(const [k,v] of Object.entries(e.stats))if(k.startsWith('target')&&k!=='targetArmour')targetMods[k]=(targetMods[k]||0)+v;
 const consumableScoped=buffAudit.consumables.flatMap(e=>(e.modifiers||[]).map(m=>[e.name+' — '+m.scope+': '+m.stat,String(m.amount)+(m.stat.endsWith('Pct')?'%':''),e.reason]));
 if(consumableScoped.length)group('Scoped Consumable Modifiers',consumableScoped);
 const rawResRows=['Arcane','Fire','Frost','Nature','Shadow'].filter(n=>targetMods['target'+n+'Res']).map(n=>[n+' Resistance (raw)',num(target['target'+n+'Res']+targetMods['target'+n+'Res']),'Target resistance plus selected debuffs, before any ruleset-specific floor, penetration or level-based resistance.']);
 if(rawResRows.length)group('Target Resistance Estimates',rawResRows);
 if(Object.keys(targetMods).length)group('Target Debuff Contributions',Object.entries(targetMods).map(([k,v])=>[k,String(v)+(k.endsWith('Pct')?'%':''),'Scoped target contribution; not applied to player stats or final damage.']));
 if(buffAudit.entries.some(e=>e.status!=='source-prepull')||buffAudit.consumables.some(e=>e.status!=='prepull'))group('Buff and Consumable Audit',[...buffAudit.entries.filter(e=>e.status!=='source-prepull').map(e=>[e.name,e.active?e.status:e.eventEligible?'Event — not simulated':'Inactive',e.reason]),...buffAudit.consumables.filter(e=>e.status!=='prepull').map(e=>[e.name,e.status,e.reason])]);
 return {groups,baseAudit,buffAudit,racialEvents,petAudit,petContext,equipmentAudit:{unresolved:unresolvedEquipment,setAudit,scoped},sourceNote:'Planning estimates: Vanilla base attributes and level-60 coefficients; Imported item tooltip prepull effects and explicitly labelled reference buffs/target table. Recognised passive effects enter the sheet; scoped modifiers remain separate, with unknown combat baselines and event-dependent effects excluded. OctoWoW server formulas are not yet verified. A dash means unavailable, not zero.'};
}
