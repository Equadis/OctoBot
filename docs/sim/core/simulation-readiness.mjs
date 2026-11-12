import {validateBuild} from './builds.mjs?v=20261112-audit1';
import {equipmentErrors} from './items.mjs?v=20261112-audit1';
import {consumableEngineErrors} from './consumables.mjs?v=20261112-audit1';
import {BASE_STATS} from './base-stats.mjs?v=20261112-stats1';
/** Shared fail-closed entry point for future workers and adapters. A planner
 * selection, a source tooltip, and an implemented combat effect are distinct. */
export function prepareSimulation(input,talents,{lookup=()=>null,engine=null}={}){
 const build=validateBuild(input,talents),errors=equipmentErrors(build,lookup).map(e=>`${e.slot}: ${e.reason}`);
 if(!BASE_STATS[`${build.race}:${build.classId}`]?.[build.level-1])errors.push('Base attributes for this race/class/level have not been verified.');
 if(!engine||engine.classId!==build.classId||!['implemented-unverified','validated'].includes(engine.status))errors.push(`The ${build.classId} combat engine is not implemented.`);
 errors.push(...consumableEngineErrors(build,engine?.supportedConsumableIds||[]));
 if(engine&&!(engine.supportedRaces||[]).includes(build.race))errors.push('This engine has not implemented the selected race and its racial effects.');
 if(engine&&!(engine.supportedBuffIds||[]).every(id=>typeof id==='string'))errors.push('Invalid engine buff capabilities.');
 if(engine)for(const id of build.controls.buffIds)if(!engine.supportedBuffIds?.includes(id))errors.push(`Buff ${id} is not implemented by the combat engine.`);
 if(errors.length)throw new Error(errors.join(' '));
 if(typeof engine.validate!=='function')throw new Error('The engine must validate its ruleset and class-specific effects.');
 const engineErrors=engine.validate(build);if(!Array.isArray(engineErrors))throw new Error('Invalid engine validation result.');if(engineErrors.length)throw new Error(engineErrors.join(' '));
 return structuredClone(build);
}
