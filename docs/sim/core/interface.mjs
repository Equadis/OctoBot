export const CLASSES = Object.freeze([
  { id: 'warrior', name: 'Warrior', colour: '#c79c6e', available: true },
  { id: 'paladin', name: 'Paladin', colour: '#f58cba' },
  { id: 'hunter', name: 'Hunter', colour: '#abd473' },
  { id: 'rogue', name: 'Rogue', colour: '#fff569' },
  { id: 'priest', name: 'Priest', colour: '#ffffff' },
  { id: 'shaman', name: 'Shaman', colour: '#388bff' },
  { id: 'mage', name: 'Mage', colour: '#69ccf0' },
  { id: 'warlock', name: 'Warlock', colour: '#9482c9' },
  { id: 'druid', name: 'Druid', colour: '#ff7d0a' },
]);

export const SLOT_ICONS = Object.freeze({
  head: 'inv_helmet_03', neck: 'inv_jewelry_necklace_07', shoulder: 'inv_shoulder_09',
  back: 'inv_misc_cape_20', chest: 'inv_chest_leather_08', wrist: 'inv_bracer_07',
  hands: 'inv_gauntlets_04', waist: 'inv_belt_13', legs: 'inv_pants_06', feet: 'inv_boots_01',
  ring1: 'inv_jewelry_ring_03', ring2: 'inv_jewelry_ring_03',
  trinket1: 'inv_jewelry_trinket_07', trinket2: 'inv_jewelry_trinket_07',
  mainhand: 'inv_sword_04', offhand: 'inv_sword_27', ranged: 'inv_weapon_bow_07',
});

// Blizzard game icons served by Wowhead's public CDN, also used by the reference.
// No Combat Gum brand artwork, code or bundled assets are used.
export function iconUrl(name) {
  if (typeof name !== 'string' || !/^[a-z0-9_]+$/i.test(name)) throw new Error('Invalid game icon identifier');
  return `https://wow.zamimg.com/images/wow/icons/large/${name.toLowerCase()}.jpg`;
}

export function plannerView(url) {
  const parsed = new URL(url);
  const selected = parsed.searchParams.get('class');
  if (selected && selected !== 'warrior') return 'classes';
  if (selected === 'warrior' || parsed.hash.startsWith('#build=') ||
      ['#equipment', '#talents', '#simulation', '#build-settings'].includes(parsed.hash)) return 'warrior';
  return 'classes';
}
