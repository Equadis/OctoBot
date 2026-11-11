import { validateTalents, setTalentRank, talentTotals } from './core/talents.mjs';
import { SLOTS, newBuild, validateBuild, encodeBuild, decodeBuild } from './core/builds.mjs';
import { itemPicker } from './item-picker.mjs';
import { equipmentTotals } from './core/items.mjs';
import { configuration } from './configuration.mjs';
import { attachTooltip, refreshTooltip, equipmentTooltip } from './tooltip.mjs';
import { CLASSES, SLOT_ICONS, iconUrl, plannerView } from './core/interface.mjs';

const $ = id => document.getElementById(id);
const DRAFT_KEY = 'octosim.planner.draft.v1', SAVED_KEY = 'octosim.planner.saved.v1';
let picker, config;
const PLANNING_FIELDS = {"fight-duration":"duration","fight-iterations":"iterations","target-level":"targetLevel","target-armour":"targetArmour"};
let data, build = newBuild(), selectedId = null, editingSlot = null;
const talentButtons = new Map(), slotElements = new Map();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function gameIcon(name, className = '', source = null) {
  const image = element('img', className);
  image.src = source || iconUrl(name);
  image.alt = '';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    if (!image.src.endsWith('/inv_misc_questionmark.jpg')) image.src = iconUrl('inv_misc_questionmark');
    else image.hidden = true;
  });
  return image;
}

function createClasses() {
  if ($('class-grid').childElementCount) return;
  for (const cls of CLASSES) {
    const card = element(cls.available ? 'a' : 'div', `class-card${cls.available ? ' available' : ' planned'}`);
    card.style.setProperty('--class-colour', cls.colour);
    if (cls.available) card.href = `?class=${cls.id}`;
    else card.setAttribute('aria-disabled', 'true');
    const title = element('div', 'class-card-title');
    title.append(element('strong', '', cls.name), element('span', 'class-status', cls.available ? 'Planner available' : 'Planned'));
    const text = element('div', 'class-card-copy');
    text.append(title, element('span', 'class-card-note', cls.available ? 'Open planner' : 'Not available yet'));
    card.append(gameIcon(`classicon_${cls.id}`, 'class-card-icon'), text);
    if (cls.available) card.append(element('span', 'card-arrow', '→'));
    $('class-grid').append(card);
  }
}

function feedback(message, error = false) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('error', error);
}

function persistDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(build));
    $('storage-status').textContent = 'Changes saved in this browser. Use Save Build to keep a named copy.';
  } catch {
    $('storage-status').textContent = 'Browser storage is unavailable. Export or share your build to keep it.';
  }
}

function applyBuild(candidate, message) {
  const next = validateBuild(candidate, data);
  build = next;
  selectedId = null;
  $('build-name').value = build.name;
  $('character-level').value = build.level;
  $('character-race').value = build.race;
  for (const [id,key] of Object.entries(PLANNING_FIELDS)) $(id).value = build.planning[key];
  persistDraft();
  config?.render();
  render();
  picker?.verifyGear().then(warnings => { if (warnings.length) feedback(`Equipment needs attention: ${warnings.join(' ')}`, true); render(); }).catch(() => {});
  feedback(message);
}

function createSlots() {
  for (const [slot, name] of Object.entries(SLOTS)) {
    const container = element('div', 'slot');
    const button = element('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Edit ${name}`);
    const itemName = element('span', 'item-name', 'Empty');
    const copy = element('span', 'slot-copy');
    copy.append(element('span', 'slot-name', name), itemName);
    button.append(gameIcon(SLOT_ICONS[slot], 'slot-icon'), copy);
    button.addEventListener('click', () => openItem(slot));
    const link = element('a', 'db-link', 'Database ↗');
    link.target = '_blank'; link.rel = 'noopener noreferrer'; link.hidden = true;
    attachTooltip(button, async () => {
      const item = build.gear[slot];
      if (!item) return {title:SLOTS[slot],lines:['Empty']};
      const metadata = await picker.inspect(item.id);
      return equipmentTooltip(metadata, item);
    });
    container.append(button, link);
    slotElements.set(slot, { container, itemName, link, image: button.querySelector('img') });
    const left = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist'].includes(slot);
    const weapons = ['mainhand', 'offhand', 'ranged'].includes(slot);
    container.dataset.side = weapons ? 'weapon' : left ? 'left' : 'right';
    $(weapons ? 'slots-weapons' : left ? 'slots-left' : 'slots-right').append(container);
  }
}

function createTalents() {
  for (const tree of data.trees) {
    const section = element('section', 'talent-tree');
    section.setAttribute('aria-label', `${tree.name} talents`);
    const heading = element('div', 'tree-heading');
    const total = element('span'); total.id = `tree-total-${tree.index}`;
    heading.append(gameIcon(['inv_sword_27', 'ability_warrior_battleshout', 'inv_shield_06'][tree.index], 'tree-icon'), element('h3', '', tree.name), total);
    const grid = element('div', 'talent-grid');
    for (const talent of data.talents.filter(t => t.tree === tree.index)) {
      const button = element('button', 'talent-node');
      button.type = 'button';
      button.style.gridColumn = String(talent.column + 1);
      button.style.gridRow = String(talent.row + 1);
      button.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
      attachTooltip(button, () => talentTooltip(talent));
      button.addEventListener('keydown', event => {
        if (['ArrowUp','ArrowDown','+','-'].includes(event.key)) { event.preventDefault(); selectedId=talent.id; changeRank(['ArrowUp','+'].includes(event.key)?1:-1); }
      });
      const rank = element('span', 'rank');
      const source = typeof talent.iconSource === 'string' && /^https:\/\/octowow\.st\/talents\/icons\/[a-z0-9_]+\.png$/i.test(talent.iconSource) ? talent.iconSource : null;
      button.append(gameIcon(talent.icon || 'inv_misc_questionmark', 'talent-icon', source), element('span', 'talent-short', talent.name), rank);
      button.addEventListener('click', () => {
        selectedId = talent.id;
        if ((build.talents[talent.id] ?? 0) < talent.maxRanks) changeRank(1);
        render();
      });
      button.addEventListener('contextmenu', event => {
        event.preventDefault(); selectedId = talent.id;
        if ((build.talents[talent.id] ?? 0) > 0) changeRank(-1);
        render();
      });
      talentButtons.set(talent.id, { button, rank });
      grid.append(button);
    }
    const clear = element('button', 'clear-tree', `Clear ${tree.name} points`);
    clear.type = 'button';
    clear.addEventListener('click', () => {
      const next = { ...build.talents };
      for (const talent of data.talents) if (talent.tree === tree.index) delete next[talent.id];
      build.talents = next; persistDraft(); render(); feedback(`${tree.name} points cleared.`);
    });
    section.append(heading, grid, clear);
    $('talent-trees').append(section);
  }
}

function render() {
  const totals = talentTotals(data, build.talents);
  const spent = totals.reduce((sum, value) => sum + value, 0);
  $('character-description').textContent = `${build.race} · Level ${build.level}`;
  $('talent-split').textContent = totals.join(' / ');
  $('points-left').textContent = `${Math.max(0, build.level - 9) - spent} points left`;
  $('talents-total').textContent=totals.join(' / ');
  $('talents-points-left').textContent=`Points left: ${Math.max(0,build.level-9)-spent}`;
  $('equipment-count').textContent = `${Object.keys(build.gear).length} / ${Object.keys(SLOTS).length} slots planned`;
  $('tree-summary').replaceChildren(...data.trees.map(tree => {
    const row = element('div', '', tree.name);
    row.append(element('strong', '', String(totals[tree.index])));
    $(`tree-total-${tree.index}`).textContent = `${totals[tree.index]} / ${tree.maxPoints}`;
    return row;
  }));
  for (const [slot, { container, itemName, link, image }] of slotElements) {
    const item = build.gear[slot];
    const metadata = item && picker?.lookup(item.id);
    itemName.textContent = item ? metadata?.name || item.label || `Item #${item.id}` : 'Empty';
    image.src = iconUrl(metadata?.icon || SLOT_ICONS[slot]);
    if (metadata) itemName.className = `item-name q${metadata.quality}`;
    else itemName.className = 'item-name';
    itemName.removeAttribute('title');
    container.classList.toggle('has-item', Boolean(item));
    container.classList.toggle('equipment-invalid', Boolean(item && !picker?.usable(slot,item.id)));
    link.hidden = !item;
    if (item) link.href = `https://octowow.st/db/?item=${item.id}`;
    else link.removeAttribute('href');
  }
  for (const talent of data.talents) {
    const rank = build.talents[talent.id] ?? 0;
    const { button, rank: rankLabel } = talentButtons.get(talent.id);
    rankLabel.textContent = `${rank} / ${talent.maxRanks}`;
    button.setAttribute('aria-label', `${talent.name}, rank ${rank} of ${talent.maxRanks}`);
    button.setAttribute('aria-pressed', String(selectedId === talent.id));
    button.classList.toggle('allocated', rank > 0);
    button.classList.toggle('maxed', rank === talent.maxRanks);
    button.classList.toggle('locked', rank === 0 && validateTalents(data,
      { ...build.talents, [talent.id]: 1 }, build.level).length > 0);
  }
  const stats = equipmentTotals(Object.fromEntries(Object.entries(build.gear).map(([slot,item]) => [slot, {attributes:picker?.usable(slot,item.id) ? picker.lookup(item.id).attributes : {}}])));
  $('gear-stats').replaceChildren(...Object.entries(stats).map(([name,value]) => {
    const row=element('div','gear-stat');row.append(element('span','',name),element('strong','',String(value)));return row;
  }));
  if (!Object.keys(stats).length) $('gear-stats').textContent = '—';
}

function talentTooltip(talent) {
  const rank=build.talents[talent.id] || 0;
  const lines=[`Rank ${rank} / ${talent.maxRanks}`];
  if(rank>0)lines.push(talent.descriptions?.[rank-1] || 'Effect unavailable.');
  if(rank<talent.maxRanks)lines.push(`Next rank:\n${talent.descriptions?.[rank] || 'Effect unavailable.'}`);
  if(talent.requires!==null){const parent=data.talents.find(t=>t.tree===talent.tree && t.position===talent.requires);if(parent)lines.push(`Requires ${talent.requiresRanks} points in ${parent.name}.`);}
  if(talent.row>0)lines.push(`Requires ${talent.row*5} points in lower tiers.`);
  return {title:talent.name,lines};
}

function changeRank(delta) {
  if (selectedId === null) return;
  try {
    build.talents = setTalentRank(data, build.talents, selectedId,
      (build.talents[selectedId] ?? 0) + delta, build.level);
    persistDraft(); render(); refreshTooltip();
    feedback(`${data.talents.find(t => t.id === selectedId).name}: rank ${build.talents[selectedId] ?? 0}.`);
  } catch (error) { feedback(error.message, true); }
}

function openItem(slot) {
  $('editing-slot').textContent = `${SLOTS[slot]} · ${build.race} Warrior · Level ${build.level}`;
  picker.open(slot);
}

function savedBuilds() {
  const entries = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  if (!Array.isArray(entries) || entries.length > 50) throw new Error('Saved build collection is invalid. Export your current build to keep it.');
  return entries;
}

function wireControls() {
  document.querySelectorAll('.section-links a').forEach(link => link.addEventListener('click', () => {
    document.querySelectorAll('.section-links a').forEach(other => {
      other.classList.toggle('active', other === link);
      if (other === link) other.setAttribute('aria-current', 'location');
      else other.removeAttribute('aria-current');
    });
  }));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  picker = itemPicker({
    getBuild: () => ({...build,gear:Object.fromEntries(Object.entries(build.gear).map(([slot,item])=>[slot,{...item,twoHanded:picker?.lookup(item.id)?.slot===17}]))}),
    onEquip: (slot,item) => {
      build.gear[slot] = {id:item.id,label:item.label};
      if(item.twoHanded) delete build.gear.offhand;
      persistDraft();render();feedback(`${SLOTS[slot]} equipped.`);
    },
    onClear: slot => {delete build.gear[slot];persistDraft();render();feedback(`${SLOTS[slot]} cleared.`);},
  });
  for (const [id,key] of Object.entries(PLANNING_FIELDS)) $(id).addEventListener('change', () => {
    try {
      const value = ['buffs','debuffs','rotation'].includes(key) ? $(id).value : Number($(id).value);
      build = validateBuild({...build,planning:{...build.planning,[key]:value}},data);persistDraft();feedback('Planning settings saved.');
    } catch (error) { $(id).value=build.planning[key];feedback(error.message,true); }
  });
  config=configuration({getBuild:()=>build,onChange:controls=>{build=validateBuild({...build,controls},data);persistDraft();}});
  for (const [id, key] of [['build-name', 'name'], ['character-race', 'race'], ['character-level', 'level']]) {
    $(id).addEventListener('change', () => {
      try {
        build = validateBuild({ ...build, [key]: key === 'level' ? Number($(id).value) : $(id).value }, data);
        $(id).value = build[key]; persistDraft(); render(); feedback('Build updated.'); picker.verifyGear().then(warnings => { if(warnings.length) feedback(`Equipment needs attention: ${warnings.join(' ')}`, true); }).catch(()=>{});
      } catch (error) { $(id).value = build[key]; feedback(error.message, true); }
    });
  }
  let levelTimer;
  $('character-level').addEventListener('input', () => { clearTimeout(levelTimer); levelTimer = setTimeout(() => $('character-level').dispatchEvent(new Event('change')), 300); });
  $('new-build').addEventListener('click', () => applyBuild(newBuild(), 'New build started. Named saved builds are still available.'));
  $('save-build').addEventListener('click', () => {
    try {
      const entries = savedBuilds();
      const existing = entries.findIndex(entry => entry.build?.name === build.name);
      const record = { savedAt: new Date().toISOString(), build: validateBuild(build, data) };
      if (existing >= 0) entries[existing] = record;
      else if (entries.length >= 50) throw new Error('You have 50 named builds. Use an existing name to update it, or export this build.');
      else entries.push(record);
      localStorage.setItem(SAVED_KEY, JSON.stringify(entries)); feedback(`Saved “${build.name}” in this browser.`);
    } catch (error) { feedback(error.message, true); }
  });
  $('load-build').addEventListener('click', () => {
    try {
      const entries = savedBuilds();
      $('saved-builds').replaceChildren();
      if (!entries.length) $('saved-builds').append(element('p', 'muted', 'No named builds saved yet.'));
      for (const entry of entries) {
        const row = element('div', 'saved-row');
        const label = element('span', '', String(entry.build?.name || 'Invalid build'));
        label.append(element('small', '', `Level ${entry.build?.level ?? '—'} Warrior`));
        const button = element('button', '', 'Load');
        button.addEventListener('click', () => {
          try { applyBuild(entry.build, 'Saved build loaded.'); $('load-dialog').close(); }
          catch (error) { feedback(error.message, true); }
        });
        row.append(label, button); $('saved-builds').append(row);
      }
      $('load-dialog').showModal();
    } catch (error) { feedback(error.message, true); }
  });
  $('share-build').addEventListener('click', () => {
    try {
      const url = new URL(location.href); url.hash = `build=${encodeBuild(build)}`;
      $('share-url').value = url.href; $('share-dialog').showModal();
    } catch (error) { feedback(error.message, true); }
  });
  $('copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('share-url').value); $('share-dialog').close(); feedback('Build link copied.'); }
    catch { $('share-url').focus(); $('share-url').select(); feedback('Copy the selected link to share your build.'); }
  });
  $('export-build').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(build, null, 2)], { type: 'application/json' }));
    const link = element('a'); link.href = url;
    link.download = `${build.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Warrior_Build'}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback('Build exported.');
  });
  $('import-build').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    try {
      const file = $('import-file').files[0];
      if (!file) return;
      if (file.size > 64000) throw new Error('Build files must be smaller than 64 KB.');
      applyBuild(JSON.parse(await file.text()), 'Build imported.');
    } catch (error) { feedback(`Could not import build: ${error.message}`, true); }
    finally { $('import-file').value = ''; }
  });
  window.addEventListener('hashchange', () => {
    if (!location.hash.startsWith('#build=')) return;
    try { applyBuild(decodeBuild(location.hash.slice(7), data), 'Shared build loaded.'); }
    catch (error) { feedback(error.message, true); }
  });
}

function createDisclosures() {
  for(const card of document.querySelectorAll('.planner-column > section.card')) {
    const heading=card.querySelector(':scope > .card-heading') || card.querySelector(':scope > h2');
    const title=heading.matches('h2')?heading:heading.querySelector('h2');
    const body=element('div','panel-body');body.id=`${card.id}-body`;
    for(const child of [...card.children])if(child!==heading)body.append(child);
    card.append(body);
    const toggle=element('button','panel-toggle',title.textContent);toggle.type='button';
    toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-controls',body.id);
    toggle.addEventListener('click',()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));});
    title.replaceChildren(toggle);
  }
}

async function initialise() {
  createClasses();
  if (plannerView(location.href) !== 'warrior') return;
  document.body.classList.add('planner-view');
  $('class-selection').hidden = true;
  try {
    const response = await fetch(new URL('./data/talents/warrior.json', import.meta.url));
    if (!response.ok) throw new Error(`Talent data request failed (${response.status}).`);
    data = await response.json();
    if (data.classId !== 'warrior' || !Array.isArray(data.talents) || data.talents.length !== 54) throw new Error('Incomplete Warrior talent data.');
    createSlots(); createTalents(); wireControls(); createDisclosures();
    let message = 'Planner ready.';
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) { build = validateBuild(JSON.parse(stored), data); message = 'Your previous build was restored.'; }
    } catch { message = 'Browser storage could not be restored. Import or share a build to load it.'; }
    let invalidShare = null;
    if (location.hash.startsWith('#build=')) {
      try { build = decodeBuild(location.hash.slice(7), data); message = 'Shared build loaded.'; }
      catch (error) { invalidShare = error.message; }
    }
    applyBuild(build, message);
    if (invalidShare) feedback(invalidShare, true);
    $('planner').hidden = false;
  } catch (error) {
    $('startup-error').hidden = false;
    $('startup-error').textContent = `The planner could not load: ${error.message} Please reload to try again.`;
  }
}

window.addEventListener('hashchange', () => {
  if (!document.body.classList.contains('planner-view') && plannerView(location.href) === 'warrior') initialise();
});
initialise();
