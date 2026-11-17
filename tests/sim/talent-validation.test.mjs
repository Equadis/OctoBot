import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild,validateBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
import {validateTalents,maximiseTalent} from '../../docs/sim/core/talents.mjs';
import {CLASS_RACES} from '../../docs/sim/core/class-rules.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {resolveTalentEffects,auditClass,auditRules} from '../../docs/sim/core/talent-effects.mjs';
import {abilityProfiles,calculateAbilityTalentEffects} from '../../docs/sim/core/talent-calculations.mjs';
const cls=auditClass(),rules=auditRules(),data=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+cls+'.json',import.meta.url)));
const weapon=subclass=>({classs:2,subclass,speed:2,tooltipText:'10 - 20 Damage\nSpeed 2.00',attributes:{}});
const shield={classs:4,subclass:6,tooltipText:'100 Armor\n40 Block',attributes:{Armour:100}};
const sub={axe:0,mace:4,sword:7,dagger:15,fist:13,polearm:6,twohand:8,onehand:7,'twohand-sword-mace-axe':8,'expertise-weapons':7};
const pet={hunter:'Cat',warlock:'Imp'};
const t=name=>{const found=data.talents.find(t=>t.name===name);assert.ok(found,name);return found;};
const build=(name,rank)=>{const b=newBuild(cls);b.talents[t(name).id]=rank;return b;};
const rec=(b,g={})=>resolveTalentEffects(b,data,g);
const calc=(b,name,base={},g={})=>{const p=abilityProfiles(cls).find(x=>x.name===name);assert.ok(p,name);return calculateAbilityTalentEffects(rec(b,g),p,base);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,'actual '+a+' expected '+b);
const rows=(b,g={})=>Object.fromEntries(characterStats(b,data,g).groups.map(x=>[x.name,Object.fromEntries(x.rows.map(r=>[r.label,r.value]))]));
// Independent client-data cross-check: AdeTalents/Data/<CLASS>.lua (12 Nov
// 2026 dataset, https://octowow.st/git/Ade/AdeTalents). These selected
// vectors were transcribed from the public rank fixtures, not generated
// from the planner rule registry. Tooltip evidence, not live combat.
const clientVectors={
 warrior:[['Improved Thunder Clap',0,[1,2,4]],['Improved Thunder Clap',1,[20,40,60]],['Master of Arms',1,[1.2,2.4,3.6,4.8,6]],['Dual Wield Specialization',1,[2,4,6,8,10]]],
 paladin:[['Healing Light',0,[4,8,12]],['Shield Specialization',0,[10,20,30]],['Righteous Defense',0,[3,6,10]],['Improved Righteous Fury',0,[25,50,75]]],
 rogue:[['Blade Rush',0,[2,5]],['Aggression',0,[3,6,10]],['Weapon Expertise',0,[3,5]],['Improved Ambush',1,[5,10,15]]],
 druid:[['Open Wounds',0,[5,10,15]],['Open Wounds',1,[10,20,30]],['Predatory Strikes',0,[3,6,10]],['Feral Swiftness',1,[2,4]]],
 shaman:[['Elemental Devastation',0,[1,2,3]],['Elemental Devastation',1,[3,6,9]],['Improved Fire Totems',2,[10,20]],['Improved Fire Totems',3,[5,10]],['Call of Thunder',0,[1,2,3,4,6]]],
 hunter:[['Surefooted',0,[1,2,3]],['Surefooted',1,[1,2,3]],['Killer Instinct',1,[7,14,20]],['Trap Mastery',2,[4,7,10]]],
 mage:[['Arcane Meditation',0,[7,14,20]],['Arcane Potency',0,[50,100]]],
 warlock:[['Demonic Precision',0,[1,2,3]],['Demonic Precision',1,[30,60,90]],['Master Demonologist',3,[12,24,36,48,60]],['Master Demonologist',4,[2,4,6,8,10]]],
 priest:[['Empowered Recovery',0,[3,6]],['Spiritual Guidance',0,[5,10,15,20,25]],['Spiritual Healing',0,[6,12,18,24,30]]]
};
test('selected independent client rank vectors agree with current imported calculator snapshot',()=>{
 for(const [name,param,expected] of clientVectors[cls])assert.deepEqual(t(name).rankParameters[param],expected,name+' param '+param);
});
test('all numeric rules resolve every rank with matching explicit conditions, gear and buff sources',()=>{
 let checks=0;
 for(const talent of data.talents){
  for(const rule of rules[talent.id]){
   if(rule.kind==='pending')continue;
   for(let rank=1;rank<=talent.maxRanks;rank++){
    const b=build(talent.name,rank),g={};
    if(rule.kind==='weapon')g.mainhand=weapon(sub[rule.weapon]);
    if(rule.kind==='offhand'){g.mainhand=weapon(7);g.offhand=weapon(7);}
    if(rule.kind==='pet')b.classOptions.pet=pet[cls];
    if(rule.kind==='buff')b.controls.buffIds=[rule.source];
    if(rule.perOption)b.classOptions[rule.perOption]=2;
    for(const [k,expected] of Object.entries(rule.when||{})){
     if(k==='shield'){if(expected)g.offhand=shield;continue;}
     if(k==='dualWield'){if(expected){g.mainhand=weapon(7);g.offhand=weapon(7);}continue;}
     b.classOptions[k]=Array.isArray(expected)?expected[0]:expected;
    }
    const amount=(rule.values?.[rank-1]??talent.rankParameters[rule.param??0][rank-1])*(rule.factor??1)*(rule.perLevel?60:1)*(rule.perOption?2:1);
    const a=rec(b,g);
    assert.ok(a.details.some(d=>d.name===talent.name&&d.stat===rule.stat&&d.status==='calculated'&&Math.abs(d.amount-amount)<1e-7),talent.name+' rank '+rank+' '+rule.stat);
    // In case a scope has no named ability, keep it mapped but explicitly
    // measure its application status rather than inventing a damage result.
    assert.ok(Number.isFinite(amount));checks++;
    if(rule.perOption){b.classOptions[rule.perOption]=0;assert.ok(rec(b,g).details.some(d=>d.name===talent.name&&d.stat===rule.stat&&d.status==='inactive'),talent.name+' zero count');}
   }
  }
  const b=build(talent.name,0),zero=rec(b);
  assert.equal(zero.details.length,0);assert.equal(zero.pending.length,0);
 }
 assert.ok(checks>0);
});
test('legal per-tree allocations round-trip via saved build at 10, 30 and 60 on each supported race',()=>{
 for(const race of CLASS_RACES[cls])for(const level of [10,30,60])for(const tree of data.trees){
  const start=newBuild(cls);start.race=race;start.level=level;
  const ordered=[...data.talents].sort((a,b)=>(a.tree===tree.index?0:1)-(b.tree===tree.index?0:1)||a.row-b.row||a.position-b.position);
  for(let pass=0;pass<2;pass++)for(const talent of ordered)start.talents=maximiseTalent(data,start.talents,talent.id,level);
  assert.deepEqual(validateTalents(data,start.talents,level),[]);
  const valid=validateBuild(start,data),round=decodeBuild(encodeBuild(valid),data);
  assert.deepEqual(round.talents,valid.talents);
  const sheet=characterStats(round,data);
  assert.ok(sheet.talentAudit);
  for(const group of sheet.groups)for(const row of group.rows)assert.ok(!/NaN|Infinity/.test(row.value),cls+' '+race+' '+level+' '+row.label);
 }
});
test('ability estimates cannot claim periodic crit without an established periodic critical model',()=>{
 const audit={active:true,abilityEffects:[{kind:'spell',scope:'Shadow',name:'Crit talent',stat:'crit',amount:10},{kind:'spell',scope:'Shadow',name:'Damage talent',stat:'damagePct',amount:20}]};
 const p={name:'Test DoT',type:'periodic',tags:['Shadow']};
 const x=calculateAbilityTalentEffects(audit,p,{damage:100,critPct:10,criticalBonus:.5});
 near(x.values.damage,120);assert.equal(x.values.critPct,null);assert.equal(x.values.criticalBonus,null);
});
if(cls==='warrior'){
 test('shield block amount is read from a real multiline item tooltip and only multiplied when equipped',()=>{
  const b=build('Toughness',5);
  assert.equal(rows(b,{offhand:shield}).Defence['Shield Item Block Contribution'],'46');
  assert.equal(rows(b).Defence['Shield Item Block Contribution'],undefined);
 });
}
if(cls==='paladin'){
 test('Sanctity applies to Holy Seal/Judgement damage only when selected; Improved Righteous Fury is not always active',()=>{
  const b=build('Sanctity Aura',1);
  near(calc(b,'Judgement of Righteousness',{damage:100}).values.damage,100);
  b.classOptions.aura='Sanctity Aura';near(calc(b,'Judgement of Righteousness',{damage:100}).values.damage,110);
  const rf=build('Improved Righteous Fury',3);assert.equal(rec(rf).scoped['Righteous Fury threatPct'],undefined);rf.classOptions.righteousFury='On';assert.equal(rec(rf).scoped['Righteous Fury threatPct'],75);
 });
}
if(cls==='rogue'){
 test('proc chance and non-crit refund are scoped without granting unconditional combo points/Energy',()=>{
  assert.equal(calc(build('Improved Backstab',3),'Backstab').modifiers.extraComboPointChancePct,45);
  const b=build('Improved Ambush',3);assert.equal(calc(b,'Ambush',{energyCost:60}).values.energyCost,60);assert.equal(calc(b,'Ambush').modifiers.energyRefundOnNonCrit,15);
 });
}
if(cls==='druid'){
 test('own active bleed counts at every rank affect Claw, but not Rip damage',()=>{
  for(let r=1;r<=3;r++){const b=build('Open Wounds',r);b.classOptions.form='Cat';b.classOptions.activeBleeds=3;near(calc(b,'Claw',{damage:100}).values.damage,100+30*r);near(calc(b,'Rip',{damage:100}).values.damage,100+5*r);}
 });
}
if(cls==='shaman'){
 test('Searing Totem interval and range use their own rank vectors, and Fire damage affects totem not healing',()=>{
  const b=build('Improved Fire Totems',2);const x=calc(b,'Searing Totem',{attackInterval:2,rangeYards:20});near(x.values.attackInterval,2/1.2);near(x.values.rangeYards,30);
  const flame=build('Call of Flame',3);near(calc(flame,'Searing Totem',{damage:100}).values.damage,115);near(calc(flame,'Healing Wave',{healing:100}).values.healing,100);
 });
}
if(cls==='hunter'){
 test('Trap Mastery reduces trap resistance at all ranks without changing ordinary shots',()=>{
  for(const [rank,amount] of [[1,4],[2,7],[3,10]]){const b=build('Trap Mastery',rank);assert.equal(calc(b,'Freezing Trap',{resistPct:20}).values.resistPct,20-amount);assert.equal(calc(b,'Aimed Shot',{resistPct:20}).values.resistPct,20);}
 });
}
if(cls==='mage'){
 test('Wand Specialization uses its wand-only damage and hit, not melee or spell stats',()=>{
  const b=build('Wand Specialization',2);
  near(calc(b,'Wand attack',{damage:100,missPct:20}).values.damage,125);near(calc(b,'Wand attack',{missPct:20}).values.missPct,10);
  near(calc(b,'Fireball',{damage:100,missPct:20}).values.damage,100);assert.equal(rec(b).flat.hit,undefined);
 });
}
if(cls==='warlock'){
 test('Greater demon bonus is spell-crit only and changes when demon selected',()=>{
  const b=build('Master Demonologist',5);assert.equal(rec(b).flat.spellCrit,undefined);
  b.classOptions.pet='Felguard';assert.equal(rec(b).flat.spellCrit,10);assert.equal(rec(b).pet.spellCrit,10);assert.equal(rec(b).pet.crit,undefined);
  b.classOptions.pet='Felhunter';assert.equal(rec(b).flat.spellCrit,undefined);assert.equal(rec(b).flat.fireRes,60);
 });
}
if(cls==='priest'){
 test('Mental Agility applies to instant Shadow Word: Death, Psychic Scream and Fade, not Shadow cast spells',()=>{
  const b=build('Mental Agility',5);
  for(const name of ['Shadow Word: Death','Psychic Scream','Fade'])near(calc(b,name,{manaCost:100}).values.manaCost,90);
  near(calc(b,'Mind Blast',{manaCost:100}).values.manaCost,100);
 });
}
