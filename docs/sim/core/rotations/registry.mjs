import {TALENT_REFERENCES} from './talent-references.mjs?v=20261112-rotations1';
import {LEGACY_PROFILES} from './legacy.mjs?v=20261112-rotations1';
import warrior from './presets/warrior.mjs?v=20261112-rotations1';
import rogue from './presets/rogue.mjs?v=20261112-rotations1';
import paladin from './presets/paladin.mjs?v=20261112-rotations1';
import hunter from './presets/hunter.mjs?v=20261112-rotations1';
import priest from './presets/priest.mjs?v=20261112-rotations1';
import shaman from './presets/shaman.mjs?v=20261112-rotations1';
import mage from './presets/mage.mjs?v=20261112-rotations1';
import warlock from './presets/warlock.mjs?v=20261112-rotations1';
import druid from './presets/druid.mjs?v=20261112-rotations1';
import {ABILITY_DATA} from './ability-data.mjs?v=20261112-rotations1';
import {CONDITION_DEFINITIONS} from './conditions.mjs?v=20261112-rotations1';
export const RULESET_REVISION='octowow-public-2026-11-12';
const extras={warrior,rogue,paladin,hunter,priest,shaman,mage,warlock,druid};
export const abilityKey=(classId,name)=>`${classId}:${name.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')}`;
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const registries={};
for(const [classId,legacy] of Object.entries(LEGACY_PROFILES)){
 const names=[...legacy.abilities,...extras[classId].flatMap(p=>p.rows.map(r=>r.ability))];
 const canonical=new Map();for(const name of names)if(!canonical.has(abilityKey(classId,name)))canonical.set(abilityKey(classId,name),name);
 const abilities=[...canonical.values()],abilityRegistry=Object.fromEntries(abilities.map(name=>{
  const id=abilityKey(classId,name),fact=ABILITY_DATA[classId]?.[id]||{};
  return [id,{id,name,classId,spellIds:[],minLevel:null,verification:'unverified',actionKind:'unverified',...fact}];
 }));
 const legacyPresets=legacy.presets.filter(p=>p.id!=='custom').map(p=>({...structuredClone(p),legacy:true}));
 // Keep saved explicit legacy rows untouched. Only these newly selected templates
 // are corrected; selecting a preset never migrates a saved build's rows.
 if(classId==='paladin'){
  const holy=legacyPresets.find(p=>p.id==='holy-shock');holy.rows=structuredClone(paladin.find(p=>p.id==='holy-strike-shock-healing').rows);holy.role='healing';
  holy.description='Legacy Holy Shock template, now explicitly healing-oriented. Older saved rows are preserved; public damage/healing descriptions conflict.';
 }
 if(classId==='hunter'){
  const survival=legacyPresets.find(p=>p.id==='survival');survival.rows=structuredClone(hunter.find(p=>p.id==='survival-melee-raptor').rows);survival.requirements={weapon:'melee',talents:['Lacerate']};
  survival.description='Legacy Survival ID, now a melee priority. Older saved ranged rows are retained verbatim.';
 }
 const specs=[];for(const p of [...legacyPresets,...extras[classId]]){const spec=p.name.split(' | ')[0];if(!specs.includes(spec))specs.push(spec);}
 const presets=[...legacyPresets,...extras[classId]].map(p=>{
  const rows=p.rows.map(row=>({...structuredClone(row),...(!p.legacy?{abilityId:abilityKey(classId,row.ability)}:{}),ability:canonical.get(abilityKey(classId,row.ability))}));
  const requirements={...p.requirements};
  const inferred=rows.map(r=>abilityRegistry[abilityKey(classId,r.ability)]?.talentName).filter(Boolean);
  requirements.talents=[...new Map([...(requirements.talents||[]),...inferred].map(t=>[typeof t==='string'?t:t.name,t])).values()];
  if(p.id==='protection-shield')requirements.weapon='shield';
  if(p.id==='arms-twohand'||p.id==='fury-twohand')requirements.weapon='two-hand';
  if(p.id==='fury-dual')requirements.weapon='dual-wield';
  requirements.abilityIds=[...new Set(rows.map(r=>abilityKey(classId,r.ability)))];
  requirements.talents=requirements.talents.map(req=>{const name=typeof req==='string'?req:req.name,rank=typeof req==='string'?1:req.rank;const fact=TALENT_REFERENCES[classId].find(t=>t.name.replaceAll('’',"'")===name.replaceAll('’',"'"));return {name,rank,talentId:fact?.id??null,spellIds:fact?.spellIds||[],verification:fact?'published-talent':'unresolved'};});
  if(requirements.form==='Moonkin'&&!requirements.talents.some(t=>t.name==='Moonkin Form')){const t=TALENT_REFERENCES[classId].find(t=>t.name==='Moonkin Form');requirements.talents.push({name:'Moonkin Form',rank:1,talentId:t?.id??null,spellIds:t?.spellIds||[],verification:t?'published-talent':'unresolved'});}
  const spec=p.name.split(' | ')[0],role=p.role||(/Protection|Bear/.test(p.name)?'tank':'dps');
  return {...p,name:p.name.includes(' | ')?p.name:p.name+' | Default',classId,specialisation:spec,role,rows,requirements,description:p.description||`${p.name} reference priority; verify ability availability and current-server mechanics before combat use.`,verificationStatus:'research-based',executionStatus:'unsupported',ruleset:RULESET_REVISION,
   sources:[`https://octowow.st/${classId}`,`https://octowow.st/talents/${classId}/`,`https://github.com/stevemcqueenz/turtle-knowledge-base-/tree/b88d4445d9fdb21beb31ea013eefd5a2540f4787/structured/classes/${classId}`,`https://github.com/stevemcqueenz/turtle-knowledge-base-/tree/b88d4445d9fdb21beb31ea013eefd5a2540f4787/guide/classes/${classId}`,...(classId==='rogue'?['https://www.combatgum.app/rogue']:['https://github.com/Torchlite-bit/Aegis_SBR/blob/95e2fa99d37d416eb0493cdea9edbe29b94dbe05/docs/rotations.md'])]};
 }).sort((a,b)=>specs.indexOf(a.specialisation)-specs.indexOf(b.specialisation)||Number(!a.legacy)-Number(!b.legacy));
 presets.push({id:'custom',name:'New Custom Rotation',description:'',classId,role:'dps',specialisation:'Custom',rows:[],requirements:{},verificationStatus:'unverified',executionStatus:'unsupported',ruleset:RULESET_REVISION,sources:[]});
 registries[classId]={abilities,abilityRegistry,resources:legacy.resources,presets};
}
export const ROTATION_REGISTRY=freeze(registries);
export function rotationProfileData(classId){const p=ROTATION_REGISTRY[classId];if(!p)throw new Error('Unknown rotation class.');return p;}
export const COMMON_METRICS=Object.keys(CONDITION_DEFINITIONS).filter(key=>!['rage','energy','comboPoints','mana','manaPercent','petFocus','soulShards','predictedRage','predictedEnergy','predictedMana'].includes(key));
