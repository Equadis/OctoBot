import {trinketSwapControls} from './trinket-swaps.mjs?v=20261113-swaps1';
import {resetPlannerSection} from './core/panel-resets.mjs?v=20261113-swaps1';
import {statTone,enchantSummary,bonusTone} from './core/presentation.mjs?v=20261112-display1';
import {equipmentErrors} from './core/items.mjs?v=20261113-swaps1';
import {CLASS_RACES,slotAllowed} from './core/class-rules.mjs?v=20261112-audit1';
import {characterStats} from './core/character-stats.mjs?v=20261113-swaps1';
import {CLASS_OPTIONS} from './core/class-options.mjs?v=20261112-rotations1';
import { classDefinition, PRIMARY_PROFESSIONS, SECONDARY_SKILLS } from './core/classes.mjs?v=20261112-audit1';
import { buildLibrary, BUILDS_PER_CLASS } from './core/build-library.mjs?v=20261112-audit1';
import { validateTalents, setTalentRank, talentTotals, maximiseTalent, minimiseTalent } from './core/talents.mjs?v=20261112-audit1';
import { SLOTS, newBuild, validateBuild, encodeBuild, decodeBuild, restoreLegacyBuild } from './core/builds.mjs?v=20261113-swaps1';
import { itemPicker } from './item-picker.mjs?v=20261113-swaps1';
import { ENCHANTS } from './core/equipment-options.mjs?v=20261113-swaps1';
import { settings } from './settings.mjs?v=20261112-polish2';
import { configuration } from './configuration.mjs?v=20261112-rotations1';
import { attachTooltip, refreshTooltip, equipmentTooltip } from './tooltip.mjs?v=20261113-swaps1';
import { CLASSES, SLOT_ICONS, iconUrl, plannerView, rememberPlannerView, rememberedPlannerView } from './core/interface.mjs?v=20261112-navigation1';

const $ = id => document.getElementById(id);
let savedView=null;try{savedView=rememberedPlannerView(localStorage);}catch{}
const selectedView=plannerView(location.href,savedView);
const classId=selectedView==='classes'?'warrior':selectedView;
try{rememberPlannerView(selectedView,localStorage);}catch{}
if(selectedView!=='classes'){
 const canonical=new URL(location.href);if(!canonical.searchParams.has('class')){canonical.searchParams.set('class',classId);history.replaceState(null,'',canonical);}
}
const currentClass=classDefinition(classId);
const DRAFT_KEY=`octosim.planner.draft.${classId}.v2`;
let library;
let picker, config, settingsControls, swapControls;
let data, build = newBuild(classId), selectedId = null, editingSlot = null;
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
    if (cls.available) card.href = `?class=${cls.id}&v=20261111-classes1`;
    else card.setAttribute('aria-disabled', 'true');
    const title = element('div', 'class-card-title');
    title.append(element('strong', '', cls.name));
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
  persistDraft();
  config?.render();
  settingsControls?.render();
  renderSkills();
  renderClassOptions();
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
    attachTooltip(button, async () => {
      const item = build.gear[slot];
      if (!item) return {title:SLOTS[slot],lines:['Empty']};
      const metadata = await picker.inspect(item.id);
      return equipmentTooltip(metadata, item);
    });
    const enchantLabel=element('span','slot-enchant','No enchant');
    attachTooltip(enchantLabel,()=>{const enchant=ENCHANTS.find(e=>e.id===build.gear[slot]?.enchantId);return {title:enchant?.name||'No enchant',lines:enchant?[enchantSummary(enchant)]:[]};});
    container.append(button, enchantLabel);
    slotElements.set(slot, { container, itemName, enchantLabel, image: button.querySelector('img') });
    const left = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist'].includes(slot);
    const weapons = ['mainhand', 'offhand', 'ranged'].includes(slot);
    const extra=['ammo','quiver'].includes(slot),appearance=['shirt','tabard'].includes(slot);
    if(!slotAllowed(classId,slot))container.hidden=true;
    container.dataset.side = weapons ? 'weapon' : left ? 'left' : 'right';
    $(appearance?'slots-appearance':extra?'slots-ammo':weapons ? 'slots-weapons' : left ? 'slots-left' : 'slots-right').append(container);
  }
}

function createTalents() {
  for (const tree of data.trees) {
    const section = element('section', 'talent-tree');
    section.setAttribute('aria-label', `${tree.name} talents`);
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
    section.append(heading, grid);
    $('talent-trees').append(section);
  }
}

function render() {
  swapControls?.render();
  const totals = talentTotals(data, build.talents);
  const spent = totals.reduce((sum, value) => sum + value, 0);
  $('character-description').textContent = `${build.race} · Level ${build.level}`;
  $('talent-split').textContent = totals.join(' / ');
  $('points-left').textContent = `${Math.max(0, build.level - 9) - spent} points left`;
  $('talents-total').textContent=totals.join(' / ');
  $('talents-points-left').textContent=`Points left: ${Math.max(0,build.level-9)-spent}`;
  $('equipment-count').textContent = `${Object.keys(build.gear).length} / ${Object.keys(SLOTS).filter(slot=>slotAllowed(classId,slot)).length} slots planned`;
  $('tree-summary').replaceChildren(...data.trees.map(tree => {
    const row = element('div', '', tree.name);
    row.append(element('strong', '', String(totals[tree.index])));
    $(`tree-total-${tree.index}`).textContent = `${totals[tree.index]} / ${tree.maxPoints}`;
    return row;
  }));
  for (const [slot, { container, itemName, image, enchantLabel }] of slotElements) {
    const item = build.gear[slot];
    const metadata = item && picker?.lookup(item.id);
    itemName.textContent = item ? metadata?.name || item.label || `Item #${item.id}` : 'Empty';
    image.src = iconUrl(metadata?.icon || SLOT_ICONS[slot]);
    if (metadata) itemName.className = `item-name q${metadata.quality}`;
    else itemName.className = 'item-name';
    const enchant=ENCHANTS.find(enchant=>enchant.id===item?.enchantId);
    enchantLabel.textContent=enchantSummary(enchant);
    enchantLabel.dataset.tone=bonusTone(enchantLabel.textContent);
    enchantLabel.tabIndex=enchant?0:-1;
    enchantLabel.classList.toggle('enchanted',Boolean(item?.enchantId));
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
  const verifiedGear=Object.fromEntries(Object.entries(build.gear).filter(([slot,item])=>picker?.usable(slot,item.id)).map(([slot,item])=>[slot,picker.lookup(item.id)]));
  const sheet=characterStats(build,data,verifiedGear);
  $('gear-stats').replaceChildren(...sheet.groups.map(group=>{
    const section=element('section','character-stat-group');
    const heading=element('h3','',group.name);section.append(heading);
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

function changeTalentExtent(maximise){
  try{build.talents=(maximise?maximiseTalent:minimiseTalent)(data,build.talents,selectedId,build.level);persistDraft();render();refreshTooltip();feedback(`Talent rank ${build.talents[selectedId]||0}.`);}catch(error){feedback(error.message,true);}
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

function openItem(slot) {
  picker.open(slot);
}

async function showSavedBuilds(){
  const entries=await library.list();
  $('saved-build-count').textContent=`${entries.length} / ${BUILDS_PER_CLASS} ${currentClass.name} builds`;
  const query=$('saved-build-search').value.trim().toLowerCase();
  $('saved-builds').replaceChildren();
  if(!entries.length)$('saved-builds').append(element('p','muted','No named builds saved yet.'));
  for(const entry of entries.filter(entry=>entry.name.toLowerCase().includes(query))){
    const row=element('div','saved-row');
    const label=element('span','',entry.name);
    label.append(element('small','',`Level ${entry.build.level} ${currentClass.name} · ${new Date(entry.savedAt).toLocaleDateString()}`));
    const actions=element('div','saved-actions');
    const load=element('button','','Load');load.type='button';
    load.addEventListener('click',async()=>{try{const restored=await restoreSaved(entry.build);applyBuild(restored.build,'Saved build loaded.'+(restored.changes.length?' '+restored.changes.join('; ')+'. Original saved copy retained.':''));$('load-dialog').close();}catch(error){feedback(error.message,true);}});
    const remove=element('button','delete-build','Delete');remove.type='button';remove.setAttribute('aria-label',`Delete ${entry.name}`);
    remove.addEventListener('click',async()=>{try{await library.remove(entry.name);row.replaceChildren(element('span','',`Deleted “${entry.name}”`));const undo=element('button','','Undo');undo.addEventListener('click',async()=>{try{await library.save(entry.build,entry.savedAt);await showSavedBuilds();}catch(error){feedback(error.message,true);}});row.append(undo);$('saved-build-count').textContent=`${(await library.list()).length} / ${BUILDS_PER_CLASS} ${currentClass.name} builds`;}catch(error){feedback(error.message,true);}});
    actions.append(load,remove);row.append(label,actions);$('saved-builds').append(row);
  }
}

function createClassOptions(){
  for(const option of CLASS_OPTIONS[classId]){
    const label=element('label','field',option.label),input=element(option.values?'select':'input');input.id=`class-option-${option.key}`;
    if(option.values){for(const value of option.values){const node=element('option','',value);node.value=value;input.append(node);}}
    else{input.type='number';input.min=option.min;input.max=option.max;}
    input.addEventListener('change',()=>{try{const value=option.values?input.value:Number(input.value);const controls={...build.controls};if(value!=='None'&&['mhPoison','mhImbue','ohPoison'].includes(option.key))controls.buffIds=controls.buffIds.filter(id=>id!==`wizard-oil-${option.key==='ohPoison'?'oh':'mh'}`);applyBuild({...build,controls,classOptions:{...build.classOptions,[option.key]:value}},'Class options updated.');config.render();}catch(error){feedback(error.message,true);renderClassOptions();}});
    label.append(input);$('class-options').append(label);
  }
}
function renderClassOptions(){for(const option of CLASS_OPTIONS[classId])$(`class-option-${option.key}`).value=build.classOptions[option.key];}

function createSkills(){
  const container=$('profession-controls');
  for(let index=0;index<2;index++){
    const row=element('div','profession-row'),label=element('label','field',`Profession ${index+1}`),select=element('select');select.id=`profession-${index}`;select.setAttribute('aria-label',`Profession ${index+1}`);
    for(const name of ['',...PRIMARY_PROFESSIONS]){const option=element('option','',name||'None');option.value=name;select.append(option);}
    const rankLabel=element('label','field','Skill'),rank=element('input');rank.type='number';rank.min=1;rank.max=300;rank.id=`profession-rank-${index}`;rank.setAttribute('aria-label',`Profession ${index+1} skill`);label.append(select);rankLabel.append(rank);row.append(label,rankLabel);container.append(row);
    for(const field of [select,rank])field.addEventListener('change',updateSkills);
  }
  for(const name of SECONDARY_SKILLS){const label=element('label','field',name),rank=element('input');rank.id=`skill-${name.replaceAll(' ','-')}`;rank.type='number';rank.min=0;rank.max=300;label.append(rank);container.append(label);rank.addEventListener('change',updateSkills);}
}
function renderSkills(){
  const selected=Object.keys(build.skills).filter(name=>PRIMARY_PROFESSIONS.includes(name));
  for(let i=0;i<2;i++){$(`profession-${i}`).value=selected[i]||'';$(`profession-rank-${i}`).value=build.skills[selected[i]]||300;$(`profession-rank-${i}`).disabled=!selected[i];}
  for(const name of SECONDARY_SKILLS)$(`skill-${name.replaceAll(' ','-')}`).value=build.skills[name]||0;
}
async function updateSkills(){
  const skills={};
  for(let i=0;i<2;i++){const name=$(`profession-${i}`).value;if(name){if(skills[name]){feedback('Select different primary professions.',true);renderSkills();return;}skills[name]=Number($(`profession-rank-${i}`).value);}}
  for(const name of SECONDARY_SKILLS){const rank=Number($(`skill-${name.replaceAll(' ','-')}`).value);if(rank)skills[name]=rank;}
  try{const restored=await restoreSaved({...build,skills});applyBuild(restored.build,'Profession skills updated.');}catch(error){feedback(error.message,true);renderSkills();}
}

function wireControls() {
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  picker = itemPicker({
    getBuild: () => ({...build,gear:Object.fromEntries(Object.entries(build.gear).map(([slot,item])=>[slot,{...item,twoHanded:picker?.lookup(item.id)?.slot===17,subclass:picker?.lookup(item.id)?.subclass}]))}),
    onEquip: (slot,item) => {
      build.gear[slot] = {id:item.id,label:item.label,...(item.enchantId?{enchantId:item.enchantId}:{})};
      if(item.twoHanded) delete build.gear.offhand;
      for(const error of equipmentErrors(build,id=>picker.lookup(id)))delete build.gear[error.slot];
      persistDraft();render();feedback(`${SLOTS[slot]} equipped.`);
    },
    onClear: slot => {delete build.gear[slot];for(const error of equipmentErrors(build,id=>picker.lookup(id)))delete build.gear[error.slot];persistDraft();render();feedback(`${SLOTS[slot]} cleared.`);},
  });
  swapControls=trinketSwapControls({getBuild:()=>build,onChange:candidate=>{try{applyBuild(candidate,'Trinket swap updated.');}catch(error){feedback(error.message,true);}},openPicker:(slot,options)=>picker.open(slot,options),inspect:id=>picker.inspect(id)});
  settingsControls=settings({getBuild:()=>build,onChange:planning=>{build=validateBuild({...build,planning},data);persistDraft();render();},onError:error=>feedback(error.message,true)});
  $('reset-gear').addEventListener('click',()=>applyBuild(resetPlannerSection(build,'equipment'),'Equipment reset.'));
  $('clear-talents').addEventListener('click',()=>applyBuild(resetPlannerSection(build,'talents'),'Talents reset.'));
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
  $('new-build').addEventListener('click',resetAll);
  $('reset-all').hidden=false;
  $('reset-all').addEventListener('click',resetAll);
  $('save-build').addEventListener('click',async()=>{
    try{$('save-name').value=build.name;$('save-build-count').textContent=`${(await library.list()).length} / ${BUILDS_PER_CLASS} ${currentClass.name} builds`;$('save-error').textContent='';$('save-dialog').showModal();$('save-name').focus();$('save-name').select();}
    catch(error){feedback(error.message,true);}
  });
  $('save-form').addEventListener('submit',async event=>{
    event.preventDefault();
    try{const next=validateBuild({...build,name:$('save-name').value.trim()},data);await picker.verifyCandidate(next);await library.save(next);applyBuild(next,`Saved “${next.name}” in this browser.`);$('save-dialog').close();}
    catch(error){$('save-error').textContent=error.message;}
  });
  $('load-build').addEventListener('click',async()=>{try{$('saved-build-search').value='';$('saved-library-status').textContent='';await showSavedBuilds();$('load-dialog').showModal();}catch(error){feedback(error.message,true);}});
  $('saved-build-search').addEventListener('input',()=>showSavedBuilds().catch(error=>feedback(error.message,true)));
  $('export-library').addEventListener('click',async()=>{
    try{const entries=await library.list();const backup={librarySchema:1,classId,exportedAt:new Date().toISOString(),builds:entries.map(entry=>entry.build)};downloadJson(backup,`${currentClass.name}_builds.json`);$('saved-library-status').textContent=`Exported ${entries.length} builds.`;}
    catch(error){$('saved-library-status').textContent=error.message;}
  });
  $('import-library').addEventListener('click',()=>$('import-library-file').click());
  $('import-library-file').addEventListener('change',async()=>{
    try{const file=$('import-library-file').files[0];if(!file)return;if(file.size>8*1024*1024)throw new Error('Class backups must be smaller than 8 MB.');const backup=JSON.parse(await file.text());if(backup.librarySchema!==1||backup.classId!==classId)throw new Error('Open the matching class before importing this backup.');if(!Array.isArray(backup.builds))throw new Error('Invalid class backup.');for(const candidate of backup.builds)await picker.verifyCandidate(validateBuild(candidate,data));const count=await library.importBuilds(backup.builds);await showSavedBuilds();$('saved-library-status').textContent=`Imported ${count} builds.`;}
    catch(error){$('saved-library-status').textContent=error.message;}
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
  $('class-selection').hidden = true;
  try {
    const response = await fetch(new URL(`./data/talents/${classId}.json`, import.meta.url));
    if (!response.ok) throw new Error(`Talent data request failed (${response.status}).`);
    data = await response.json();
    if(data.classId!==classId||!Array.isArray(data.talents)||data.talents.length<30||data.trees.length!==3)throw new Error('Incomplete class talent data.');
    library=buildLibrary(classId,value=>validateBuild(value,data),{legacyValidate:value=>restoreLegacyBuild(value,data).build});
    document.querySelector('.rail-brand span').textContent=`${currentClass.name} Build Planner`;
    document.querySelector('.character-summary>strong').textContent=currentClass.name;
    for(const image of document.querySelectorAll('.class-mark,.rail-class-icon')){image.src=iconUrl(`classicon_${classId}`);image.alt=currentClass.name;}
    createSlots();
    if(['paladin','druid','shaman'].includes(classId)){$('slots-weapons').setAttribute('aria-label','Weapons and relic');const slot=$('slots-weapons').querySelector('.slot:last-child');slot.querySelector('.slot-name').textContent='Relic';slot.querySelector('button').setAttribute('aria-label','Edit Relic');}
    createTalents(); createSkills(); createClassOptions(); wireControls(); createDisclosures();
    let message = 'Planner ready.';
    try {
      const stored = localStorage.getItem(DRAFT_KEY) || (classId==='warrior'?localStorage.getItem('octosim.planner.draft.v1'):null);
      if (stored) { const restored=await restoreSaved(JSON.parse(stored));build=restored.build;message='Your previous build was restored.'+(restored.changes.length?' '+restored.changes.join('; ')+'.':''); }
    } catch { message = 'Browser storage could not be restored. Import or share a build to load it.'; }
    let invalidShare = null;
    if (location.hash.startsWith('#build=')) {
      try { const candidate=decodeBuild(location.hash.slice(7),data);await picker.verifyCandidate(candidate);build=candidate;message='Shared build loaded.'; }
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

function restoreNavigation() {
  if (plannerView(location.href, selectedView) !== selectedView) {
    location.reload();
    return;
  }
  // Back/forward cache restores do not re-run this module.
  try{rememberPlannerView(selectedView,localStorage);}catch{}
}
window.addEventListener('hashchange', restoreNavigation);
window.addEventListener('popstate', restoreNavigation);
window.addEventListener('pageshow', restoreNavigation);
initialise();
