import {rotationProfileData} from './registry.mjs?v=20261112-rotations1';
import {presetCompatibility} from './validator.mjs?v=20261112-rotations1';
/** Recommendations are configuration matches, never simulated optima. */
export function recommendPresets(build,{talents=null,lookup=()=>null,role='dps',limit=3}={}){
 const treePoints=new Map();for(const t of talents?.talents||[])treePoints.set(t.tree,(treePoints.get(t.tree)||0)+(build.talents[t.id]||0));
 const dominant=[...treePoints].sort((a,b)=>b[1]-a[1])[0];const spec=dominant?.[1]>0?talents.trees.find(t=>t.index===dominant[0])?.name.toLowerCase():null;
 return rotationProfileData(build.classId).presets.filter(p=>p.id!=='custom'&&p.role===role).map(p=>{
  const compatibility=presetCompatibility(p,build,{talents,lookup,role});
  const score=(p.requirements.weapon?8:0)+(p.requirements.form?5:0)+(p.requirements.pet?3:0)+(p.requirements.talents?.length||0)+(spec&&p.specialisation.toLowerCase().startsWith(spec)?20:0)+(p.legacy?1:0)+(build.classId==='rogue'&&p.rows.some(r=>r.ability==='Backstab')&&(talents?.talents||[]).some(t=>t.name==='Improved Backstab'&&(build.talents[t.id]||0)>0)?8:0);
  return {preset:p,compatibility,score,reason:'Likely configuration match; combat execution and optimality are unverified.'};
 }).filter(p=>p.compatibility.compatible).sort((a,b)=>b.score-a.score||a.preset.name.localeCompare(b.preset.name)).slice(0,limit);
}
