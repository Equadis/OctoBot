import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';import {petProfile,petInventory,petEngineErrors,PET_RULESET_REVISION} from '../../docs/sim/core/pet-audit.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
const data=cls=>JSON.parse(fs.readFileSync(new URL('../../docs/sim/data/talents/'+cls+'.json',import.meta.url)));
const rank=(b,d,n,r)=>b.talents[d.talents.find(t=>t.name===n).id]=r;
const get=(p,label)=>p.contributions.find(x=>x.label===label)?.amount;
test('Hunter contribution math uses supplied RAP; missing base and RAP remain unknown',()=>{
 const b=newBuild('hunter'),d=data('hunter');b.classOptions.pet='Cat';for(const [n,r] of [['Endurance Training',5],['Thick Hide',3],['Spirit Bond',2],['Bestial Precision',2],['Unleashed Fury',5]])rank(b,d,n,r);
 const p=petProfile(b,d,{stamina:200,itemArmour:1000,rangedAP:1200});
 assert.equal(get(p,'Inherited Stamina'),60);assert.equal(get(p,'Inherited item Armour'),360);assert.equal(get(p,'Inherited melee AP'),300);assert.equal(get(p,'Inherited spell power'),180);assert.equal(get(p,'Pet physical hit contribution'),8);assert.equal(get(p,'Pet spell hit contribution'),18);assert.equal(p.baseStats,null);assert.equal(get(petProfile(b,d,{}),'Inherited melee AP'),null);
 b.classOptions.petLevel=61;assert.equal(petProfile(b,d).active,false);b.level=9;b.classOptions.petLevel=9;assert.equal(petProfile(b,d).active,false);
});
test('Warlock talent inheritance and patch-conflicted Unleashed Potential stay separate',()=>{
 const b=newBuild('warlock'),d=data('warlock');b.classOptions.pet='Imp';for(const [n,r] of [['Fel Stamina',5],['Fel Intellect',3],['Demonic Precision',3],['Master Demonologist',5],['Unleashed Potential',3]])rank(b,d,n,r);
 const p=petProfile(b,d,{stamina:200,intellect:100,spellHit:10,spellCrit:20,fireSpellPower:100,shadowSpellPower:200});
 assert.equal(get(p,'Inherited Stamina'),100);assert.equal(get(p,'Inherited Intellect'),30);assert.equal(get(p,'Melee and spell hit contribution'),12);assert.equal(get(p,'Melee and spell crit contribution'),21);assert.equal(get(p,'Owner and demon spell cost reduction'),15);
 const e=p.events.find(x=>x.name==='Unleashed Potential');assert.equal(e.maxStackCombinedAP,135);assert.equal(e.status,'source-conflict');assert.equal(get(p,'Inherited spell power'),undefined);
 b.classOptions.pet='Felhunter';assert.equal(get(petProfile(b,d),'Owner and demon all resistance contribution'),60);
});
test('petless owner modifier is conditional; no sacrifice or pet buffs awarded',()=>{
 const b=newBuild('warlock'),d=data('warlock');rank(b,d,'Soul Entrapment',3);rank(b,d,'Demonic Sacrifice',1);
 const p=petProfile(b,d);assert.equal(p.active,false);assert.equal(get(p,'Petless owner damage modifier'),6);assert.equal(p.events.length,1);assert.deepEqual(p.directBuffs.applied,[]);
 b.classOptions.pet='Imp';assert.equal(get(petProfile(b,d),'Petless owner damage modifier'),undefined);
 assert.equal(characterStats(b,d).petAudit.pet,'Imp');
});
test('every configured companion is audited and unsupported engines cannot silently omit it',()=>{
 const r=petInventory();assert.equal(r.configuredTypes,13);assert.equal(r.verifiedBaseTables,0);
 for(const [cls,pets] of Object.entries(r.catalogue))for(const pet of Object.keys(pets)){const b=newBuild(cls);b.classOptions.pet=pet;assert.equal(petProfile(b,data(cls)).active,true);assert.ok(petEngineErrors(b,{},data(cls)).length);assert.deepEqual(petEngineErrors(b,{petRulesetRevision:PET_RULESET_REVISION,verifiedPetTypes:[pet]},data(cls)),[]);}
});
