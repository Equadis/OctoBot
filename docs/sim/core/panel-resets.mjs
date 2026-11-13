import {newBuild} from './builds.mjs?v=20261113-swaps1';
// Shared panel resets preserve the selected class and unrelated build settings.
export function resetPlannerSection(build,section){
 const next=structuredClone(build),defaults=newBuild(build.classId);
 switch(section){
  case 'equipment':next.gear={};if(defaults.trinketSwap)next.trinketSwap=structuredClone(defaults.trinketSwap);break;
  case 'talents':next.talents={};break;
  case 'buffs':for(const key of ['buffIds','consumableIds','teaThreshold'])next.controls[key]=structuredClone(defaults.controls[key]);next.planning.buffs='';next.planning.debuffs='';break;
  case 'rotation':for(const key of ['rotationRole','rotationPreset','rotationRows','keyInterval','variability','variabilityMs'])next.controls[key]=structuredClone(defaults.controls[key]);next.planning.rotation='';break;
  case 'build-settings':{const {buffs,debuffs,rotation,...settings}=defaults.planning;next.planning={...next.planning,...settings};break;}
  default:throw new Error('Unknown planner section.');
 }
 return next;
}
