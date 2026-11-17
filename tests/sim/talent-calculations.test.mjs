import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {resolveTalentEffects,auditClass} from '../../docs/sim/core/talent-effects.mjs';
import {abilityProfiles,calculateAbilityTalentEffects,abilityEstimates} from '../../docs/sim/core/talent-calculations.mjs';
const cls=auditClass(),data=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+cls+'.json',import.meta.url)));
const build=()=>newBuild(cls);
function ranks(b,selected){for(const [name,rank] of Object.entries(selected)){const t=data.talents.find(t=>t.name===name);assert.ok(t,name);b.talents[t.id]=rank;}return b;}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,'actual '+a+', expected '+b);
const rec=(b,g={})=>resolveTalentEffects(b,data,g);
const calc=(b,name,baseline={},g={})=>{const p=abilityProfiles(cls).find(p=>p.name===name);assert.ok(p,name);return calculateAbilityTalentEffects(rec(b,g),p,baseline);};
const sheet=(b,g={})=>Object.fromEntries(characterStats(b,data,g).groups.map(x=>[x.name,Object.fromEntries(x.rows.map(r=>[r.label,r.value]))]));
const weapon=subclass=>({classs:2,subclass,speed:2,tooltipText:'10 - 20 Damage\nSpeed 2.00',attributes:{}});
test('ability profiles have unique names, explicit tags and recognised attack types',()=>{
 const p=abilityProfiles(cls);assert.ok(p.length>0);assert.equal(new Set(p.map(x=>x.name)).size,p.length);
 for(const x of p){assert.ok(x.tags.includes(x.name));assert.ok(['spell','heal','melee','ranged','periodic','heal-periodic','utility','unknown'].includes(x.type));}
});
test('one rule matching two tags counts once, reductions clamp and absent baselines stay null',()=>{
 const audit={active:true,abilityEffects:[{name:'Example rank effect',kind:'spell',scope:['Fire','Fire Blast'],stat:'damagePct',amount:10},{name:'Other talent',kind:'scoped',scope:'Fire Blast',stat:'damagePct',amount:5},{name:'Reduction',kind:'scoped',scope:'Fire Blast',stat:'castTimeReductionSeconds',amount:5}]};
 const p={name:'Fire Blast',type:'spell',tags:['Fire','Fire Blast']};
 const x=calculateAbilityTalentEffects(audit,p,{damage:100,castSeconds:3});
 approx(x.values.damage,115);assert.equal(x.values.castSeconds,0);assert.equal(x.values.manaCost,null);assert.equal(x.values.critPct,null);
 assert.equal(x.matched.length,3);
});
test('school damage and critical damage bonuses cannot inflate healing',()=>{
 const audit={active:true,abilityEffects:[{name:'Damage school bonus',kind:'spell',scope:'Nature',stat:'damagePct',amount:10},{name:'Damage crit bonus',kind:'spell',scope:'Nature',stat:'criticalDamagePct',amount:100}]};
 const x=calculateAbilityTalentEffects(audit,{name:'Heal',type:'heal',tags:['Nature','Heal']},{healing:100});
 assert.equal(x.values.healing,100);assert.equal(x.values.criticalBonusFactor,1);
});
if(cls==='warrior'){
 test('Dual Wield Specialization max rank grants exactly 10 off-hand hit, not 25',()=>{
  const b=ranks(build(),{'Dual Wield Specialization':5}),g={mainhand:weapon(7),offhand:weapon(7)};
  assert.equal(rec(b,g).offhand.hit,10);assert.equal(rec(b,g).offhand.damagePct,25);
  assert.equal(rec(b,{}).offhand.hit,undefined);
 });
 test('Heroic Strike Rage and Slam timing are actually transformed',()=>{
  const b=ranks(build(),{'Improved Heroic Strike':3,'Improved Slam':2});
  assert.equal(calc(b,'Heroic Strike',{rageCost:15}).values.rageCost,12);
  const s=calc(b,'Slam',{castSeconds:1.5,gcdSeconds:1.5}).values;approx(s.castSeconds,1);approx(s.gcdSeconds,1);
 });
}
if(cls==='paladin'){
 test('Righteous Defense is gated by the selected Righteous Fury scenario',()=>{
  const b=ranks(build(),{'Righteous Defense':3});
  assert.equal(rec(b).special.damageTakenReductionPct,undefined);b.classOptions.righteousFury='On';assert.equal(rec(b).special.damageTakenReductionPct,10);
 });
 test('Healing Light adjusts heals, not Holy Shock damage, and Benediction reduces Judgement mana',()=>{
  const b=ranks(build(),{'Healing Light':3,'Benediction':5});
  approx(calc(b,'Holy Shock (healing)',{healing:100}).values.healing,112);
  approx(calc(b,'Holy Shock (damage)',{damage:100}).values.damage,100);
  approx(calc(b,'Judgement',{manaCost:100}).values.manaCost,85);
 });
 test('Shield Specialization enhances the equipped shield contribution, not armour',()=>{
  const b=ranks(build(),{'Shield Specialization':3}),g={offhand:{classs:4,subclass:6,attributes:{Armour:100,Block:40}}};
  assert.equal(rec(b,g).special.shieldBlockValuePct,30);
  assert.equal(rec(b,{}).special.shieldBlockValuePct,undefined);
  assert.equal(sheet(b,g).Defence['Shield Item Block Contribution'],'52');
 });
}
if(cls==='rogue'){
 test('Opportunity and Murder are inactive until specific context is selected; Backstab crit remains melee-scoped',()=>{
  const b=ranks(build(),{'Opportunity':5,'Murder':2,'Improved Backstab':3});
  const base={damage:100,critPct:12};
  approx(calc(b,'Backstab',base).values.damage,100);
  b.classOptions.attackPosition='Behind';b.classOptions.targetCreature='Humanoid';
  const x=calc(b,'Backstab',base);approx(x.values.damage,117);approx(x.values.critPct,42);
  approx(calc(b,'Sinister Strike',base).values.damage,102);
  assert.equal(rec(b).flat.spellCrit,undefined);
 });
}
if(cls==='druid'){
 test('Improved Moonfire and Moonfury combine; form-specific Moonkin mana effect is conditional',()=>{
  const b=ranks(build(),{'Improved Moonfire':2,'Moonfury':3,'Moonkin Form':1});
  const base={damage:100,critPct:10,manaCost:100};
  approx(calc(b,'Moonfire',base).values.damage,122);approx(calc(b,'Moonfire',base).values.critPct,20);
  assert.equal(calc(b,'Wrath',base).values.manaCost,100);
  b.classOptions.form='Moonkin';approx(calc(b,'Wrath',base).values.manaCost,80);
  assert.equal(rec(b).special.formItemArmourPct,180);
 });
 test('Open Wounds multiplies only the selected own-bleed count, not every physical attack',()=>{
  const b=ranks(build(),{'Natural Weapons':3,'Predatory Strikes':3,'Open Wounds':3});
  b.classOptions.form='Cat';approx(calc(b,'Claw',{damage:100}).values.damage,130);
  b.classOptions.activeBleeds=2;approx(calc(b,'Claw',{damage:100}).values.damage,190);
  approx(calc(b,'Shred',{damage:100}).values.damage,110);
 });
}
if(cls==='shaman'){
 test('Elemental Devastation scenario adds 9 spell hit to the ability only, never melee or resting sheet',()=>{
  const b=ranks(build(),{'Elemental Devastation':3});
  assert.equal(rec(b).flat.hit,3);assert.equal(rec(b).flat.spellHit,3);
  approx(calc(b,'Lightning Bolt',{missPct:14}).values.missPct,14);
  b.classOptions.elementalDevastationProc='Active';approx(calc(b,'Lightning Bolt',{missPct:14}).values.missPct,5);
  assert.equal(rec(b).flat.spellHit,3);assert.equal(calc(b,'Stormstrike',{missPct:14}).values.missPct,14);
 });
 test('Fire and general elemental spell damage accumulate and do not inflate heals',()=>{
  const b=ranks(build(),{'Concussion':5,'Call of Flame':3,'Elemental Fury':2,'Tidal Mastery':5,'Call of Thunder':5});
  approx(calc(b,'Flame Shock',{damage:100,criticalBonus:.5}).values.damage,130);
  approx(calc(b,'Flame Shock',{criticalBonus:.5}).values.criticalBonus,1);
  approx(calc(b,'Lightning Bolt',{critPct:10}).values.critPct,21);
  const h=calc(b,'Healing Wave',{healing:100,critPct:10});
  approx(h.values.healing,100);approx(h.values.critPct,15);
 });
}
if(cls==='hunter'){
 test('Ranged crit rules and dual wield hit do not leak or double count',()=>{
  const b=ranks(build(),{'Lethal Shots':5,'Killer Instinct':3,'Surefooted':3});
  const g={mainhand:weapon(7),offhand:weapon(7),ranged:weapon(2)};
  const c=rec(b,g);assert.equal(c.flat.crit,3);assert.equal(c.ranged.crit,5);
  assert.equal(c.flat.hit,3);assert.equal(c.special.dualWieldHit,3);
  const r=sheet(b,g);assert.equal(r.Melee['Hit Rating'],'6%');assert.equal(r.Ranged.Hit,'3%');
 });
 test('No-pet damage and ranged specialization combine, then no-pet bonus disappears',()=>{
  const b=ranks(build(),{'Alone Against the World':2,'Ranged Weapon Specialization':5});
  approx(calc(b,'Aimed Shot',{damage:100}).values.damage,116);
  b.classOptions.pet='Cat';approx(calc(b,'Aimed Shot',{damage:100}).values.damage,110);
 });
 test('Spirit Bond uses explicit reference ranged AP, not the owner melee AP',()=>{
  const b=ranks(build(),{'Spirit Bond':2});
  b.classOptions.pet='Cat';b.classOptions.referenceRangedAP=800;
  const r=sheet(b)['Calculated Pet Contributions'];
  assert.equal(r['Pet AP from Reference Ranged AP'],'200');assert.equal(r['Pet SP from Reference Ranged AP'],'120');
 });
}
if(cls==='mage'){
 test('Fire Blast combines school and ability crit, and Fire/Frost hit does not affect Arcane',()=>{
  const b=ranks(build(),{'Critical Mass':3,'Incinerate':2,'Elemental Precision':3,'Fire Power':5,'Improved Fireball':5});
  const base={missPct:17,critPct:10,damage:100,castSeconds:3.5};
  const x=calc(b,'Fire Blast',base);approx(x.values.critPct,20);approx(x.values.missPct,11);approx(x.values.damage,110);
  approx(calc(b,'Fireball',base).values.castSeconds,3);
  approx(calc(b,'Arcane Missiles',base).values.missPct,17);
 });
 test('Arcane Meditation low-mana scenario triples only the natural casting regeneration percentage',()=>{
  const b=ranks(build(),{'Arcane Meditation':3});assert.equal(sheet(b)['Talent Scope Bonuses']['Natural Mana Regeneration While Casting'],'20%');
  b.classOptions.lowMana='Yes';assert.equal(sheet(b)['Talent Scope Bonuses']['Natural Mana Regeneration While Casting'],'60%');
 });
}
if(cls==='warlock'){
 test('Suppression is Affliction-only; Destruction crit combines with Searing Pain',()=>{
  const b=ranks(build(),{'Suppression':5,'Devastation':5,'Improved Searing Pain':5});
  approx(calc(b,'Drain Life',{missPct:17}).values.missPct,7);approx(calc(b,'Shadow Bolt',{missPct:17}).values.missPct,17);
  approx(calc(b,'Searing Pain',{critPct:10}).values.critPct,25);
 });
 test('Soul Siphon is capped at four active effects and Rapid Deterioration is six percent haste at both ranks',()=>{
  const b=ranks(build(),{'Soul Siphon':3,'Rapid Deterioration':2});
  approx(calc(b,'Drain Soul',{damage:100}).values.damage,100);
  b.classOptions.afflictionEffects=4;approx(calc(b,'Drain Soul',{damage:100}).values.damage,124);
  b.classOptions.afflictionEffects=9;approx(calc(b,'Drain Soul',{damage:100}).values.damage,124);
  approx(calc(b,'Drain Soul',{castSeconds:2}).values.castSeconds,2/1.06);
 });
}
if(cls==='priest'){
 test('Offensive Holy crit and healing crit are different, and shield absorb talents combine',()=>{
  const b=ranks(build(),{'Force of Will':5,'Divinity':5,'Improved Power Word: Shield':3,'Piercing Light':3});
  approx(calc(b,'Smite',{critPct:10,missPct:17}).values.critPct,20);
  approx(calc(b,'Smite',{missPct:17}).values.missPct,11);
  approx(calc(b,'Greater Heal',{critPct:10}).values.critPct,15);
  approx(calc(b,'Power Word: Shield',{absorb:100}).values.absorb,135);
 });
 test('Empowered Recovery grants three seconds at both ranks and gated healing',()=>{
  const b=ranks(build(),{'Empowered Recovery':2});
  approx(calc(b,'Renew',{durationSeconds:15}).values.durationSeconds,18);
  approx(calc(b,'Greater Heal',{healing:100}).values.healing,100);
  b.classOptions.targetRenew='On';approx(calc(b,'Greater Heal',{healing:100}).values.healing,106);
 });
}
