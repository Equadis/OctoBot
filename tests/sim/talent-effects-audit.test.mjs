import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {auditClass,auditCoverage,auditRules,resolveTalentEffects} from '../../docs/sim/core/talent-effects.mjs';

const cls=auditClass();
const data=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+cls+'.json',import.meta.url)));
const coverage=auditCoverage(),rules=auditRules();
const build=()=>newBuild(cls);
const rows=(b,gear={})=>Object.fromEntries(characterStats(b,data,gear).groups.map(g=>[g.name,Object.fromEntries(g.rows.map(r=>[r.label,r.value]))]));
const row=(b,group,key,gear)=>rows(b,gear)[group]?.[key];
const talent=name=>{const x=data.talents.find(t=>t.name===name);assert.ok(x,name);return x;};
const rank=(b,name,n)=>{const t=talent(name);b.talents[t.id]=n??t.maxRanks;return b;};
const near=(actual,expected,epsilon=.07)=>assert.ok(Math.abs(actual-expected)<=epsilon,'expected '+expected+', got '+actual);

test('every imported talent has an explicit audit record, including non-sheet mechanics',()=>{
 assert.equal(Object.keys(coverage).length,data.talents.length);
 assert.deepEqual(Object.keys(coverage).map(Number).sort((a,b)=>a-b),data.talents.map(t=>t.id).sort((a,b)=>a-b));
 for(const t of data.talents){
  assert.ok(coverage[t.id].status,'unclassified '+t.name);
  assert.ok(coverage[t.id].note,'missing rationale '+t.name);
 }
});
test('every mapped rank source exists; no implicit tooltip-first-percentage scraping',()=>{
 for(const t of data.talents){
  for(const rule of rules[t.id]||[]){
   assert.ok(['global','percent','special','offhand','weapon','ranged','spell','pet','scoped','buff','pending'].includes(rule.kind));
   if(rule.kind==='pending')continue;
   for(let r=1;r<=t.maxRanks;r++){
    const value=rule.values?.[r-1]??t.rankParameters?.[rule.param??0]?.[r-1];
    assert.ok(Number.isFinite(value),'missing '+t.name+' rank '+r);
   }
  }
 }
});
test('all mapped talents evaluate at rank 0, first rank, intermediate rank and maximum rank',()=>{
 for(const t of data.talents){
  if(!(rules[t.id]||[]).length)continue;
  for(const rankValue of new Set([0,1,Math.ceil(t.maxRanks/2),t.maxRanks])){
   const b=build();if(rankValue)b.talents[t.id]=rankValue;
   const result=resolveTalentEffects(b,data,{});
   assert.ok(result.active); assert.equal(result.pending.some(p=>!p.name),false);
   assert.ok(Number.isFinite(result.flat.hit||0));
   const sheet=characterStats(b,data,{});
   assert.ok(sheet.groups.some(g=>g.name==='Spell'));
  }
 }
});
test('no feature from a different class branch alters another class',()=>{
 const other=cls==='warrior'?'rogue':'warrior';
 const b=newBuild(other);
 const sheet=characterStats(b,JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+other+'.json',import.meta.url))));
 assert.equal(sheet.talentAudit,null);
});

const weapon=(subclass)=>({classs:2,subclass,speed:2,tooltipText:'10 - 20 Damage\\nSpeed 2.00',attributes:{}});
if(cls==='warrior'){
 test('Master of Arms axes grant per-weapon crit and maces grant level-scaled armour penetration',()=>{
  const b=rank(build(),'Master of Arms',5);
  const axe={mainhand:weapon(0)};const mace={mainhand:weapon(4)};
  near(parseFloat(row(b,'Melee','Crit Chance',axe))-parseFloat(row(build(),'Melee','Crit Chance',axe)),5);
  const pen=rows(b,mace).Melee['Armor Pen'];
  assert.match(pen,/360/,'mace penetration must scale by 60 character levels');
  assert.equal(rows(b,axe).Melee['Armor Pen'],'0');
 });
 test('dual wield specialization affects offhand miss and damage only',()=>{
  const b=rank(build(),'Dual Wield Specialization',5),g={mainhand:weapon(7),offhand:weapon(7)};
  const before=rows(build(),g),after=rows(b,g);
  assert.ok(parseFloat(after['Melee vs Target']['Miss %'].split(' | ')[1])<parseFloat(before['Melee vs Target']['Miss %'].split(' | ')[1]));
  assert.equal(after['Melee vs Target']['Miss %'].split(' | ')[0],before['Melee vs Target']['Miss %'].split(' | ')[0]);
 });
 test('Flurry is not always-on haste',()=>{const b=rank(build(),'Flurry');assert.equal(row(b,'Melee','Haste'),'0.0%');assert.ok(rows(b)['Awaiting Simulation'].Flurry);});
}
if(cls==='paladin'){
 test('Strength, melee crit and melee/spell hit are distinct',()=>{
  const b=build(),base=rows(b);rank(b,'Divine Strength',5);rank(b,'Conviction',5);rank(b,'Precision',3);
  const r=rows(b);
  assert.ok(+r['Base Stats'].Strength>+base['Base Stats'].Strength);
  near(parseFloat(r.Melee['Crit Chance'])-parseFloat(base.Melee['Crit Chance']),5);
  assert.equal(r.Melee['Hit Rating'],'3%');assert.equal(r.Spell['Spell Hit'],'3%');
 });
}
if(cls==='rogue'){
 test('Blade Rush gives passive melee haste but leaves Energy ticks pending',()=>{
  const b=rank(build(),'Blade Rush',2);
  assert.equal(row(b,'Melee','Haste'),'5.0%');
  assert.ok(rows(b)['Awaiting Simulation']['Blade Rush']);
 });
 test('Serrated Blades armour penetration is static, bleed damage scoped',()=>{
  const b=rank(build(),'Serrated Blades',3),r=rows(b);
  assert.equal(r.Melee['Armor Pen'],'300');
  assert.ok(r['Talent Scope Bonuses']['Rupture/Garrote damagePct']);
 });
}
if(cls==='druid'){
 test('Feral Swiftness dodge applies in animal forms but not Humanoid',()=>{
  const b=rank(build(),'Feral Swiftness',2);
  const human=parseFloat(row(b,'Defence','Dodge %'));
  b.classOptions.form='Cat';
  near(parseFloat(row(b,'Defence','Dodge %'))-human,4);
 });
 test('Natural Weapons grants independent permanent melee and spell hit',()=>{
  const b=rank(build(),'Natural Weapons',3);
  assert.equal(row(b,'Melee','Hit Rating'),'3%');
  assert.equal(row(b,'Spell','Spell Hit'),'3%');
 });
}
if(cls==='shaman'){
 test('Elemental Devastation gives passive +3 hit in both categories but not proc +9',()=>{
  const b=rank(build(),'Elemental Devastation',3),r=rows(b);
  assert.equal(r.Melee['Hit Rating'],'3%');
  assert.equal(r.Spell['Spell Hit'],'3%');
  assert.ok(r['Awaiting Simulation']['Elemental Devastation']);
 });
 test('Ancestral Guardian applies item armour and dodge independently',()=>{
  const b=rank(build(),'Ancestral Guardian',3),g={chest:{classs:4,subclass:4,attributes:{Armour:100}}};
  near(+row(b,'Defence','Armour',g)- +row(build(),'Defence','Armour',g),15,.01);
  near(parseFloat(row(b,'Defence','Dodge %',g))-parseFloat(row(build(),'Defence','Dodge %',g)),6);
 });
 test('Flurry never inflates passive haste',()=>{const b=rank(build(),'Flurry');assert.equal(row(b,'Melee','Haste'),'0.0%');});
}
if(cls==='hunter'){
 test('Lethal Shots and pet Ferocity cannot leak into melee crit',()=>{
  const b=rank(build(),'Lethal Shots',5),base=rows(build()),r=rows(b);
  assert.equal(r.Melee['Crit Chance'],base.Melee['Crit Chance']);
  assert.equal(r['Talent Scope Bonuses']['Ranged crit'],'5%');
  rank(b,'Ferocity',5);assert.equal(rows(b)['Talent Scope Bonuses']['Pet crit'],undefined);
  b.classOptions.pet='Cat';assert.equal(rows(b)['Talent Scope Bonuses']['Pet crit'],'15%');
 });
 test('Survivalist increases displayed health without changing Stamina',()=>{
  const b=rank(build(),'Survivalist',5);
  assert.equal(row(b,'Base Stats','Stamina'),row(build(),'Base Stats','Stamina'));
  assert.ok(+row(b,'Defence','Health')>+row(build(),'Defence','Health'));
 });
}
if(cls==='mage'){
 test('Arcane Focus reduces only the Arcane estimate, not global Spell Hit',()=>{
  const b=rank(build(),'Arcane Focus',5),r=rows(b);
  assert.equal(r.Spell['Spell Hit'],'0%');
  assert.equal(r['Talent Scope Bonuses']['Arcane hit'],'10%');
  assert.equal(r['Talent Scope Bonuses']['Arcane Estimated Spell Miss'],'7.0%');
 });
}
if(cls==='warlock'){
 test('Suppression is Affliction-specific and does not increase blanket hit',()=>{
  const b=rank(build(),'Suppression',5),r=rows(b);
  assert.equal(r.Spell['Spell Hit'],'0%');
  assert.equal(r['Talent Scope Bonuses']['Affliction hit'],'10%');
 });
 test('Demonic Embrace modifies Stamina and Spirit in opposite directions',()=>{
  const b=rank(build(),'Demonic Embrace',5),r=rows(b),base=rows(build());
  assert.ok(+r['Base Stats'].Stamina>+base['Base Stats'].Stamina);
  assert.ok(+r['Base Stats'].Spirit<+base['Base Stats'].Spirit);
 });
}
if(cls==='priest'){
 test('Spirit of Redemption has a passive Spirit bonus, separate from death proc',()=>{
  const b=rank(build(),'Spirit of Redemption',1),r=rows(b);
  assert.ok(+r['Base Stats'].Spirit>+rows(build())['Base Stats'].Spirit);
  assert.ok(r['Awaiting Simulation']['Spirit of Redemption']);
 });
 test('Piercing Light applies only to Holy and Discipline',()=>{
  const b=rank(build(),'Piercing Light',3),r=rows(b);
  assert.equal(r.Spell['Spell Hit'],'0%');
  assert.equal(r['Talent Scope Bonuses']['Holy hit'],'6%');
  assert.equal(r['Talent Scope Bonuses']['Discipline hit'],'6%');
 });
}

test('source buff enhancements never apply when the buff is absent',()=>{
 if(!['warrior','paladin','druid','shaman'].includes(cls))return;
 const name={warrior:'Improved Shouts',paladin:'Improved Blessings',druid:'Improved Mark of the Wild',shaman:'Enhancing Totems'}[cls];
 const b=rank(build(),name);
 const r=rows(b),z=rows(build());
 assert.equal(r['Base Stats'].Strength,z['Base Stats'].Strength);
 assert.equal(r.Melee.Power,z.Melee.Power);
});

if(cls==='warrior')test('Improved Shouts scales only the selected Battle Shout AP contribution',()=>{
 const b=rank(build(),'Improved Shouts',5);b.controls.buffIds=['battle-shout'];
 const control=build();control.controls.buffIds=['battle-shout'];
 near(+row(b,'Melee','Power')-+row(control,'Melee','Power'),58,1);
});

if(cls==='paladin')test('Improved Blessings scales only selected Might, not total AP',()=>{
 const b=rank(build(),'Improved Blessings',5);b.controls.buffIds=['might'];
 const control=build();control.controls.buffIds=['might'];
 near(+row(b,'Melee','Power')-+row(control,'Melee','Power'),44.4,1);
});

if(cls==='druid')test('Improved Mark of the Wild adds only 35 percent of selected buff attributes',()=>{
 const b=rank(build(),'Improved Mark of the Wild',5);b.controls.buffIds=['wild'];
 const control=build();control.controls.buffIds=['wild'];
 for(const stat of ['Strength','Agility','Stamina'])
  near(+row(b,'Base Stats',stat)-+row(control,'Base Stats',stat),4.2,1);
});

if(cls==='shaman')test('Enhancing Totems augments selected Earth and Air by 25 percent',()=>{
 const b=rank(build(),'Enhancing Totems',2);b.controls.buffIds=['earth','air'];
 const control=build();control.controls.buffIds=['earth','air'];
 near(+row(b,'Base Stats','Strength')-+row(control,'Base Stats','Strength'),24,1);
 near(+row(b,'Base Stats','Agility')-+row(control,'Base Stats','Agility'),24,1);
});

if(cls==='warlock'){
 test('Demonologist grants pet-specific passive Felhunter resistances without a demon it does nothing',()=>{
  const b=rank(build(),'Master Demonologist',5);
  const control=rows(b);
  b.classOptions.pet='Felhunter';const r=rows(b);
  for(const school of ['Arcane','Fire','Nature','Frost','Shadow']){
   near(+r.Defence[school+' Res']-+control.Defence[school+' Res'],60,.01);
  }
 });
 test('Rapid Deterioration cast-speed bonus is 6 percent at both ranks, not the 50/100 tick coefficient',()=>{
  const b=rank(build(),'Rapid Deterioration',1);
  assert.equal(rows(b)['Talent Scope Bonuses']['Affliction castSpeedPct'],'6%');
  b.talents[talent('Rapid Deterioration').id]=2;
  assert.equal(rows(b)['Talent Scope Bonuses']['Affliction castSpeedPct'],'6%');
 });
}
