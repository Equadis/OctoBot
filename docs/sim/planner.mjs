import {trinketSwapControls} from './trinket-swaps.mjs?v=20261114-compact1';
import {resetPlannerSection} from './core/panel-resets.mjs?v=20261113-swaps1';
import {statTone,enchantSummary,bonusTone} from './core/presentation.mjs?v=20261130-ui2';
import {equipmentErrors} from './core/items.mjs?v=20261130-ui2';
import {CLASS_RACES,slotAllowed} from './core/class-rules.mjs?v=20261112-audit1';
import {setupRacePicker, setupIconSelect} from './race-picker.mjs?v=20261130-ui2';
import { raceIconUrl } from './race-icons.mjs?v=20261202-buildnames2';
import {optionIcon, optionHasIcons} from './core/icons.mjs?v=20261202-buildnames2';
let racePicker = null;
import {characterStats} from './core/character-stats.mjs?v=20261130-ui2';
import {CLASS_OPTIONS} from './core/class-options.mjs?v=20261201-ui3';
import { classDefinition } from './core/classes.mjs?v=20261202-buildnames2';
import { buildLibrary, defaultSaveName } from './core/build-library.mjs?v=20261202-buildnames2';
import { validateTalents, setTalentRank, talentTotals, maximiseTalent, minimiseTalent } from './core/talents.mjs?v=20261112-audit1';
import { SLOTS, newBuild, validateBuild, encodeBuild, decodeBuild, restoreLegacyBuild } from './core/builds.mjs?v=20261202-buildnames2';
import { maxEnergy, reconcileStartingEnergy } from './core/resources.mjs?v=1';
import { consumeReload, markInternalReload, clearUi, loadUi, saveUi, takePendingBuild, setPendingBuild } from './ui-state.mjs?v=20261201-ui3';
import { wireDialogs } from '../dialogs.mjs?v=1';
import { scheduleScrollingNames } from '../scrolling-names.mjs?v=20261130-ui2';
import { itemPicker } from './item-picker.mjs?v=20261201-ui3';
import { ENCHANTS, enchantAvailable } from './core/equipment-options.mjs?v=20261130-ui2';
import { settings } from './settings.mjs?v=20261112-polish2';
import { configuration } from './configuration.mjs?v=20261201-ui3';
import { attachTooltip, refreshTooltip } from './tooltip.mjs?v=20261124-tips2';
import { CLASSES, SLOT_ICONS, iconUrl, plannerView, rememberPlannerView, rememberedPlannerView } from './core/interface.mjs?v=20261112-navigation1';

const $ = id => document.getElementById(id);
// Drop the obsolete cache-busting `v` parameter from the address bar without reloading;
// other query parameters (e.g. ?classes) and the #build fragment are preserved verbatim.
try{
 const kept=location.search.replace(/^\?/,'').split('&').filter(part=>part&&!/^v(=|$)/.test(part));
 if(kept.length!==location.search.replace(/^\?/,'').split('&').filter(Boolean).length)history.replaceState(history.state,'',location.pathname+(kept.length?'?'+kept.join('&'):'')+location.hash);
}catch{}
// Opening the planner without ?class= always shows the class selection; each class's saved gear (per-class drafts) is untouched.
// Moving between OctoBot pages keeps the planner view (sessionStorage); a refresh or a new session opens the class selector.
// Saved builds live in localStorage and are not affected either way.
let tabStorage=null;try{tabStorage=sessionStorage;}catch{}
const reloaded=consumeReload(tabStorage,performance.getEntriesByType?.('navigation')?.[0]?.type);
const sharedLink=location.hash.startsWith('#build=');
if(reloaded&&!sharedLink)clearUi(tabStorage);
const sessionView=reloaded?null:(tabStorage?rememberedPlannerView(tabStorage):null);
const selectedView=reloaded&&!sharedLink?'classes':plannerView(location.href,sessionView);
const classId=selectedView==='classes'?'warrior':selectedView;
try{if(tabStorage)rememberPlannerView(selectedView,tabStorage);}catch{}
if(reloaded&&!sharedLink&&selectedView==='classes'){try{history.replaceState(null,'',location.pathname+'?classes');}catch{}}
// A build chosen from another class's Saved Builds list is carried here and applied instead of the stored draft.
const pendingBuild=selectedView==='classes'?null:takePendingBuild(tabStorage,classId);
const savedUi=selectedView==='classes'||!tabStorage||pendingBuild?null:loadUi(tabStorage,classId);
if(selectedView!=='classes'){
 const canonical=new URL(location.href);if(!canonical.searchParams.has('class')){canonical.searchParams.set('class',classId);history.replaceState(null,'',canonical);}
}
const currentClass=classDefinition(classId);
const DRAFT_KEY=`octosim.planner.draft.${classId}.v2`;
let library;
let picker, config, settingsControls, swapControls;
let data, build = newBuild(classId), selectedId = null, editingSlot = null;
const talentButtons = new Map(), slotElements = new Map();
// Remember folded stat sections while gear, talents and buffs trigger character-sheet rerenders.
const collapsedStatGroups = new Set(savedUi?.collapsedStats||[]);

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

// Class tile artwork reuses the talent tree backgrounds (one signature tree per class); they are small WebP files, cached after first use.
const CLASS_ART = Object.freeze({ warrior: [0, '50% 22%'], paladin: [0, '50% 28%'], hunter: [1, '50% 45%'], rogue: [1, '50% 40%'], priest: [0, '50% 30%'], shaman: [0, '50% 30%'], mage: [1, '50% 40%'], warlock: [2, '50% 35%'], druid: [0, '50% 25%'] });
function createClasses() {
  if ($('class-grid').childElementCount) return;
  for (const cls of CLASSES) {
    const card = element(cls.available ? 'a' : 'div', `class-card${cls.available ? ' available' : ' planned'}`);
    card.style.setProperty('--class-colour', cls.colour);
    if (cls.id in CLASS_ART) { const [tree, position] = CLASS_ART[cls.id]; card.classList.add('art-card'); card.style.setProperty('--art', `url("talent-backgrounds/${cls.id}-${tree}.webp")`); card.style.setProperty('--art-pos', position); }
    if (cls.available) card.href = `?class=${cls.id}`;
    else card.setAttribute('aria-disabled', 'true');
    // Same arrangement as the dashboard cards: name top left, icon top right, "Open →" bottom right.
    card.append(element('span', 'class-card-title', cls.name), gameIcon(`classicon_${cls.id}`, 'class-card-icon'));
    if (cls.available) card.append(element('span', 'class-card-go', 'Open →'));
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

function applyBuild(candidate, message, legacy=false) {
  const restored=legacy?restoreLegacyBuild(candidate,data):null;
  const next = restored?.build || validateBuild(candidate, data);
  if(restored?.changes.length)message+=` ${restored.changes.join('; ')}. Original saved copy retained.`;
  settingsControls?.cancelPending();
  build = next;
  selectedId = null;
  $('build-name').value = build.name;
  $('character-level').value = build.level;
  $('character-race').value = build.race;
  racePicker?.sync();

  persistDraft();
  config?.render();
  settingsControls?.render();

  renderClassOptions();
  render();
  picker?.verifyGear().then(warnings => { if (warnings.length) feedback(`Equipment needs attention: ${warnings.join(' ')}`, true); render(); }).catch(() => {});
  feedback(message);
}

function createSlots() {
  for (const [slot, name] of Object.entries(SLOTS)) {
    // Shirt and tabard are appearance-only and are not planned here.
    if (['shirt', 'tabard'].includes(slot)) continue;
    const container = element('div', 'slot');
    const button = element('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Edit ${name}`);
    // One line only: a name too long for the slot pans sideways, using the Auction House animation.
    const itemName = element('span', 'item-name ah-name-clip');
    const itemText = element('span', 'ah-name-text', 'Empty');
    itemName.append(itemText);
    const copy = element('span', 'slot-copy');
    copy.append(element('span', 'slot-name', name), itemName);
    button.append(gameIcon(SLOT_ICONS[slot], 'slot-icon'), copy);
    button.addEventListener('click', () => openItem(slot));
    // Hovering (or focusing) an equipped item shows it, with its enchant, in the item preview; leaving restores the previous preview.
    // It never changes the selected slot, the filters or the build.
    for (const [start, end] of [['mouseenter', 'mouseleave'], ['focus', 'blur']]) {
      button.addEventListener(start, () => picker?.hoverEquipped(slot));
      button.addEventListener(end, () => picker?.endHover());
    }
    // Trinkets cannot be enchanted, so they get no enchant line at all.
    const enchantable=!['trinket1','trinket2'].includes(slot);
    const enchantLabel=enchantable?element('span','slot-enchant ah-name-clip'):null;
    const enchantText=enchantable?element('span','ah-name-text','No enchant'):null;
    if(enchantLabel)enchantLabel.append(enchantText);
    if(enchantLabel)attachTooltip(enchantLabel,()=>{const enchant=ENCHANTS.find(e=>e.id===build.gear[slot]?.enchantId);return {title:enchant?.name||'No enchant',lines:enchant?[enchantSummary(enchant)]:[]};});
    container.dataset.slot = slot;
    container.append(...(enchantLabel?[button, enchantLabel]:[button]));
    slotElements.set(slot, { container, itemName, itemText, enchantLabel, enchantText, image: button.querySelector('img') });
    const left = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist'].includes(slot);
    const weapons = ['mainhand', 'offhand', 'ranged'].includes(slot);
    const extra=['ammo','quiver'].includes(slot);
    if(!slotAllowed(classId,slot))container.hidden=true;
    container.dataset.side = weapons ? 'weapon' : left ? 'left' : 'right';
    $(extra?'slots-ammo':weapons ? 'slots-weapons' : left ? 'slots-left' : 'slots-right').append(container);
  }
}

// Draw prerequisite links from the same tree/position data used by allocation validation.
const talentConnections = [];
function createTalentConnections(grid, talents) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  Object.assign(grid.style, {position:'relative', isolation:'isolate'});
  Object.assign(svg.style, {position:'absolute', inset:'0', width:'100%', height:'100%', overflow:'visible', pointerEvents:'none', zIndex:'0'});
  const links = [];
  for (const child of talents) {
    if (child.requires == null) continue;
    const parent = talents.find(t => t.position === child.requires);
    if (!parent) continue;
    const line = document.createElementNS(ns,'path');
    line.setAttribute('fill','none');
    line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-linejoin','round');
    const tip = document.createElementNS(ns,'path');
    svg.append(line,tip);
    links.push({parent,child,line,tip});
  }
  grid.prepend(svg);
  for (const t of talents) talentButtons.get(t.id).button.style.zIndex = '1';
  function draw() {
    const bounds = grid.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    for (const {parent,child,line,tip} of links) {
      const a = talentButtons.get(parent.id).button.getBoundingClientRect();
      const b = talentButtons.get(child.id).button.getBoundingClientRect();
      const ax = a.left + a.width/2 - bounds.left, ay = a.top + a.height/2 - bounds.top;
      const bx = b.left + b.width/2 - bounds.left, by = b.top + b.height/2 - bounds.top;
      let x,y,dx=0,dy=0,d;
      if (child.row === parent.row) {
        dx = Math.sign(bx-ax); x = bx-dx*(b.width/2+2); y = by;
        d = `M ${ax+dx*(a.width/2+2)} ${ay} L ${x} ${y}`;
      } else {
        dy = Math.sign(by-ay); x=bx; y=by-dy*(b.height/2+2);
        const start = ay+dy*(a.height/2+2);
        const bend = Math.abs(ax-bx)<1 ? start : (start+y)/2;
        d = `M ${ax} ${start} V ${bend} H ${x} V ${y}`;
      }
      line.setAttribute('d',d);
      tip.setAttribute('d',`M ${x} ${y} L ${x-dx*7-dy*4} ${y-dy*7+dx*4} L ${x-dx*7+dy*4} ${y-dy*7-dx*4} Z`);
      const met = (build.talents[parent.id] ?? 0) >= child.requiresRanks;
      const color = met ? '#ffd100' : '#657184';
      line.setAttribute('stroke',color); tip.setAttribute('fill',color);
    }
  }
  talentConnections.push(draw);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(draw).observe(grid);
  requestAnimationFrame(draw);
}

function createTalents() {
  for (const tree of data.trees) {
    const section = element('section', 'talent-tree');
    section.setAttribute('aria-label', `${tree.name} talents`);
    section.classList.add('art-card');
    section.style.setProperty('--art', `url("talent-backgrounds/${classId}-${tree.index}.webp")`);
    const heading = element('div', 'tree-heading');
    const total = element('span'); total.id = `tree-total-${tree.index}`;
    heading.append(element('h3', '', tree.name), total);
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
      button.addEventListener('click', event => {
        selectedId = talent.id;
        if(event.shiftKey){changeTalentExtent(true);return;}
        if ((build.talents[talent.id] ?? 0) < talent.maxRanks) changeRank(1);
        render();
      });
      button.addEventListener('contextmenu', event => {
        event.preventDefault(); selectedId = talent.id;
        if(event.shiftKey){changeTalentExtent(false);return;}
        if ((build.talents[talent.id] ?? 0) > 0) changeRank(-1);
        render();
      });
      talentButtons.set(talent.id, { button, rank });
      grid.append(button);
    }
    createTalentConnections(grid, data.talents.filter(t => t.tree === tree.index));
    section.append(heading, grid);
    $('talent-trees').append(section);
  }
}

function render() {
  swapControls?.render();
  const totals = talentTotals(data, build.talents);
  const spent = totals.reduce((sum, value) => sum + value, 0);
  $('character-description').textContent = `${build.race} · Level ${build.level}`;
  $('talents-total').textContent=totals.join(' / ');
  $('talents-points-left').textContent=`Points left: ${Math.max(0,build.level-9)-spent}`;
  $('tree-summary').replaceChildren(...data.trees.map(tree => {
    const row = element('div', '', tree.name);
    row.append(element('strong', '', String(totals[tree.index])));
    $(`tree-total-${tree.index}`).textContent = `${totals[tree.index]} / ${tree.maxPoints}`;
    return row;
  }));
  for (const [slot, { container, itemName, itemText, image, enchantLabel, enchantText }] of slotElements) {
    const item = build.gear[slot];
    const metadata = item && picker?.lookup(item.id);
    itemText.textContent = item ? metadata?.name || item.label || `Item #${item.id}` : 'Empty';
    image.src = iconUrl(metadata?.icon || SLOT_ICONS[slot]);
    if (metadata) itemName.className = `item-name ah-name-clip q${metadata.quality}`;
    else itemName.className = 'item-name ah-name-clip';
    const enchant=ENCHANTS.find(enchant=>enchant.id===item?.enchantId);
    if(enchantLabel){
    enchantText.textContent=enchant?enchantSummary(enchant)+(enchantAvailable(enchant)?'':' (future phase)'):'No enchant';
    enchantLabel.dataset.tone=bonusTone(enchantText.textContent);
    enchantLabel.tabIndex=enchant?0:-1;
    enchantLabel.classList.toggle('enchanted',Boolean(item?.enchantId));
    }
    itemName.removeAttribute('title');
    container.classList.toggle('has-item', Boolean(item));
    container.classList.toggle('equipment-invalid', Boolean(item && !picker?.usable(slot,item.id)));
    if (item) container.dataset.quality = String(metadata?.quality ?? 1);
    else delete container.dataset.quality;
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
  for (const draw of talentConnections) draw();
  const verifiedGear=Object.fromEntries(Object.entries(build.gear).filter(([slot,item])=>picker?.usable(slot,item.id)).map(([slot,item])=>[slot,picker.lookup(item.id)]));
  const sheet=characterStats(build,data,verifiedGear);
  $('gear-stats').replaceChildren(...sheet.groups.map(group=>{
    const section=element('details','character-stat-group');
    section.open=!collapsedStatGroups.has(group.name);
    const heading=element('summary','character-stat-toggle',group.name);
    // The browser handles mouse, touch and keyboard activation of a native details/summary.
    // Capture the next state before the native toggle so a subsequent render preserves it.
    heading.addEventListener('click',()=>{
      if(section.open)collapsedStatGroups.add(group.name);
      else collapsedStatGroups.delete(group.name);
    });
    section.append(heading);
    for(const stat of group.rows){
      const row=element('div','gear-stat');row.append(element('span','',stat.label),element('strong','',stat.value));
      row.dataset.tone=statTone(group.name,stat.label,stat.value);
      row.title=stat.note||sheet.sourceNote;
      if(stat.value==='—')row.classList.add('stat-unavailable');
      section.append(row);
    }
    return section;
  }));
  $('gear-stats').title=sheet.sourceNote;config?.refreshCompatibility();
  scheduleScrollingNames($('equipment'));
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

// Maximum energy depends on the talents (Vigor), so Starting Energy follows it: full stays full, a lower value is kept, and nothing exceeds the cap.
function energyCap(talents=build.talents){return maxEnergy(classId,data,talents);}
function classOptionsForTalents(previousTalents){
  if(!('startingEnergy' in build.classOptions))return build.classOptions;
  const before=energyCap(previousTalents),after=energyCap();
  return before===after?build.classOptions:{...build.classOptions,startingEnergy:reconcileStartingEnergy(build.classOptions.startingEnergy,before,after)};
}
function changeTalentExtent(maximise){
  try{const previous=build.talents;build.talents=(maximise?maximiseTalent:minimiseTalent)(data,build.talents,selectedId,build.level);build.classOptions=classOptionsForTalents(previous);persistDraft();renderClassOptions();render();refreshTooltip();feedback(`Talent rank ${build.talents[selectedId]||0}.`);}catch(error){feedback(error.message,true);}
}

function changeRank(delta) {
  if (selectedId === null) return;
  try {
    const previous = build.talents;
    build.talents = setTalentRank(data, build.talents, selectedId,
      (build.talents[selectedId] ?? 0) + delta, build.level);
    build.classOptions = classOptionsForTalents(previous);
    persistDraft(); renderClassOptions(); render(); refreshTooltip();
    feedback(`${data.talents.find(t => t.id === selectedId).name}: rank ${build.talents[selectedId] ?? 0}.`);
  } catch (error) { feedback(error.message, true); }
}

async function restoreSaved(candidate){
 const initial=restoreLegacyBuild(candidate,data),verified=await picker.repairCandidate(initial.build);
 const changes=[...initial.changes,...verified.changes];
 if(changes.length)try{localStorage.setItem(`octosim.recovery.${classId}.${Date.now()}`,JSON.stringify(candidate));}catch{}
 return {build:verified.build,changes};
}

function downloadJson(value,filename){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=element('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// The selector beside the character panel always shows one slot; the matching slot is highlighted.
function markActiveSlot(active) {
  for (const [slot, { container }] of slotElements) container.classList.toggle('slot-active', slot === active);
}

let activeSlot = 'head';
function openItem(slot, options = {}) {
  activeSlot = slot;
  markActiveSlot(slot);
  picker.open(slot, options);
}

// Remember what the visitor was looking at so that leaving for another OctoBot page and coming back feels unchanged.
function captureUi() {
  const panels = {}, groups = {};
  for (const card of document.querySelectorAll('.planner-column > section.card')) panels[card.id] = !$(`${card.id}-body`)?.hidden;
  for (const body of document.querySelectorAll('.buff-group-body')) groups[body.id.replace(/^buff-group-/, '')] = !body.hidden;
  return {
    slot: activeSlot, filters: picker?.filters?.(), panels, groups,
    optionsOpen: document.querySelector('.character-options')?.open ?? null,
    collapsedStats: [...collapsedStatGroups], scrollY: window.scrollY, itemScroll: $('item-results')?.scrollTop || 0,
  };
}
function restoreUi(state) {
  if (!state) return;
  for (const [id, open] of Object.entries(state.panels)) {
    const body = $(`${id}-body`), toggle = body && document.querySelector(`[aria-controls="${id}-body"]`);
    if (body && toggle) { body.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); }
  }
  for (const [id, open] of Object.entries(state.groups)) {
    const body = document.getElementById(`buff-group-${id}`), toggle = body && document.querySelector(`[aria-controls="buff-group-${id}"]`);
    if (body && toggle) { body.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); }
  }
  if (state.optionsOpen !== null && document.querySelector('.character-options')) document.querySelector('.character-options').open = state.optionsOpen;
  scheduleScrollingNames(document);
  // Scroll positions are restored once the page and the item list have had time to lay out.
  for (const delay of [150, 700]) setTimeout(() => { window.scrollTo(0, state.scrollY); if (delay > 150 && $('item-results')) $('item-results').scrollTop = state.itemScroll; }, delay);
}
function saveUiState() { if (tabStorage && selectedView !== 'classes' && picker) saveUi(tabStorage, classId, captureUi()); }
if (typeof ResizeObserver === 'function') new ResizeObserver(() => scheduleScrollingNames($('equipment'))).observe($('equipment'));
window.addEventListener('pagehide', saveUiState);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveUiState(); });

// Saved builds from every class, newest first. Choosing one of another class opens that class's planner with the build loaded.
async function showSavedBuilds(){
  const entries=await library.listAll();
  const query=$('saved-build-search').value.trim().toLowerCase(),only=$('saved-class-filter').value;
  const container=$('saved-builds');container.replaceChildren();
  const shown=entries.filter(entry=>{
    if(only&&entry.classId!==only)return false;
    if(!query)return true;
    const cls=classDefinition(entry.classId);
    return [entry.name,cls.name].some(text=>String(text).toLowerCase().includes(query));
  });
  if(!entries.length)container.append(element('p','muted','No named builds saved yet. Use Save to keep a build in this browser.'));
  else if(!shown.length)container.append(element('p','muted','No saved builds match this search.'));
  for(const entry of shown){
    const cls=classDefinition(entry.classId),row=element('div','saved-row');
    row.style.setProperty('--class-colour',cls.colour);
    const icon=gameIcon(`classicon_${entry.classId}`,'row-icon saved-class-icon');icon.alt=cls.name;
    const label=element('span','saved-label'),title=element('span','saved-title',entry.name);title.style.color=cls.colour;
    label.append(title,element('small','',`Level ${entry.build?.level??'?'} ${cls.name} · ${new Date(entry.savedAt).toLocaleDateString()}`));
    const actions=element('div','saved-actions');
    const load=element('button','','Load');load.type='button';
    load.addEventListener('click',async()=>{
      try{
        if(entry.classId!==classId){
          setPendingBuild(tabStorage,{classId:entry.classId,build:entry.build});
          $('load-dialog').close();
          location.assign(`?class=${entry.classId}`);
          return;
        }
        const restored=await restoreSaved(entry.build);applyBuild(restored.build,'Saved build loaded.'+(restored.changes.length?' '+restored.changes.join('; ')+'. Original saved copy retained.':''));$('load-dialog').close();
      }catch(error){feedback(error.message,true);}
    });
    actions.append(load);
    if(!entry.legacy){
      const remove=element('button','delete-build','Delete');remove.type='button';remove.setAttribute('aria-label',`Delete ${entry.name}`);
      remove.addEventListener('click',async()=>{try{await library.removeFrom(entry.classId,entry.id);row.replaceChildren(element('span','',`Deleted “${entry.name}”`));const undo=element('button','','Undo');undo.type='button';undo.addEventListener('click',async()=>{try{await library.putRecord(entry);await showSavedBuilds();}catch(error){feedback(error.message,true);}});row.append(undo);}catch(error){feedback(error.message,true);}});
      actions.append(remove);
    }
    row.append(icon,label,actions);container.append(row);
  }
}

function createClassOptions(){
  for(const option of CLASS_OPTIONS[classId]){
    const label=element('label','field',option.label),input=element(option.values?'select':'input');input.id=`class-option-${option.key}`;
    if(option.values){for(const value of option.values){const node=element('option','',value);node.value=value;input.append(node);}}
    else{input.type='number';input.min=option.min;input.max=option.max;}
    input.addEventListener('change',()=>{try{const value=option.values?input.value:Number(input.value);const controls={...build.controls};if(value!=='None'&&['mhPoison','mhImbue','ohPoison'].includes(option.key))controls.buffIds=controls.buffIds.filter(id=>id!==`wizard-oil-${option.key==='ohPoison'?'oh':'mh'}`);applyBuild({...build,controls,classOptions:{...build.classOptions,[option.key]:value}},'Class options updated.');config.render();}catch(error){feedback(error.message,true);renderClassOptions();}});
    label.append(input);$('class-options').append(label);
    // Seals, auras, stances, forms, poisons, pets and similar choices show their icon beside the name, in the list and when closed.
    if(option.values&&optionHasIcons(option.key))optionPickers.set(option.key,setupIconSelect(document,input,{label:option.label,iconFor:value=>{const name=optionIcon(option.key,value);return name?iconUrl(name):null;}}));
  }
}
const optionPickers=new Map();
function renderClassOptions(){
  for(const option of CLASS_OPTIONS[classId]){$(`class-option-${option.key}`).value=build.classOptions[option.key];optionPickers.get(option.key)?.sync();}
  const energy=$('class-option-startingEnergy');if(energy)energy.max=String(energyCap());
}


function wireControls() {
  // Every dialog: the × button, Escape (native), and a click on the backdrop all close it.
  wireDialogs(document);
  picker = itemPicker({
    getBuild: () => ({...build,gear:Object.fromEntries(Object.entries(build.gear).map(([slot,item])=>[slot,{...item,twoHanded:picker?.lookup(item.id)?.slot===17,subclass:picker?.lookup(item.id)?.subclass}]))}),
    onEquip: (slot,item) => {
      build.gear[slot] = {id:item.id,label:item.label,...(item.enchantId?{enchantId:item.enchantId}:{})};
      if(item.twoHanded) delete build.gear.offhand;
      if(slot==='ranged')for(const error of equipmentErrors(build,id=>picker.lookup(id)))if(['ammo','quiver'].includes(error.slot)&&picker.lookup(error.id)&&/Ammunition or container does not match|Select a bow/.test(error.reason))delete build.gear[error.slot];
      persistDraft();render();feedback(`${SLOTS[slot]} equipped.`);
    },
    onClear: slot => {delete build.gear[slot];if(slot==='ranged'){delete build.gear.ammo;delete build.gear.quiver;}persistDraft();render();feedback(`${SLOTS[slot]} cleared.`);},
  });
  swapControls=trinketSwapControls({getBuild:()=>build,onChange:candidate=>{try{applyBuild(candidate,'Trinket swap updated.');}catch(error){feedback(error.message,true);}},openPicker:(slot,options)=>{markActiveSlot(null);return picker.open(slot,options);},inspect:id=>picker.inspect(id)});
  settingsControls=settings({getBuild:()=>build,onChange:planning=>{build=validateBuild({...build,planning},data);persistDraft();render();},onError:error=>feedback(error.message,true)});
  $('reset-gear').addEventListener('click',()=>applyBuild(resetPlannerSection(build,'equipment'),'Equipment reset.'));
  $('clear-talents').addEventListener('click',()=>{const previous=build.talents,next=resetPlannerSection(build,'talents');const before=energyCap(previous),after=maxEnergy(classId,data,next.talents);if('startingEnergy' in next.classOptions&&before!==after)next.classOptions={...next.classOptions,startingEnergy:reconcileStartingEnergy(next.classOptions.startingEnergy,before,after)};applyBuild(next,'Talents reset.');});
  for(const [id,section,label] of [['reset-buffs','buffs','Buffs & Debuffs'],['reset-rotation','rotation','Rotation'],['reset-settings','build-settings','Settings']])$(id).addEventListener('click',()=>{applyBuild(resetPlannerSection(build,section),`${label} reset.`);if(section==='rotation'){for(const field of ['rotation-name','rotation-save-status'])$(field)[field==='rotation-name'?'value':'textContent']='';$('rotation-add').value='';}});
  $('reset-results').addEventListener('click',()=>{$('simulation-output').replaceChildren();feedback('Results reset.');});
  $('reset-combat-log').addEventListener('click',()=>{$('combat-log-output').replaceChildren(element('p','small muted','Run a simulation to see the combat log.'));feedback('Combat log reset.');});
  config=configuration({getBuild:()=>build,getTalents:()=>data,lookupGear:id=>picker?.lookup(id),onChange:controls=>{const classOptions={...build.classOptions};if(controls.buffIds.includes('wizard-oil-mh')){if(classId==='rogue')classOptions.mhPoison='None';if(classId==='shaman')classOptions.mhImbue='None';}if(controls.buffIds.includes('wizard-oil-oh')&&classId==='rogue')classOptions.ohPoison='None';build=validateBuild({...build,classOptions,controls},data);renderClassOptions();persistDraft();render();}});
  for (const [id, key] of [['build-name', 'name'], ['character-race', 'race'], ['character-level', 'level']]) {
    $(id).addEventListener('change', async () => {
      try {
        const restored=restoreLegacyBuild({ ...build, [key]: key === 'level' ? Number($(id).value) : $(id).value }, data);
        const repaired=await picker.repairCandidate(restored.build);
        repaired.changes.push(...restored.changes);
        if(repaired.changes.length)try{localStorage.setItem(`octosim.recovery.${classId}.${Date.now()}`,JSON.stringify(build));}catch{}
        build = repaired.build;
        $(id).value = build[key]; persistDraft(); render(); feedback('Build updated.'); picker.verifyGear().then(warnings => { if(warnings.length) feedback(`Equipment needs attention: ${warnings.join(' ')}`, true); }).catch(()=>{});
      } catch (error) { $(id).value = build[key]; feedback(error.message, true); }
    });
  }
  let levelTimer;
  $('character-level').addEventListener('input', () => { clearTimeout(levelTimer); levelTimer = setTimeout(() => $('character-level').dispatchEvent(new Event('change')), 300); });
  const resetAll=()=>applyBuild(newBuild(classId),'Build reset. Named saved builds are still available.');
  $('reset-all').hidden=false;
  $('reset-all').addEventListener('click',resetAll);
  $('save-build').addEventListener('click',async()=>{
    try{$('save-name').value=defaultSaveName($('build-name').value, build.race, classId, build.level);$('save-error').textContent='';$('save-dialog').showModal();$('save-name').focus();$('save-name').select();}
    catch(error){feedback(error.message,true);}
  });
  $('save-form').addEventListener('submit',async event=>{
    event.preventDefault();
    try{const next=validateBuild({...build,name:defaultSaveName($('save-name').value,build.race,classId,build.level)},data);await picker.verifyCandidate(next);await library.save(next);applyBuild(next,`Saved “${next.name}” in this browser.`);$('save-dialog').close();}
    catch(error){$('save-error').textContent=error.message;}
  });
  $('load-build').addEventListener('click',async()=>{try{$('saved-build-search').value='';$('saved-class-filter').value='';$('saved-library-status').textContent='';await showSavedBuilds();$('load-dialog').showModal();}catch(error){feedback(error.message,true);}});
  for(const cls of CLASSES){const option=element('option','',cls.name);option.value=cls.id;$('saved-class-filter').append(option);}
  $('saved-build-search').addEventListener('input',()=>showSavedBuilds().catch(error=>feedback(error.message,true)));
  $('saved-class-filter').addEventListener('change',()=>showSavedBuilds().catch(error=>feedback(error.message,true)));
  $('export-library').addEventListener('click',async()=>{
    try{const entries=(await library.listAll()).filter(entry=>!entry.legacy);const backup={librarySchema:2,exportedAt:new Date().toISOString(),builds:entries.map(entry=>entry.build)};downloadJson(backup,'octosim_builds.json');$('saved-library-status').textContent=`Exported ${entries.length} builds from all classes.`;}
    catch(error){$('saved-library-status').textContent=error.message;}
  });
  $('import-library').addEventListener('click',()=>$('import-library-file').click());
  $('import-library-file').addEventListener('change',async()=>{
    try{
      const file=$('import-library-file').files[0];if(!file)return;if(file.size>8*1024*1024)throw new Error('Build backups must be smaller than 8 MB.');
      const backup=JSON.parse(await file.text());
      // Version 1 files hold one class; version 2 files hold any mix. Both import into the right class from any planner.
      if(![1,2].includes(backup.librarySchema)||!Array.isArray(backup.builds))throw new Error('This is not an OctoSim builds backup.');
      const mine=backup.builds.filter(candidate=>candidate?.classId===classId),others=backup.builds.filter(candidate=>candidate?.classId!==classId);
      for(const candidate of mine)await picker.verifyCandidate(validateBuild(candidate,data));
      let count=0;
      if(mine.length)count+=await library.importBuilds(mine);
      if(others.length)count+=await library.importForeign(others);
      await showSavedBuilds();$('saved-library-status').textContent=`Imported ${count} builds.`;
    }catch(error){$('saved-library-status').textContent=error.message;}
    finally{$('import-library-file').value='';}
  });
  $('share-build').addEventListener('click', async () => {
    try {
      await picker.verifyCandidate(build);
      const url = new URL(location.href); url.searchParams.set('class',classId); url.hash = `build=${encodeBuild(build)}`;
      $('share-url').value = url.href; $('share-dialog').showModal();
    } catch (error) { feedback(error.message, true); }
  });
  $('copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('share-url').value); $('share-dialog').close(); feedback('Build link copied.'); }
    catch { $('share-url').focus(); $('share-url').select(); feedback('Copy the selected link to share your build.'); }
  });
  $('export-build').addEventListener('click', async () => {
    try{await picker.verifyCandidate(build);}catch(error){feedback(error.message,true);return;}
    const url = URL.createObjectURL(new Blob([JSON.stringify(build, null, 2)], { type: 'application/json' }));
    const link = element('a'); link.href = url;
    link.download = `${build.name.replace(/[^a-zA-Z0-9_-]/g, '_') || `${currentClass.name}_Build`}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback('Build exported.');
  });
  $('import-build').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    try {
      const file = $('import-file').files[0];
      if (!file) return;
      if (file.size > 64000) throw new Error('Build files must be smaller than 64 KB.');
      const imported=JSON.parse(await file.text());
      if(imported.classId!==classId){classDefinition(imported.classId);const response=await fetch(new URL(`./data/talents/${imported.classId}.json`,import.meta.url));if(!response.ok)throw new Error('Class data unavailable.');const verified=validateBuild(imported,await response.json());const url=new URL(location.href);url.searchParams.set('class',verified.classId);url.hash=`build=${encodeBuild(verified)}`;location.href=url.href;return;}
      await picker.verifyCandidate(validateBuild(imported,data));
      applyBuild(imported, 'Build imported.');
    } catch (error) { feedback(`Could not import build: ${error.message}`, true); }
    finally { $('import-file').value = ''; }
  });
  window.addEventListener('hashchange', async () => {
    if (!location.hash.startsWith('#build=')) return;
    try { const candidate=decodeBuild(location.hash.slice(7),data);await picker.verifyCandidate(candidate);applyBuild(candidate,'Shared build loaded.'); }
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
  if (selectedView === 'classes') return;
  document.body.classList.add('planner-view');
  document.body.style.setProperty('--class-colour',currentClass.colour);
  $('character-race').replaceChildren(...CLASS_RACES[classId].map(race=>{const option=element('option','',race);option.value=race;return option;}));
  if (racePicker) racePicker.sync(); else racePicker = setupRacePicker(document, $('character-race'), undefined, { iconFor: race => raceIconUrl(race, build?.gender || 'male') });
  $('class-selection').hidden = true;
  try {
    const response = await fetch(new URL(`./data/talents/${classId}.json`, import.meta.url));
    if (!response.ok) throw new Error(`Talent data request failed (${response.status}).`);
    data = await response.json();
    if(data.classId!==classId||!Array.isArray(data.talents)||data.talents.length<30||data.trees.length!==3)throw new Error('Incomplete class talent data.');
    library=buildLibrary(classId,value=>validateBuild(value,data),{legacyValidate:value=>restoreLegacyBuild(value,data).build});
    document.querySelector('.character-summary>strong').textContent=currentClass.name;
    for(const image of document.querySelectorAll('.class-mark,.rail-class-icon')){image.src=iconUrl(`classicon_${classId}`);image.alt=currentClass.name;}
    createSlots();
    if(['paladin','druid','shaman'].includes(classId)){$('slots-weapons').setAttribute('aria-label','Weapons and relic');const slot=$('slots-weapons').querySelector('.slot:last-child');slot.querySelector('.slot-name').textContent='Relic';slot.querySelector('button').setAttribute('aria-label','Edit Relic');}
    createTalents(); createClassOptions(); wireControls(); createDisclosures();
    let message = 'Planner ready.';
    try {
      const stored = pendingBuild ? null : (localStorage.getItem(DRAFT_KEY) || (classId==='warrior'?localStorage.getItem('octosim.planner.draft.v1'):null));
      if (pendingBuild) { const restored=await restoreSaved(pendingBuild.build);build=restored.build;message='Saved build loaded.'+(restored.changes.length?' '+restored.changes.join('; ')+'. Original saved copy retained.':''); }
      else if (stored) { const restored=await restoreSaved(JSON.parse(stored));build=restored.build;message='Your previous build was restored.'+(restored.changes.length?' '+restored.changes.join('; ')+'.':''); }
    } catch { message = 'Browser storage could not be restored. Import or share a build to load it.'; }
    let invalidShare = null;
    if (location.hash.startsWith('#build=')) {
      try { const candidate=decodeBuild(location.hash.slice(7),data);await picker.verifyCandidate(candidate);build=candidate;message='Shared build loaded.'; }
      catch (error) { invalidShare = error.message; }
    }
    applyBuild(build, message);
    const startSlot = savedUi?.slot && SLOTS[savedUi.slot] && slotAllowed(classId, savedUi.slot) ? savedUi.slot : 'head';
    openItem(startSlot, savedUi?.filters ? { filters: savedUi.filters } : {});
    restoreUi(savedUi);
    if (invalidShare) feedback(invalidShare, true);
    $('planner').hidden = false;
  } catch (error) {
    $('startup-error').hidden = false;
    $('startup-error').textContent = `The planner could not load: ${error.message} Please reload to try again.`;
  }
}

function restoreNavigation() {
  if (plannerView(location.href, selectedView) !== selectedView) {
    markInternalReload(tabStorage);
    location.reload();
    return;
  }
  // Back/forward cache restores do not re-run this module.
  try{if(tabStorage)rememberPlannerView(selectedView,tabStorage);}catch{}
}
window.addEventListener('hashchange', restoreNavigation);
window.addEventListener('popstate', restoreNavigation);
window.addEventListener('pageshow', restoreNavigation);
initialise();
