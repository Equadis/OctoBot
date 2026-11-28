// Deterministic Shadow Bolt scenario for the talent audit tests (same synthetic policy fixture as combat-companion-reference).
import {readFileSync} from 'node:fs';
import {newBuild} from '../../../docs/sim/core/builds.mjs';
import {prepareReferenceScenario,runReferenceScenario} from '../../../docs/sim/core/combat-reference-adapter.mjs';
const policy={provenance:'synthetic reference',phase:2,gcdMs:1500,cooldownMs:0,acceptExternalReference:true,acceptSourceConflict:true,periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,resistance:Object.fromEntries(['fire','frost','shadow','nature','arcane','holy'].map(k=>[k,{policy:'none',bins:[{fraction:0,probability:1}]}])),threat:null,refresh:'restart',tickAtExpiry:true,snapshot:'snapshot'};
export const warlockTalents=JSON.parse(readFileSync(new URL('../../../docs/sim/data/talents/warlock.json',import.meta.url),'utf8'));
export function shadowBoltRun(talents,{seed=7,iterations=3,durationMs=9000}={}){
 const build=newBuild('warlock');build.level=60;build.talents=talents;
 const scenario=prepareReferenceScenario({build,talents:warlockTalents,gearById:{},learnedSpellIds:[11661],rankByAbility:{'warlock:shadow-bolt':11661},policies:{'warlock:shadow-bolt':policy},
  encounter:{mode:'reference-research',acknowledgeIncompleteEffects:true,position:'behind',distanceYards:20,allyDistanceYards:20,recastPeriodic:'rotation-only',includeMelee:false,durationMs,decisionIntervalMs:50,enemyHealth:1e7,allyMaxHealth:1e7,allyHealth:1,regeneration:[]},
  rows:[{ability:'Shadow Bolt',target:'primary',conditions:[]}]});
 return runReferenceScenario(scenario,{seed,iterations});
}
