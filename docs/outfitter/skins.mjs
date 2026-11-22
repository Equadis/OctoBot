// Donation-shop character skins: pure helpers (no DOM) so they can be tested without a browser.
// The appearance service lists skins at /api/outfitter/skins and adds each one to its body's "Skin Color" option as an extra choice
// (ids from SKIN_CHOICE_FIRST up), so the viewer applies a skin exactly as it applies a skin colour. The catalogue says which race and
// gender each choice belongs to; this module decides what may be shown, what may be selected and why not.

export const SKIN_CHOICE_FIRST = 9950000;
const RACE_NAMES = { 1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead', 6: 'Tauren', 7: 'Gnome', 8: 'Troll', 9: 'Goblin', 10: 'High Elf' };
const GENDER_NAMES = ['male', 'female'];
export const raceName = race => RACE_NAMES[race] || 'Unknown race';
export const genderName = gender => GENDER_NAMES[gender] || 'unknown';
/** Character model ids are race * 2 - 1 + gender. */
export const bodyId = (race, gender) => race * 2 - 1 + gender;
export const raceOfBody = (body, gender) => (body + 1 - gender) / 2;

/** A skin id as it is stored in outfits and links; anything else is dropped. */
export function sanitiseSkinId(value) {
  return typeof value === 'string' && /^skin-[A-Za-z0-9_-]{1,80}$/.test(value) ? value : null;
}

const BASIS_LABELS = {
  name: 'Matched by name', ordinal: 'Matched by series order', visual: 'Matched by eye with the shop picture',
  'name+visual': 'Matched by name and by eye with the shop picture',
};
export const basisLabel = basis => BASIS_LABELS[basis] || '';
const CONFIDENCE_LABELS = {
  high: 'No other texture looks like the shop picture.',
  medium: 'The best match for the shop picture; a look-alike or a weaker match for one sex exists.',
  low: 'Several textures look the same as the shop picture; this is one of them.',
};
export const confidenceLabel = confidence => CONFIDENCE_LABELS[confidence] || '';

/** Keeps only well-formed skins from the service's answer. Unknown fields are ignored; a malformed entry is skipped, never repaired. */
export function parseCatalogue(raw) {
  const list = Array.isArray(raw?.skins) ? raw.skins : [];
  const skins = [];
  const seen = new Set();
  for (const entry of list.slice(0, 1000)) {
    const id = sanitiseSkinId(entry?.id);
    if (!id || seen.has(id) || typeof entry.name !== 'string' || !entry.name || entry.name.length > 120) continue;
    seen.add(id);
    const variants = (Array.isArray(entry.variants) ? entry.variants : [])
      .filter(v => (v?.gender === 0 || v?.gender === 1) && Number.isSafeInteger(v.choiceId) && v.choiceId >= SKIN_CHOICE_FIRST && Number.isSafeInteger(v.body) && v.body >= 1)
      .map(v => ({ gender: v.gender, body: v.body, race: raceOfBody(v.body, v.gender), choiceId: v.choiceId }));
    const thumbs = {};
    for (const [key, file] of Object.entries(entry.thumbnails && typeof entry.thumbnails === 'object' ? entry.thumbnails : {})) {
      if (['-', '_1', '_2'].includes(key) && Number.isSafeInteger(file) && file > 0) thumbs[key] = file;
    }
    skins.push({
      id, name: entry.name,
      category: typeof entry.category === 'string' ? entry.category.slice(0, 40) : 'Other',
      races: (Array.isArray(entry.races) ? entry.races : []).filter(r => RACE_NAMES[r]),
      genders: (Array.isArray(entry.genders) ? entry.genders : []).filter(g => g === 0 || g === 1),
      labelled: Number.isSafeInteger(entry.tokenItemId),
      status: ['Verified', 'Recovered', 'Partially Recovered', 'Unresolved'].includes(entry.status) ? entry.status : 'Unresolved',
      basis: typeof entry.mapping?.basis === 'string' ? entry.mapping.basis : null,
      confidence: ['high', 'medium', 'low'].includes(entry.mapping?.confidence) ? entry.mapping.confidence : null,
      missing: (Array.isArray(entry.missing) ? entry.missing : []).filter(m => typeof m === 'string').slice(0, 6),
      candidateCount: Array.isArray(entry.candidates) ? entry.candidates.length : 0,
      visualCheck: typeof entry.verification?.visual === 'string' ? entry.verification.visual : 'none',
      variants, thumbs,
    });
  }
  return skins;
}

/** The variant of a skin for this body, or null. */
export function variantFor(skin, race, gender) {
  return skin?.variants.find(v => v.race === race && v.gender === gender) || null;
}

/** Can this skin be worn by this body? When it cannot, `reason` says why in words the page can show. Nothing is ever substituted. */
export function compatibility(skin, race, gender) {
  if (!skin) return { ok: false, reason: 'This skin is not in the catalogue.' };
  if (!skin.variants.length) {
    return { ok: false, unsupported: true, reason: skin.labelled
      ? 'The game names this skin, but its texture has not been identified yet, so it cannot be previewed.'
      : 'This skin has no usable texture.' };
  }
  if (variantFor(skin, race, gender)) return { ok: true, reason: '' };
  const races = [...new Set(skin.variants.map(v => v.race))];
  if (!races.includes(race)) return { ok: false, reason: `Only for ${races.map(raceName).join(' and ')} characters.` };
  const other = skin.variants.map(v => v.gender);
  return { ok: false, reason: `Only has a ${genderName(other[0])} look for ${raceName(race)}s.` };
}

/** The viewer's choice id for a saved skin on this body, with the reason it does not apply when it does not. */
export function resolveSkin(skins, skinId, race, gender) {
  const id = sanitiseSkinId(skinId);
  if (!id) return { skin: null, choiceId: 0, problem: '' };
  const skin = skins.find(s => s.id === id) || null;
  if (!skin) return { skin: null, choiceId: 0, problem: 'The saved character skin is not available.' };
  const fit = compatibility(skin, race, gender);
  if (!fit.ok) return { skin, choiceId: 0, problem: `${skin.name} was removed: ${fit.reason}` };
  return { skin, choiceId: variantFor(skin, race, gender).choiceId, problem: '' };
}

export function categories(skins) {
  const order = Object.values(RACE_NAMES);
  return [...new Set(skins.map(s => s.category))].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b));
}

/** Search, category and compatibility filters. Labelled skins sort before unlabelled ones, then by category, then by name. */
export function filterSkins(skins, { query = '', category = '', race = 0, gender = 0, compatibleOnly = false, unlabelled = false } = {}) {
  const q = query.trim().toLowerCase();
  const order = categories(skins);
  return skins
    .filter(s => (unlabelled || s.labelled)
      && (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.races.some(r => raceName(r).toLowerCase().includes(q)))
      && (!category || s.category === category)
      && (!compatibleOnly || compatibility(s, race, gender).ok))
    .sort((a, b) => Number(b.labelled) - Number(a.labelled) || order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name));
}

/** The shop picture for the current body: the sex-specific one when the shop has it, otherwise the single picture. */
export function thumbnailFor(skin, gender) {
  return skin?.thumbs[gender ? '_2' : '_1'] || skin?.thumbs['-'] || skin?.thumbs[gender ? '_1' : '_2'] || null;
}
