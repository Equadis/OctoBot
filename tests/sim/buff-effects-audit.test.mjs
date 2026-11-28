import {BOSS_PRESETS,applyTarget,isInstancedRaid} from '../../docs/sim/core/targets.mjs';
import {effectiveBuffIds,WORLD_BUFF_IDS} from '../../docs/sim/core/buffs.mjs';
import {buffScenarioRestriction,BUFF_GROUPS} from '../../docs/sim/core/configuration.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {CONSUMABLES,CONSUMABLE_BY_ID,consumablePassiveStats,selectConsumable,resolveConsumableSelection,consumableRestriction} from '../../docs/sim/core/consumables.mjs';
import {consumableEffectAudit} from '../../docs/sim/core/consumable-effects.mjs';
import {buffDefinition,resolveBuffEffects} from '../../docs/sim/core/buff-effect-audit.mjs';
import {BUFF_OPTIONS} from '../../docs/sim/core/configuration.mjs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
const item=id=>CONSUMABLE_BY_ID.get(id),stats=id=>consumablePassiveStats(item(id));
const sheet=(b,g={})=>Object.fromEntries(characterStats(b,JSON.parse(fs.readFileSync(new URL('../../docs/sim/data/talents/'+b.classId+'.json',import.meta.url))),g).groups.map(x=>[x.name,Object.fromEntries(x.rows.map(r=>[r.label,r.value]))]));
test('every imported consumable and shared selection has explicit coverage; no events inflate prepull stats',()=>{
 for(const i of CONSUMABLES){const a=i.effectAudit;assert.ok(a.status,i.id);assert.ok(Object.values(a.stats).every(Number.isFinite),i.id);if(a.status!=='prepull')assert.deepEqual(consumablePassiveStats(i),{},i.name);}
 for(const b of BUFF_OPTIONS){const e=buffDefinition(b.id);assert.ok(e.status,b.id);assert.ok(Object.values(e.stats).every(Number.isFinite));assert.ok(e.reason);}
});
test('source item vectors retain all attributes and precise damage schools',()=>{
 for(const [id,expected] of [[13452,{agi:25,crit:2}],[13453,{str:18,sta:18}],[13447,{int:18,spi:18}],[13445,{armour:450}],[13510,{health:1200}],[13511,{mana:2000}],[13512,{damageOnlySp:150}],[13513,{arcaneRes:25,fireRes:25,frostRes:25,natureRes:25,shadowRes:25}],[20079,{spi:50,sta:50}],[20007,{mp5:12}],[3826,{hp5:12}],[9264,{shadowSp:40}],[50237,{natureSp:55}],[21023,{sta:30,dodge:2}],[60976,{rangedAP:45}],[60977,{damageOnlySp:22}],[60978,{haste:2}],[84040,{dodge:1,defense:4}],[47410,{sp:15,agi:25,crit:2,spellCrit:2}],[47412,{damageOnlySp:35,str:25}],[47414,{damageOnlySp:35,ap:35}],[61174,{sta:25}],[21151,{sta:15}],[17048,{sta:10}],[724,{sta:4,spi:4}]]){
 assert.deepEqual(stats(id),expected,item(id).name);
 }
});
test('short buffs are not averaged and temporary/permanent equipment use is excluded',()=>{
 for(const id of ['quickness','flurry','chili','tea','windfury','mark-death']){const e=buffDefinition(id);assert.equal(e.status,'event',id);assert.deepEqual(e.stats,{});}
 assert.equal(item(61181).effectAudit.durationSeconds,30);assert.deepEqual(stats(61181),{});
 assert.equal(item(65).effectAudit.status,'enhancement');assert.match(consumableRestriction(item(65),newBuild('mage')),/enhancements/);
 const b=newBuild('rogue');const before=sheet(b);b.controls.buffIds.push('quickness','flurry');assert.equal(sheet(b).Melee.Haste,before.Melee.Haste);
});
test('food, drink and spell source aliases use the intended item IDs; same-category alternatives replace',()=>{
 assert.equal(item(21151).buffId,'rum');assert.equal(item(17048).buffId,null);assert.equal(item(61174).buffId,'merlot');assert.equal(item(21023).buffId,'chimaerek');
 assert.deepEqual(selectConsumable([17048],61175),[61175]);
 assert.deepEqual(selectConsumable([954],2289),[2289]);
 assert.deepEqual(selectConsumable([724],60976),[60976]);
 assert.deepEqual(resolveConsumableSelection({buffIds:['rum'],consumableIds:[20709]},'consumables').buffIds,[]);
});
test('spell damage and healing are distinct, and armour and health apply from additional consumables',()=>{
 const b=newBuild('mage');b.controls.buffIds=[];const before=sheet(b);b.controls.buffIds=['supreme-power'];let a=sheet(b);
 assert.equal(+a.Spell['Spell Power']-+before.Spell['Spell Power'],150);assert.equal(+a.Spell['Healing Power'],+before.Spell['Spell Power']);
 b.controls.buffIds=[];b.controls.consumableIds=[13445,13510];a=sheet(b);assert.equal(+a.Defense.Armor-+before.Defense.Armor,450);assert.equal(+a.Defense.Health-+before.Defense.Health,1200);
});
test('weapon oils are restricted to equipped weapons, not bare hands, shields or active poison',()=>{
 const b=newBuild('rogue');b.controls.buffIds=['wizard-oil-mh','wizard-oil-oh'];
 assert.ok(resolveBuffEffects(b,{}).entries.every(e=>!e.active));
 const gear={mainhand:{classs:2,subclass:15},offhand:{classs:4,subclass:6}};
 assert.deepEqual(resolveBuffEffects(b,gear).entries.map(e=>e.active),[true,false]);
 b.classOptions.mhPoison='Instant Poison VI';assert.ok(resolveBuffEffects(b,gear).entries.every(e=>!e.active));
});

test('checked raid spell values include all attributes and source-aware recipient/target scope',()=>{
 assert.deepEqual(buffDefinition('wild').stats,{str:12,agi:12,sta:12,int:12,spi:12,armour:285,arcaneRes:20,fireRes:20,natureRes:20,frostRes:20,shadowRes:20});
 assert.equal(buffDefinition('wild').status,'source-spell');assert.equal(buffDefinition('sunder').stats.targetArmour,-2250);
 assert.equal(buffDefinition('expose').stats.targetArmour,-2550);
 assert.equal(buffDefinition('might').stats.ap,222);assert.equal(buffDefinition('recklessness').stats.targetAttackPower,90);
 const mage=newBuild('mage');mage.controls.buffIds=[];const before=sheet(mage);mage.controls.buffIds=['wild','recklessness'];const after=sheet(mage);
 assert.equal(Number(after['Base Stats'].Intellect)-Number(before['Base Stats'].Intellect),12);
 assert.equal(Number(after['Base Stats'].Spirit)-Number(before['Base Stats'].Spirit),12);
 assert.equal(Number(after.Defense.Armor)-Number(before.Defense.Armor),309); // +285 aura and +24 from agility
 assert.equal(Number(after.Defense['Fire Res'])-Number(before.Defense['Fire Res']),20);
 assert.equal(Number(after['Melee vs Target'].Armor)-Number(before['Melee vs Target'].Armor),-640);
 assert.equal(after['Target Debuff Contributions'].targetAttackPower,'90');
});
test('additional long-duration stat effects and scoped effects preserve exact tooltip amount',()=>{
 for(const [id,expected] of [[21072,{mp5:3}],[21217,{mp5:6}],[22236,{defense:13}],[22237,{hit:2}],[22239,{healingPower:44}],[83309,{healingPower:24}],[42131,{mountSpeedPct:5}],[42160,{defense:6}],[5265,{spi:1,sta:-1}],[9088,{shadowRes:10}]])assert.deepEqual(stats(id),expected,item(id).name);
 assert.equal(item(51932).effectAudit.status,'scoped');assert.deepEqual(stats(51932),{});
 assert.equal(item(23194).effectAudit.status,'unquantified');assert.equal(item(5996).effectAudit.status,'utility');
});

test('ambiguous speed unit remains unquantified instead of inventing a percentage',()=>{assert.equal(item(42162).effectAudit.status,'unquantified');assert.deepEqual(stats(42162),{});});

test('confirmed spell and item sources correct previously assumed values',()=>{
 assert.deepEqual(buffDefinition('trueshot').stats,{});assert.equal(buffDefinition('trueshot').status,'source-conflict');
 assert.equal(buffDefinition('annihilator').stats.targetArmour,-600);assert.equal(buffDefinition('nightfall').stats.targetSpellDamageTakenPct,15);
 assert.deepEqual(buffDefinition('wizard-oil-mh').stats,{damageOnlySp:36,spellCrit:1});assert.equal(buffDefinition('juju-might').durationSeconds,600);
 assert.equal(buffDefinition('flurry').eventModifiers.meleeHastePct,3);assert.equal(buffDefinition('flurry').durationSeconds,20);
 assert.deepEqual(buffDefinition('curse-elements').stats,{targetFireRes:-75,targetFrostRes:-75,targetFireDamageTakenPct:10,targetFrostDamageTakenPct:10});
});
test('new raid and world buffs reach the sheet independently across nine classes',()=>{
 for(const c of ['warrior','paladin','rogue','druid','shaman','hunter','mage','warlock','priest']){
  const b=newBuild(c);b.controls.buffIds=[];const base=sheet(b);b.controls.buffIds=['fortitude','fengus','slipkik','curse-elements','annihilator','nightfall'];const a=sheet(b);
  assert.equal(Number(a['Base Stats'].Stamina)-Number(base['Base Stats'].Stamina),54,c);
  assert.equal(Number(a.Melee.Power)-Number(base.Melee.Power),200,c);
  assert.equal(Number(a['Melee vs Target'].Armor)-Number(base['Melee vs Target'].Armor),-600,c);
  assert.equal(a['Target Debuff Contributions'].targetFireRes,'-75');assert.equal(a['Target Debuff Contributions'].targetSpellDamageTakenPct,'15%');
  assert.equal(Number(a.Spell['Spell Power']),Number(base.Spell['Spell Power']));
 }
});
test('oil level gate and imported consumable conflict handling',()=>{
 const b=newBuild('rogue');b.level=44;b.controls.buffIds=['wizard-oil-mh'];assert.equal(resolveBuffEffects(b,{mainhand:{classs:2,subclass:15}}).entries[0].active,false);
 b.level=60;b.controls.buffIds=[];b.controls.consumableIds=[13510,13511,13510];assert.deepEqual(resolveBuffEffects(b).consumables.map(c=>c.id),[13510]);
});

test('source-backed active target procs do not give personal penetration or permanent spell power',()=>{
 const b=newBuild('rogue');b.controls.buffIds=[];const base=sheet(b);b.controls.buffIds=['wind-serpent','shartateth','hemorrhage','mark-death'];const a=sheet(b);
 assert.equal(Number(a['Melee vs Target'].Armor)-Number(base['Melee vs Target'].Armor),-650);
 assert.equal(a.Melee['Armor Pen'],base.Melee['Armor Pen']);
 assert.equal(a['Target Debuff Contributions'].targetPhysicalDamageTakenPct,'2%');
 assert.equal(a.Spell['Spell Power'],base.Spell['Spell Power']);
 assert.equal(buffDefinition('hemorrhage').status,'source-conflict');
 assert.deepEqual(buffDefinition('pack').stats,{crit:3,rangedCrit:3});
 assert.equal(buffDefinition('tricks').durationSeconds,12);assert.equal(buffDefinition('mark-death').eventModifiers.providerMeleeAPToSpellDamagePct,18);
});

test('world buffs are last and suppressed for instanced raid presets but retained in saved selections',()=>{
 assert.equal(BUFF_GROUPS.at(-1).id,'world');
 const b=newBuild('rogue');b.controls.buffIds=['fengus','slipkik','fortitude'];
 for(const preset of BOSS_PRESETS){
  b.planning=applyTarget(b.planning,preset.id);
  const e=resolveBuffEffects(b).entries;
  const raid=['Kara40','Naxx','AQ40','ES','BWL','MC','AQ20','Kara10','ZG',"Onyxia's Lair"].includes(preset.raid);
  assert.equal(isInstancedRaid(b.planning),raid,preset.id);
  assert.deepEqual(e.map(x=>x.active),[!raid,!raid,true],preset.id);
  assert.deepEqual(effectiveBuffIds(b.controls.buffIds,b.planning),raid?['fortitude']:b.controls.buffIds);
  assert.equal(b.controls.buffIds.length,3);
  assert.equal(Boolean(buffScenarioRestriction(BUFF_OPTIONS.find(x=>x.id==='fengus'),b)),raid);
 }
});
test('raid calculations ignore world buffs on all nine classes and restore outside raids',()=>{
 for(const c of ['warrior','paladin','rogue','druid','shaman','hunter','mage','warlock','priest']){
  const b=newBuild(c);b.planning=applyTarget(b.planning,'bwl');b.controls.buffIds=['fortitude'];
  const base=sheet(b);b.controls.buffIds.push(...WORLD_BUFF_IDS);const raid=sheet(b);
  assert.deepEqual(raid.Melee,base.Melee,c);assert.deepEqual(raid.Spell,base.Spell,c);
  b.planning=applyTarget(b.planning,'heroic-dummy');const outside=sheet(b);
  assert.equal(Number(outside.Melee.Power)-Number(raid.Melee.Power),200,c);
  assert.ok(Math.abs(Number.parseFloat(outside.Spell['Spell Crit'])-Number.parseFloat(raid.Spell['Spell Crit'])-3)<1e-8,c);
 }
});
test('new spirit and shadow resistance modifiers preserve recipient and target separation',()=>{
 assert.deepEqual(buffDefinition('divine-spirit').stats,{spi:40});
 assert.deepEqual(buffDefinition('curse-shadow').stats,{targetShadowRes:-75,targetArcaneRes:-75,targetShadowDamageTakenPct:10,targetArcaneDamageTakenPct:10});
 for(const [race,expected] of [['Human',42],['Gnome',40]]){
  const b=newBuild('mage');b.race=race;b.controls.buffIds=[];const before=sheet(b);b.controls.buffIds=['divine-spirit','curse-shadow'];const after=sheet(b);
  assert.equal(+after['Base Stats'].Spirit-+before['Base Stats'].Spirit,expected);
  assert.equal(after.Defense['Shadow Res'],before.Defense['Shadow Res']);
  assert.equal(after['Target Debuff Contributions'].targetShadowRes,'-75');
 }
});

test('custom raid target preserves world buff suppression when a raid preset is customised',()=>{
 const b=newBuild('mage');b.controls.buffIds=['fengus','slipkik','fortitude'];b.planning=applyTarget(applyTarget(b.planning,'bwl'),'custom');
 assert.equal(b.planning.customRaid,true);assert.deepEqual(effectiveBuffIds(b.controls.buffIds,b.planning),['fortitude']);
 b.planning.customRaid=false;assert.deepEqual(effectiveBuffIds(b.controls.buffIds,b.planning),b.controls.buffIds);
});

test('verified earth totem and wisdom add the correct stats; resistance adjustments are target-only',()=>{
 assert.equal(buffDefinition('earth').stats.str,96);assert.equal(buffDefinition('earth').status,'source-spell');
 assert.equal(buffDefinition('wisdom').stats.mp5,33);
 const b=newBuild('mage');b.controls.buffIds=['wisdom','curse-shadow'];b.planning.targetShadowRes=100;
 const a=sheet(b);assert.equal(a.Defense['Mana / 5s'],'33');assert.equal(a['Target Resistance Estimates']['Shadow Resistance (raw)'],'25');
});
test('additional defence, health regeneration and school-elixir replacement groups retain only one rank',()=>{
 assert.deepEqual(selectConsumable([3389,8951],13445),[13445]);assert.deepEqual(selectConsumable([3382,3388],20004),[20004]);
 assert.deepEqual(resolveConsumableSelection({buffIds:['firepower'],consumableIds:[6373]},'consumables').buffIds,[]);
 assert.deepEqual(resolveConsumableSelection({buffIds:['firepower'],consumableIds:[6373]},'buffs').consumableIds,[]);
 assert.deepEqual(selectConsumable([17708],55046),[55046]);
});

test('triggered effects retain source conflicts without adding permanent sheet stats',()=>{
 const wf=buffDefinition('windfury'),ft=buffDefinition('flametongue'),chili=buffDefinition('chili'),tea=buffDefinition('tea');
 assert.equal(wf.eventEvidence,'source-conflict');assert.equal(wf.eventModifiers.procChancePct,20);
 assert.equal(wf.sourceVariants.database.extraAttackPower,315);assert.equal(wf.sourceVariants.communityChangeHistory.extraAttackPower,0);
 assert.equal(wf.sourceVariants.communityChangeHistory.internalCooldownSeconds,1.5);
 assert.equal(ft.sourceVariants.communityChangeHistory.triggersOnHit,false);
 assert.equal(ft.sourceVariants.communityChangeHistory.stacksWithWindfury,true);
 assert.equal(chili.durationSeconds,600);assert.equal(chili.eventModifiers.categoryCooldownSeconds,60);
 assert.equal(chili.eventModifiers.procChancePct,undefined);
 assert.equal(tea.eventModifiers.energyRestore,100);assert.equal(tea.eventModifiers.categoryCooldownSeconds,60);
 assert.equal(tea.eventModifiers.cooldownSeconds,undefined);
 for(const e of [wf,ft,chili,tea])assert.deepEqual(e.stats,{});
});
test('event eligibility is distinct from static activity and handles recipient restrictions',()=>{
 const b=newBuild('shaman');b.controls.buffIds=['windfury','flametongue'];b.classOptions.mhImbue='None';
 assert.deepEqual(resolveBuffEffects(b).entries.map(e=>[e.active,e.eventEligible]),[[false,true],[false,true]]);
 b.classOptions.mhImbue='Rockbiter Weapon';
 assert.deepEqual(resolveBuffEffects(b).entries.map(e=>[e.active,e.eventEligible]),[[false,false],[false,false]]);
 const r=newBuild('rogue');r.level=34;r.controls.buffIds=['chili','tea'];
 assert.deepEqual(resolveBuffEffects(r).entries.map(e=>e.eventEligible),[false,true]);
 r.level=35;assert.equal(resolveBuffEffects(r).entries[0].eventEligible,true);
 const m=newBuild('mage');m.controls.buffIds=['tea'];assert.equal(resolveBuffEffects(m).entries[0].eventEligible,false);
});

test('weapon mastery is opt-in, level-gated and scoped to the equipped weapon type',()=>{
 const b=newBuild('rogue');assert.deepEqual(b.controls.buffIds,[]);
 const gear={mainhand:{classs:2,subclass:7},offhand:{classs:2,subclass:15},ranged:{classs:2,subclass:3}};
 const read=()=>sheet(b,gear).Melee['Wep Skill'];
 assert.equal(read(),'303 | 300');b.controls.buffIds=['mastery-daggers'];assert.equal(read(),'303 | 305');
 b.controls.buffIds=['mastery-swords','mastery-daggers','skill-book'];assert.equal(read(),'308 | 305');
 assert.equal(sheet(b,gear)['Ranged Equipment Contributions'],undefined); // no ranged sheet group for a rogue without ranged bonuses
 assert.equal(sheet(b).Melee['Wep Skill'],'300 | 300');
 b.level=59;assert.equal(read(),'298 | 295');
 const h=newBuild('hunter');h.controls.buffIds=['mastery-bows'];const bow={ranged:{classs:2,subclass:2}};assert.equal(sheet(h,bow)['Ranged Equipment Contributions']['Ranged Weapon Skill'],'305');
});
test('unverified armour reductions do not inflate target mitigation estimates',()=>{
 const b=newBuild('rogue');const initial=sheet(b)['Melee vs Target'].Armor;
 b.controls.buffIds=['eskhandar','ripper'];assert.equal(sheet(b)['Melee vs Target'].Armor,initial);
 assert.ok(resolveBuffEffects(b).entries.every(e=>!e.active&&e.status==='unresolved'));
 b.controls.buffIds=['corrosive-poison'];assert.equal(+sheet(b)['Melee vs Target'].Armor,+initial-60);
});
test('developer melee miss formula handles skill above and below target defence',()=>{
 const b=newBuild('warrior');b.race='Human';b.planning.targetLevel=60;
 const gear={mainhand:{classs:2,subclass:7}};assert.equal(sheet(b,gear)['Melee vs Target']['Yellow Miss %'],'4.4%');
 b.planning.targetLevel=63;assert.equal(sheet(b,gear)['Melee vs Target']['Yellow Miss %'],'7.4%');
 b.controls.buffIds=['mastery-swords'];assert.equal(sheet(b,gear)['Melee vs Target']['Yellow Miss %'],'6.4%');
});
