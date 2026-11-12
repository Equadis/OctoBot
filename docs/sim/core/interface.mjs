import { CLASS_DEFINITIONS } from './classes.mjs?v=20261112-audit1';
export const CLASSES=Object.freeze(CLASS_DEFINITIONS.map(cls=>({...cls,available:true})));

export const SLOT_ICONS = Object.freeze({
  head: 'inv_helmet_03', neck: 'inv_jewelry_necklace_07', shoulder: 'inv_shoulder_09',
  back: 'inv_misc_cape_20', chest: 'inv_chest_leather_08', wrist: 'inv_bracer_07',
  hands: 'inv_gauntlets_04', waist: 'inv_belt_13', legs: 'inv_pants_06', feet: 'inv_boots_01',
  ring1: 'inv_jewelry_ring_03', ring2: 'inv_jewelry_ring_03',
  trinket1: 'inv_jewelry_trinket_07', trinket2: 'inv_jewelry_trinket_07',
  mainhand: 'inv_sword_04', offhand: 'inv_sword_27', ranged: 'inv_weapon_bow_07',shirt:'inv_shirt_01',tabard:'inv_shirt_guildtabard_01',ammo:'inv_ammo_arrow_02',quiver:'inv_misc_quiver_09',
});

// Blizzard game icons served by Wowhead's public CDN, also used by the reference.
// No Combat Gum brand artwork, code or bundled assets are used.
export function iconUrl(name) {
  if (typeof name !== 'string' || !/^[a-z0-9_]+$/i.test(name)) throw new Error('Invalid game icon identifier');
  return `https://wow.zamimg.com/images/wow/icons/large/${name.toLowerCase()}.jpg`;
}

export const LAST_CLASS_KEY='octosim.last-class.v1';
export function rememberClass(classId,storage){
  if(!CLASSES.some(cls=>cls.id===classId))return;
  try{storage.setItem(LAST_CLASS_KEY,classId);}catch{}
}
export function rememberedClass(storage){
  try{const value=storage.getItem(LAST_CLASS_KEY);return CLASSES.some(cls=>cls.id===value)?value:null;}catch{return null;}
}

export function plannerView(url, lastClass=null) {
  const parsed = new URL(url);
  const selected = parsed.searchParams.get('class');
  if (parsed.searchParams.has('classes'))return 'classes';
  if (selected && CLASSES.some(cls=>cls.id===selected)) return selected;
  if (selected) return 'classes';
  if (selected === 'warrior' || parsed.hash.startsWith('#build=') ||
      ['#equipment', '#talents', '#simulation', '#build-settings'].includes(parsed.hash)) return 'warrior';
  return CLASSES.some(cls=>cls.id===lastClass)?lastClass:'classes';
}
