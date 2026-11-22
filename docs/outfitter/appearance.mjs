// What the Dressing Room says about an item whose preview is not an exact, complete model. Pure helpers (no DOM, no network), so they can be tested.
//
// The recovery build carries a small table, meta/octobot/appearance-states.json, with the pairs (item id : viewer slot) that are not simply "has its own
// model". Each has a state and the client's own reason:
//   invisible   the game client defines nothing to draw (display id 0, an empty display row, a hidden-slot item); the preview shows nothing, as the game does.
//   missing     the client names files it does not contain: no usable 3D model exists.
//   unresolved  the client's data for the item is inconsistent (its display row is for another kind of slot): the intended look is unknown.
//   incomplete  a model loads but something it needs is absent (a texture for one sex, a helm model for some races).
// Besides those, a preview can be an estimate (another item's model, named as such) or the appearance service can fail. Every note starts with its kind,
// and the icon takes its look from that kind (infoKind).

/** The table's key for an item in a viewer slot. A shield is sent to the viewer as slot 14; the table, like the audit, files off-hand items under 22. */
export const stateKey = (itemId, slot) => `${itemId}:${slot === 14 ? 22 : slot}`;

const STATES = new Set(['invisible', 'missing', 'unresolved', 'incomplete']);

/** Keeps only well-formed entries of the table; anything else is ignored. */
export function parseStates(raw) {
  const out = new Map();
  const items = raw && typeof raw === 'object' && raw.items && typeof raw.items === 'object' ? raw.items : {};
  for (const [key, entry] of Object.entries(items)) {
    if (!/^\d+:\d+$/.test(key) || !entry || !STATES.has(entry.state) || typeof entry.why !== 'string') continue;
    out.set(key, { state: entry.state, why: entry.why.slice(0, 400), sexes: Array.isArray(entry.sexes) ? entry.sexes.filter(s => s === 'male' || s === 'female') : [] });
  }
  return out;
}

const STAYS = 'The item stays in your outfit and in saved and shared outfits.';
export const NOTES = {
  name: 'Estimated preview: shown with the Classic model of the same-named original item. It may differ from the in-game look.',
  icon: 'Estimated preview: shown with a Classic model that uses the same icon. It may differ from the in-game look.',
  missing: `Missing model: this appearance has no Classic 3D model, so there is no preview. ${STAYS}`,
  unresolved: `Unresolved metadata: the appearance service found no display ID for this item, so its look is unknown and there is no preview. ${STAYS}`,
  error: 'Service error: the appearance service did not answer for this item, so it has no preview right now. It stays in your outfit. Selecting it again will retry.',
  legacy: `Service error: the appearance service has not been updated to find Classic models yet, so there is no preview. ${STAYS}`,
};

/** The note for a pair with a state. `why` is the client's own reason from the audit. */
export function stateNote(entry) {
  const why = entry.why.endsWith('.') ? entry.why : entry.why + '.';
  if (entry.state === 'invisible') return `No visible appearance: ${why} The preview shows nothing, as the game does.`;
  if (entry.state === 'missing') return `Missing model: ${why} There is no preview. ${STAYS}`;
  if (entry.state === 'unresolved') return `Unresolved metadata: ${why} There is no preview. ${STAYS}`;
  const who = entry.sexes?.length ? ` (affects ${entry.sexes.join(' and ')} characters)` : '';
  return `Incomplete model: ${why}${who} The preview shows what the client provides.`;
}

const KINDS = [['No visible appearance', 'invisible'], ['Missing model', 'missing'], ['Unresolved metadata', 'unresolved'], ['Incomplete model', 'incomplete'],
  ['Estimated preview', 'estimated'], ['Service error', 'error']];
/** The kind of a note, from its first words: invisible, missing, unresolved, incomplete, estimated or error. */
export function infoKind(note) {
  return KINDS.find(([prefix]) => String(note).startsWith(prefix))?.[1] || 'missing';
}
