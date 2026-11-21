// Character Skins panel: builds the card list. Pure DOM, no network and no page state, so outfitter.mjs stays in charge of the outfit.
import { basisLabel, compatibility, genderName, raceName, thumbnailFor } from './skins.mjs?v=20261121-skins1';

const STATUS_TEXT = { Recovered: '', 'Partially Recovered': 'Partly recovered', Unresolved: 'Unresolved', Verified: 'Verified' };

/** One card per skin. A skin that cannot be worn by the current body stays visible and says why, instead of disappearing. */
export function renderSkinCards(list, skins, { race, gender, selectedId, thumbUrl, onPick, onBlocked }) {
  list.replaceChildren();
  if (!skins.length) {
    const empty = document.createElement('p');
    empty.className = 'muted skins-empty';
    empty.textContent = 'No skins match. Clear the search, or untick "Fits this character" to see skins for other races.';
    list.append(empty);
    return;
  }
  for (const skin of skins) {
    const fit = compatibility(skin, race, gender);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'skin-card' + (skin.id === selectedId ? ' selected' : '') + (fit.ok ? '' : ' blocked');
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-pressed', String(skin.id === selectedId));
    if (!fit.ok) card.setAttribute('aria-disabled', 'true');
    const frame = document.createElement('span');
    frame.className = 'skin-thumb';
    const file = thumbnailFor(skin, gender);
    if (file) {
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = thumbUrl(file);
      img.addEventListener('error', () => img.remove(), { once: true });
      frame.append(img);
    } else {
      frame.classList.add('no-picture');
      frame.textContent = skin.labelled ? 'No picture' : 'Texture only';
    }
    const name = document.createElement('span');
    name.className = 'skin-name';
    name.textContent = skin.name;
    const meta = document.createElement('span');
    meta.className = 'skin-meta';
    const sexes = skin.genders.length === 2 ? 'male and female' : skin.genders.length === 1 ? genderName(skin.genders[0]) + ' only' : '';
    meta.textContent = [skin.races.map(raceName).join(', '), sexes].filter(Boolean).join(' · ');
    card.append(frame, name, meta);
    const flags = [STATUS_TEXT[skin.status], !fit.ok ? (fit.unsupported ? 'Not available yet' : 'Does not fit') : ''].filter(Boolean);
    if (flags.length) {
      const chip = document.createElement('span');
      chip.className = 'skin-chip' + (fit.ok ? '' : ' warn');
      chip.textContent = flags.join(' · ');
      card.append(chip);
    }
    const details = [fit.reason, basisLabel(skin.basis), skin.visualCheck !== 'none' ? 'Picture check: ' + skin.visualCheck : '', ...skin.missing]
      .filter(Boolean).join(' ');
    card.title = details || skin.name;
    card.addEventListener('click', () => (fit.ok ? onPick(skin) : onBlocked(skin, fit.reason)));
    list.append(card);
  }
}
