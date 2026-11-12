import {abilityKey,rotationProfileData,RULESET_REVISION} from './registry.mjs?v=20261112-rotations1';
import {presetCompatibility} from './validator.mjs?v=20261112-rotations1';
/** Capability checks are necessary, not a replacement for engine.validate. */
export function rotationEngineErrors(build,engine,{talents,lookup}={}){
 const errors=[],profile=rotationProfileData(build.classId),preset=profile.presets.find(p=>p.id===build.controls.rotationPreset),role=build.controls.rotationRole||preset.role;
 if(!build.controls.rotationRows.length)errors.push('The rotation has no configured actions.');
 if(!engine)return errors;
 if(engine.rulesetRevision!==RULESET_REVISION)errors.push('The engine has not verified this rotation ruleset revision.');
 if(!engine.supportedRoles?.includes(role))errors.push(`The engine does not implement ${role} encounters.`);
 const output={dps:'DPS',tank:'TPS',healing:'HPS'}[role];if(!engine.supportedOutputTypes?.includes(output))errors.push(`The engine cannot report ${output} for this role.`);
 const compatibility=presetCompatibility(preset,build,{talents,lookup,role,knownAbilityIds:engine.supportedAbilityIds});errors.push(...compatibility.missing);
 if(preset.id!=='custom'&&!engine.validatedPresetIds?.includes(preset.id))errors.push(`Preset ${preset.id} has not been validated by this engine.`);
 for(const row of build.controls.rotationRows){
  const id=abilityKey(build.classId,row.ability);if(!engine.supportedAbilityIds?.includes(id))errors.push(`Ability is unsupported: ${row.ability}.`);
  if(!engine.verifiedAbilityIds?.includes(id))errors.push(`Learned spell ranks are unverified: ${row.ability}.`);
  for(const c of row.conditions)if(!engine.supportedRotationMetrics?.includes(c.metric))errors.push(`Condition is unsupported: ${c.metric}.`);
  if(['cycle','ally','self','pet'].includes(row.target)&&!engine.supportedRotationTargets?.includes(row.target))errors.push(`Rotation target is unsupported: ${row.target}.`);
 }
 return [...new Set(errors)];
}
