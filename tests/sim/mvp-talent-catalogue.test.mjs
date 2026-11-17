import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getTalentAudit,TALENT_AUDITS} from '../../docs/sim/core/talent-audits.mjs';
import {resolveTalentEffects} from '../../docs/sim/core/talent-effects.mjs';
import {abilityProfiles,calculateAbilityTalentEffects} from '../../docs/sim/core/talent-calculations.mjs';
const data=c=>JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+c+'.json',import.meta.url)));
const build=(c,talents={})=>({classId:c,level:60,talents,classOptions:{},controls:{buffIds:[]},planning:{encounterType:'raid'}});
test('all nine source audits contain unique, complete talent IDs and mapped rank parameters',()=>{
  const seen=new Set();
  for(const c of Object.keys(TALENT_AUDITS)){
    const d=data(c),{rules,coverage,sourceBlob}=getTalentAudit(c);
    assert.match(sourceBlob,/^[a-f0-9]{40}$/);
    const ids=d.talents.map(t=>String(t.id)).sort();
    assert.deepEqual(Object.keys(rules).sort(),ids,c);
    assert.deepEqual(Object.keys(coverage).sort(),ids,c);
    for(const t of d.talents){
      const id=String(t.id);assert.ok(!seen.has(id),id);seen.add(id);
      assert.ok(coverage[id].status&&coverage[id].note);
      assert.ok(rules[id].length);
      for(const rule of rules[id]){
        if(rule.kind==='pending')continue;
        for(let i=0;i<t.maxRanks;i++)assert.ok(Number.isFinite(rule.values?.[i]??t.rankParameters?.[rule.param??0]?.[i]),c+' '+t.name+' rank '+(i+1));
      }
      for(const rank of new Set([0,1,Math.ceil(t.maxRanks/2),t.maxRanks])){
        const r=resolveTalentEffects(build(c,{[id]:rank}),d);
        assert.equal(r.active,true);
        assert.ok(r.pending.every(x=>x.name));
      }
    }
    const profiles=abilityProfiles(c);
    assert.ok(profiles.length>0);assert.equal(new Set(profiles.map(p=>p.name)).size,profiles.length);
  }
  assert.equal(Object.keys(TALENT_AUDITS).length,9);
  assert.equal(seen.size,476);
});
test('catalogue reads are isolated; foreign class metadata and talent IDs cannot leak',()=>{
  const a=getTalentAudit('warrior');delete a.rules['56'];
  assert.ok(getTalentAudit('warrior').rules['56']);
  assert.throws(()=>getTalentAudit('unknown'),/Unsupported/);
  assert.throws(()=>resolveTalentEffects(build('rogue'),data('warrior')),/matching/);
  assert.throws(()=>resolveTalentEffects(build('rogue',{'56':1}),data('rogue')),/not in class metadata/);
});
test('ability scopes count once and do not invent baselines',()=>{
  const audit={active:true,abilityEffects:[{name:'Example',kind:'spell',scope:['Fire','Fireball'],stat:'damagePct',amount:10}]};
  const p=abilityProfiles('mage').find(x=>x.name==='Fireball');
  const r=calculateAbilityTalentEffects(audit,p,{damage:100});
  assert.equal(r.matched.length,1);assert.ok(Math.abs(r.values.damage-110)<1e-8);assert.equal(r.values.manaCost,null);
});
