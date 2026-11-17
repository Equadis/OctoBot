import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';import {characterStats} from '../../docs/sim/core/character-stats.mjs';
const data=c=>JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+c+'.json',import.meta.url)));
const build=c=>newBuild(c);
const rank=(b,name,n)=>{const t=data(b.classId).talents.find(t=>t.name===name);assert.ok(t,name);b.talents[t.id]=n??t.maxRanks;return b;};
const stats=(b,g={})=>characterStats(b,data(b.classId),g);
const row=(b,group,name,g={})=>stats(b,g).groups.find(x=>x.name===group).rows.find(x=>x.label===name).value;
const w=subclass=>({id:1,classs:2,subclass,speed:2,attributes:{},tooltipText:'10 - 20 Damage\\nSpeed 2.00'.replace('\\n','\n')});
test('all nine class sheets consume consolidated talent metadata without legacy rank scraping',()=>{
 for(const c of ['warrior','rogue','paladin','hunter','mage','priest','shaman','warlock','druid']){
  const b=build(c),d=data(c);
  for(const t of d.talents){const single=structuredClone(b);single.talents[t.id]=t.maxRanks;const s=characterStats(single,d,{});assert.equal(s.talentAudit.active,true);assert.ok(s.groups.length);assert.ok(s.talentAudit.details.length||s.talentAudit.pending.length,t.name);}
 }
});
test('Warrior cruelty is applied once; axe and offhand effects are scoped',()=>{
 const b=build('warrior'),gear={mainhand:w(0),offhand:w(7)};
 const before=parseFloat(row(b,'Melee','Crit Chance',gear));rank(b,'Cruelty',5);
 assert.equal(Math.round(parseFloat(row(b,'Melee','Crit Chance',gear))-before),5);
 rank(b,'Master of Arms',5);assert.match(row(b,'Melee','Crit Chance',gear),/\\|/); 
 const miss=row(b,'Melee vs Target','Miss %',gear).split('|').map(parseFloat);
 rank(b,'Dual Wield Specialization',5);
 const next=row(b,'Melee vs Target','Miss %',gear).split('|').map(parseFloat);assert.equal(next[0],miss[0]);assert.equal(next[1],miss[1]-10);
});
test('provider buffs are not applied twice; uncertain ownership remains visible',()=>{
 const b=build('shaman');b.controls.buffIds=['earth','air'];const before=row(b,'Base Stats','Strength');rank(b,'Enhancing Totems',2);
 assert.equal(row(b,'Base Stats','Strength'),before);assert.ok(stats(b).talentAudit.pending.some(x=>/ownership/.test(x.note)));
});
test('no talent metadata can fabricate a nonzero selected rank',()=>{const b=rank(build('warrior'),'Cruelty',5);assert.throws(()=>characterStats(b,null),/not in class metadata/);});
