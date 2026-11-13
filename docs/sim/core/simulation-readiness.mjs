import {postSwapBuild,trinketSwapEngineErrors} from './trinket-swaps.mjs?v=20261113-swaps1';
import {ENCHANTS} from './equipment-options.mjs?v=20261113-swaps1';
import {rotationEngineErrors} from './rotations/readiness.mjs?v=20261112-rotations1';
import {validateBuild} from './builds.mjs?v=20261113-swaps1';
import {equipmentErrors} from './items.mjs?v=20261113-swaps1';
import {consumableEngineErrors} from './consumables.mjs?v=20261112-consumes1';
import {BASE_STATS} from './base-stats.mjs?v=20261112-stats1';
/** Shared fail-closed entry point for future workers and adapters. A planner
 * selection, a source tooltip, and an implemented combat effect are distinct. */
export function prepareSimulation(input,talents,{lookup=()=>null,engine=null}={}){
 const build=validateBuild(input,talents),errors=equipmentErrors(build,lookup).map(e=>`${e.slot}: ${e.reason}`);
 if(!BASE_STATS[`${build.race}:${build.classId}`]?.[build.level-1])errors.push('Base attributes for this race/class/level have not been verified.');
 if(!engine||engine.classId!==build.classId||!['implemented-unverified','validated'].includes(engine.status))errors.push(`The ${build.classId} combat engine is not implemented.`);
 errors.push(...trinketSwapEngineErrors(build,engine));
 if(build.trinketSwap?.enabled)errors.push(...equipmentErrors(postSwapBuild(build),lookup).map(e=>`Swap ${e.slot}: ${e.reason}`));
 for(const ref of Object.values(build.gear)){const enchant=ENCHANTS.find(e=>e.id===ref.enchantId);if(enchant?.rangedEffects&&!engine?.supportedEnchantIds?.includes(enchant.id))errors.push(`${enchant.name} is not implemented by the combat engine.`);}
 errors.push(...rotationEngineErrors(build,engine,{talents,lookup}));
 errors.push(...consumableEngineErrors(build,engine?.supportedConsumableIds||[]));
 if(engine&&!(engine.supportedRaces||[]).includes(build.race))errors.push('This engine has not implemented the selected race and its racial effects.');
 if(engine&&!(engine.supportedBuffIds||[]).every(id=>typeof id==='string'))errors.push('Invalid engine buff capabilities.');
 if(engine)for(const id of build.controls.buffIds)if(!engine.supportedBuffIds?.includes(id))errors.push(`Buff ${id} is not implemented by the combat engine.`);
 if(errors.length)throw new Error(errors.join(' '));
 if(typeof engine.validate!=='function')throw new Error('The engine must validate its ruleset and class-specific effects.');
 const engineErrors=engine.validate(build);if(!Array.isArray(engineErrors))throw new Error('Invalid engine validation result.');if(engineErrors.length)throw new Error(engineErrors.join(' '));
 return structuredClone(build);
}
