import {defaultClassOptions,validateClassOptions} from './class-options.mjs?v=20261111-classes1';
import { classDefinition, PRIMARY_PROFESSIONS, SECONDARY_SKILLS } from './classes.mjs?v=20261111-classes1';
import { validEnchant } from './equipment-options.mjs?v=20261111-classes1';
import { TARGET_IDS } from './targets.mjs?v=20261111-classes1';
import { defaultControls, validateControls } from './configuration.mjs?v=20261111-classes1';
import { validateTalents } from './talents.mjs?v=20261111-classes1';

export const SLOTS = Object.freeze({
  head: 'Head', neck: 'Neck', shoulder: 'Shoulder', back: 'Back', chest: 'Chest', wrist: 'Wrist',
  hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', ring1: 'Ring 1', ring2: 'Ring 2',
  trinket1: 'Trinket 1', trinket2: 'Trinket 2', mainhand: 'Main Hand', offhand: 'Off Hand', ranged: 'Ranged', shirt:'Shirt',tabard:'Tabard',ammo:'Ammunition',quiver:'Quiver / Ammo Pouch',
});

export function newBuild(classId='warrior') {
  const cls=classDefinition(classId);
  return { schemaVersion: 1, classId, name: `My ${cls.name} Build`, level: 60,
    race: cls.race, skills:{}, classOptions:defaultClassOptions(classId), talents: {}, gear: {}, controls: defaultControls(), planning: { buffs: '', debuffs: '', rotation: '', duration: 60, iterations: 1000, targetLevel: 63, targetArmour: 4211, durationVary: false, durationVariation: 20, targetNatureRes: 0, targetFireRes: 0, targetFrostRes: 0, targetShadowRes: 0, targetArcaneRes: 0, targetPreset: 'custom', targetEnergyPerSecond: 0 } };
}

export function parseItemReference(input) {
  const value = input.trim();
  let id = value;
  if (!/^\d+$/.test(value)) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Enter a numeric item ID or an OctoWoW database URL.'); }
    if (url.protocol !== 'https:' || url.hostname !== 'octowow.st' ||
        !['/db/', '/db'].includes(url.pathname) || url.username || url.password) {
      throw new Error('Use a database link beginning https://octowow.st/db/.');
    }
    id = url.searchParams.get('item') ?? '';
  }
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1 || Number(id) > 2147483647) {
    throw new Error('The item reference must contain a positive item ID.');
  }
  return Number(id);
}

export function validateBuild(input, data) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid build file.');
  if(input.schemaVersion!==1||input.classId!==data.classId)throw new Error('Build class does not match the selected planner.');
  classDefinition(input.classId);
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80) throw new Error('Build name must be 1–80 characters.');
  if (typeof input.race !== 'string' || !input.race.trim() || input.race.length > 40) throw new Error('Race must be 1–40 characters.');
  const skills={};
  if(input.skills!==undefined){
    if(!input.skills||typeof input.skills!=='object'||Array.isArray(input.skills))throw new Error('Invalid profession skills.');
    for(const [name,rank] of Object.entries(input.skills)){if(![...PRIMARY_PROFESSIONS,...SECONDARY_SKILLS].includes(name)||!Number.isInteger(rank)||rank<0||rank>300)throw new Error('Invalid profession skill or rank.');if(rank>0)skills[name]=rank;}
    if(Object.keys(skills).filter(name=>PRIMARY_PROFESSIONS.includes(name)).length>2)throw new Error('Choose at most two primary professions.');
  }
  const errors = validateTalents(data, input.talents, input.level);
  if (errors.length) throw new Error(errors[0]);
  if (!input.gear || typeof input.gear !== 'object' || Array.isArray(input.gear)) throw new Error('Invalid equipment references.');
  const gear = {};
  for (const [slot, item] of Object.entries(input.gear)) {
    if (!Object.hasOwn(SLOTS, slot) || !item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Unknown equipment slot.');
    if (!Number.isInteger(item.id) || item.id < 1 || item.id > 2147483647 ||
        typeof item.label !== 'string' || item.label.length > 80) throw new Error('Invalid item reference.');
    gear[slot] = { id: item.id, label: item.label };
    if (item.enchantId !== undefined && item.enchantId !== '') {
      if (!validEnchant(item.enchantId,slot,input.classId)) throw new Error('Invalid enchant for this equipment slot.');
      gear[slot].enchantId=item.enchantId;
    }
  }
  const planning = { ...newBuild(input.classId).planning };
  if (input.planning !== undefined) {
    if (!input.planning || typeof input.planning !== 'object' || Array.isArray(input.planning)) throw new Error('Invalid planning settings.');
    for (const key of ['buffs', 'debuffs', 'rotation']) {
      const value = input.planning[key] ?? '';
      if (typeof value !== 'string' || value.length > 2000) throw new Error('Planning notes must be at most 2,000 characters each.');
      planning[key] = value;
    }
    for (const [key,min,max] of [['duration',1,3600],['iterations',1,100000],['targetLevel',1,70],['targetArmour',0,50000],['durationVariation',0,100],['targetNatureRes',0,10000],['targetFireRes',0,10000],['targetFrostRes',0,10000],['targetShadowRes',0,10000],['targetArcaneRes',0,10000],['targetEnergyPerSecond',0,1000]]) {
      const value = input.planning[key] ?? planning[key];
      if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key} setting.`);
      planning[key] = value;
    }
  }
  planning.durationVary = input.planning?.durationVary ?? false;
  if (typeof planning.durationVary !== 'boolean') throw new Error('Invalid fight duration variation.');
  planning.targetPreset = input.planning?.targetPreset ?? 'custom';
  if (!TARGET_IDS.includes(planning.targetPreset)) throw new Error('Unknown target preset.');
  const talents = {};
  for (const [id, rank] of Object.entries(input.talents)) if (rank > 0) talents[id] = rank;
  return { schemaVersion: 1, classId: input.classId, name: input.name.trim(),
    race: input.race.trim(), skills, classOptions:validateClassOptions(input.classOptions,input.classId), level: input.level, talents, gear, planning, controls: validateControls(input.controls,input.classId) };
}

export function encodeBuild(build) {
  const bytes = new TextEncoder().encode(JSON.stringify(build));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  if (encoded.length > 12000) throw new Error('This build is too large for a share link. Export it as JSON instead.');
  return encoded;
}

export function decodeBuild(encoded, data) {
  if (encoded.length > 12000 || !/^[\w-]+$/.test(encoded)) throw new Error('Invalid build link.');
  try {
    const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
    return validateBuild(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(binary, char => char.charCodeAt(0)))), data);
  } catch (error) { throw new Error(`Could not load the shared build: ${error.message}`); }
}
