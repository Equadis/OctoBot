import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats,passiveItemStats} from '../../docs/sim/core/character-stats.mjs';
import {BUFF_CONFLICTS,normaliseBuffs,selectBuff,selectBuffGroup} from '../../docs/sim/core/buffs.mjs';
import {CLASS_DEFINITIONS} from '../../docs/sim/core/classes.mjs';
const data=cls=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${cls}.json`,import.meta.url)));
const rows=(build,gear={})=>Object.fromEntries(characterStats(build,data(build.classId),gear).groups.map(g=>[g.name,Object.fromEntries(g.rows.map(r=>[r.label,r.value]))]));
test('reproduces the independently observed Combat Gum naked Human Rogue fixture',()=>{
 const b=newBuild('rogue');b.controls.buffIds=['skill-book','mongoose','scorpok','juju-might','juju-power','dreamshard'];
 const r=rows(b);
 assert.deepEqual(r['Base Stats'],{Strength:'110',Agility:'180',Stamina:'75'});
 assert.deepEqual(r.Melee,{'Wep Skill':'305 | 305',Damage:'0-0 | 0-0',Speed:'0.00 | 0.00',Power:'430','Hit Rating':'0%','WS Crit':'+0.20%','Crit Chance':'8.41%',Haste:'0.0%','Armor Pen':'0','Poison Chance':'+0%','Poison Crit':'2.00%'});
 assert.equal(r['Melee vs Target']['Miss %'],'7.0% | 7.0%');assert.equal(r['Melee vs Target']['Glance Dmg'],'75% | 75%');assert.equal(r['Melee vs Target']['Crit Cap'],'47.0% | 47.0%');assert.equal(r['Melee vs Target']['Eff. Crit'],'5.41% | 5.41%');assert.equal(r['Melee vs Target']['Phys Reduced'],'43.4%');
 assert.equal(r.Defence.Health,'2093');assert.equal(r.Defence['Dodge %'],'12.4%');assert.equal(r.Defence.Armour,'360');assert.equal(r.Spell['Spell Power'],'15');assert.equal(r.Spell['Spell Crit'],'2.00%');
});
test('all conflict pairs replace in both directions and imported builds normalise',()=>{
 for(const [a,b] of BUFF_CONFLICTS){assert.deepEqual(selectBuff([a],b),[b]);assert.deepEqual(selectBuff([b],a),[a]);}
 assert.deepEqual(normaliseBuffs(['mongoose','scorpok','greater-agility']),['scorpok','greater-agility']);
 const b=newBuild('rogue');b.controls.buffIds=['mongoose','greater-agility','scorpok'];assert.deepEqual(decodeBuild(encodeBuild(b),data('rogue')).controls.buffIds,['greater-agility','scorpok']);
 assert.deepEqual(selectBuff(['juju-power'],'brute-force'),['juju-power','brute-force']);
 assert.deepEqual(selectBuff(['battle-shout'],'might'),['battle-shout','might']);
 assert.deepEqual(selectBuff(['flurry'],'quickness'),['flurry','quickness']);
});
test('base tables cover all nine defaults at every supported level, without invented crit coefficients',()=>{
 for(const cls of CLASS_DEFINITIONS)for(let level=1;level<=60;level++){
  const b=newBuild(cls.id);b.level=level;const r=rows(b);
  assert.match(r['Base Stats'].Strength,/^\d+$/);assert.match(r.Defence.Health,/^\d+$/);
  if(level!==60)assert.equal(r.Melee['Crit Chance'],'—');
 }
});
test('gear, flat enchants, talent ranks, weapon types and target settings change the sheet',()=>{
 const b=newBuild('rogue');b.gear.mainhand={id:25,label:'Test weapon',enchantId:'enchant_mh_agi'};
 const gear={mainhand:{id:25,name:'Test weapon',classs:2,subclass:7,speed:2,attributes:{Agility:10},effects:['Equip: +40 Attack Power.'],tooltipText:'10 - 20 Damage\nSpeed 2.00'}};
 const base=rows(b),equipped=rows(b,gear);assert.equal(equipped['Base Stats'].Agility,'155');assert.notEqual(equipped.Melee.Power,base.Melee.Power);assert.equal(equipped.Melee['Wep Skill'],'305 | 300');assert.notEqual(equipped.Melee.Damage,'0-0 | 0-0');
 const t=data('rogue').talents.find(t=>t.name==='Malice');b.talents[t.id]=5;assert.match(rows(b,gear).Melee['Crit Chance'],/10\.54%/);
 b.controls.buffIds=['sunder'];assert.equal(rows(b,gear)['Melee vs Target'].Armour,'1961');
 b.planning.targetArmour=100;assert.equal(rows(b,gear)['Melee vs Target'].Armour,'0');
});
test('triggered item effects are not silently treated as permanent stats',()=>{
 const s=passiveItemStats({attributes:{Strength:8},effects:['Equip: +40 Attack Power.','Equip: Chance on hit: increases attack power by 500 for 10 sec.']});assert.deepEqual(s,{str:8,ap:40});
});

test('Select All matches observed stronger consumable and target preferences',()=>{
 const ids=['mongoose','greater-agility','scorpok','firewater','juju-might','giants','juju-power','dreamshard'];
 assert.deepEqual(new Set(selectBuffGroup([],ids)),new Set(['mongoose','scorpok','juju-might','juju-power','dreamshard']));
 assert.deepEqual(new Set(selectBuffGroup([],['expose','sunder','annihilator','shartateth'])),new Set(['expose','annihilator']));
 assert.deepEqual(selectBuffGroup(['scorpok','kings'],ids,false),['kings']);
});

test('Moonkin armour uses the published Octo talent, not the older Vanilla multiplier',()=>{
 const b=newBuild('druid');b.classOptions.form='Moonkin';const talent=data('druid').talents.find(t=>t.name==='Moonkin Form');
 const gear={chest:{attributes:{Armour:100},effects:[]}};
 assert.equal(rows(b,gear).Defence.Armour,'—');b.talents[talent.id]=1;
 const agility=Number(rows(b,gear)['Base Stats'].Agility);
 assert.equal(rows(b,gear).Defence.Armour,String(280+agility*2));
});
