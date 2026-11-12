import {CLASS_OPTIONS} from './core/class-options.mjs?v=20261112-rotations1';
import {CONDITION_DEFINITIONS} from './core/rotations/conditions.mjs?v=20261112-rotations1';
import {presetCompatibility} from './core/rotations/validator.mjs?v=20261112-rotations1';
import {recommendPresets} from './core/rotations/recommendations.mjs?v=20261112-rotations1';
import {CONSUMABLES,consumableRestriction,selectConsumable,resolveConsumableSelection,stackingNote,orderConsumables} from './core/consumables.mjs?v=20261112-consumes1';
import {selectBuff,selectBuffGroup,BUFF_CONFLICTS} from './core/buffs.mjs?v=20261112-stats2';
import { BUFF_OPTIONS, buffRestriction, BUFF_GROUPS, rotationProfile, OPERATORS, validateRotationRows } from './core/configuration.mjs?v=20261112-rotations1';
import { attachTooltip } from './tooltip.mjs?v=20261111-classes1';
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,click,label)=>{const b=node('button',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',click);return b;};
const select=(options,value,label)=>{const s=node('select');s.setAttribute('aria-label',label);for(const [id,text] of options){const o=node('option',text);o.value=id;s.append(o);}s.value=value;return s;};

export function configuration({getBuild,onChange,getTalents=()=>null,lookupGear=()=>null}){
 const classId=getBuild().classId;
 const SAVED_KEY=`octosim.rotations.${classId}.v1`;
 const {abilities:ABILITIES,metrics:METRICS,presets:ROTATION_PRESETS,resources}=rotationProfile(classId);
 const validateRows=rows=>validateRotationRows(rows,classId);
 const checkboxes=new Map();
 const update=patch=>onChange(resolveConsumableSelection({...getBuild().controls,...patch},Object.hasOwn(patch,'consumableIds')?'consumables':'buffs'));
 for(const group of BUFF_GROUPS){
  const section=node(group.collapsed?'details':'section',undefined,'buff-group');if(group.collapsed)section.open=false;
  const heading=node(group.collapsed?'summary':'div',undefined,'buff-group-heading');heading.append(node('h3',group.name));
  const actions=node('div',undefined,'buff-actions');
  const setGroup=enabled=>{
   const ids=group.options.filter(option=>!enabled||!buffRestriction(option,getBuild())).map(option=>option.id);
   const selected=selectBuffGroup(getBuild().controls.buffIds,ids,enabled);
   update({buffIds:[...selected]});renderChecks();
  };
  if(group.all)actions.append(button('Select All',()=>setGroup(true),`Select all ${group.name}`));
  actions.append(button('Clear All',()=>setGroup(false),`Clear all ${group.name}`));
  if(!group.collapsed)heading.append(actions);
  section.append(heading);if(group.collapsed)section.append(actions);
  for(const option of group.options){
   if(option.classes&&!option.classes.includes(classId)||option.id==='wizard-oil-oh'&&!['warrior','rogue','hunter'].includes(classId))continue;
   const label=node('label',undefined,'buff-row');const input=node('input');input.type='checkbox';input.value=option.id;
   input.disabled=Boolean(buffRestriction(option,getBuild()));
   const name=node('span',option.name,'buff-name'),effect=node('span',option.effect,'buff-effect');label.append(input,name,effect);
   input.addEventListener('change',()=>{
    let selected=[...getBuild().controls.buffIds];if(input.checked)selected=selectBuff(selected,option.id);else selected=selectBuff(selected,option.id,false);update({buffIds:[...selected]});renderChecks();
   });
   attachTooltip(label,()=>({title:option.name,lines:[option.effect,...(input.disabled?[buffRestriction(option,getBuild())]:[]),...BUFF_CONFLICTS.filter(pair=>pair.includes(option.id)).map(pair=>`Replaces ${BUFF_OPTIONS.find(b=>b.id===pair.find(id=>id!==option.id))?.name}.`),'Combat Gum reference value. Combat calculations are in development.']}));
   checkboxes.set(option.id,input);section.append(label);
   if(option.id==='tea'){
    const threshold=node('label',undefined,'tea-threshold');threshold.append(node('span','Use at <'));
    const field=node('input');field.type='number';field.min=0;field.max=100;field.id='tea-threshold';field.setAttribute('aria-label','Thistle Tea energy threshold');field.disabled=input.disabled;field.addEventListener('change',()=>{try{update({teaThreshold:Number(field.value)});}catch{field.value=getBuild().controls.teaThreshold;}});
    threshold.append(field,node('span','energy'));section.append(threshold);
   }
  }
  $('buff-list').append(section);
 }
 function renderChecks(){for(const [id,input] of checkboxes){input.checked=getBuild().controls.buffIds.includes(id);input.disabled=Boolean(buffRestriction(BUFF_OPTIONS.find(o=>o.id===id),getBuild()));}if($('tea-threshold'))$('tea-threshold').value=getBuild().controls.teaThreshold;renderAdditional();}
 const extra=node('details',undefined,'additional-consumables'),summary=node('summary','Class Consumables'),extraActions=node('div',undefined,'buff-actions');
 extraActions.append(button('Clear All',()=>{update({consumableIds:[]});renderChecks();},'Clear all class consumables'));extra.append(summary,extraActions);
 const search=node('input');search.type='search';search.placeholder='Search consumables…';search.setAttribute('aria-label','Search class consumables');
 const kind=select(['All','Potion','Flask','Elixir','Rune','Bandage','Food & Utility'].map(v=>[v,v]),'All','Consumable type');
 const count=node('div',undefined,'small muted'),list=node('div',undefined,'additional-consumable-list');extra.append(search,kind,count,list);$('buff-list').append(extra);
 function renderAdditional(){
  const build=getBuild(),query=search.value.trim().toLowerCase(),selected=build.controls.consumableIds||[];
  const candidates=orderConsumables(CONSUMABLES.filter(item=>!item.buffId&&item.verified&&!consumableRestriction(item,build)&&(kind.value==='All'||item.category===kind.value)&&(!query||item.name.toLowerCase().includes(query)||String(item.id)===query)));
  count.textContent=`${candidates.length} verified applicable consumables`;const scrollTop=list.scrollTop,focusedId=list.contains(document.activeElement)?document.activeElement.value:null;list.replaceChildren();
  for(const item of candidates){
   const row=node('label',undefined,'buff-row'),input=node('input');input.type='checkbox';input.checked=selected.includes(item.id);input.value=String(item.id);
   const text=node('span',item.name,'buff-name'),effect=node('span',item.requiredLevel?`Lv ${item.requiredLevel}`:'','buff-effect');row.append(input,text,effect);
   input.addEventListener('change',()=>{const current=getBuild().controls.consumableIds||[];update({consumableIds:input.checked?selectConsumable(current,item.id):current.filter(id=>id!==item.id)});renderChecks();});
   attachTooltip(row,()=>({title:item.name,lines:[...item.effects,stackingNote(item),...(item.durationSeconds?[`Duration: ${item.durationSeconds} seconds.`]:[]),'Item cooldown and shared category require server verification. Timed effects are not yet supported by a combat engine.',item.source]}));list.append(row);
  }
  if(focusedId)list.querySelector(`input[value="${focusedId}"]`)?.focus({preventScroll:true});
  list.scrollTop=scrollTop;
 }
 search.addEventListener('input',renderAdditional);kind.addEventListener('change',renderAdditional);
 function saved(){
  try{
   const entries=JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');if(!Array.isArray(entries))return[];
   const roles=new Set(ROTATION_PRESETS.map(p=>p.role));
   return entries.slice(0,20).flatMap(entry=>{try{
    if(!entry||typeof entry.name!=='string'||entry.name.length>80)return[];
    return [{...entry,role:roles.has(entry.role)?entry.role:'dps',rows:validateRows(entry.rows)}];
   }catch{return[];}});
  }catch{return[];}
 }
 const roleField=node('label',undefined,'field rotation-role-field');roleField.append(node('span','Role'));const roleSelect=select([...new Set(ROTATION_PRESETS.map(p=>p.role))].map(role=>[role,{dps:'DPS',tank:'Threat / Tanking',healing:'Healing'}[role]]),getBuild().controls.rotationRole||'dps','Rotation role');roleField.append(roleSelect);roleField.hidden=roleSelect.options.length<2;$('rotation-description').before(roleField);roleSelect.addEventListener('change',()=>{update({rotationRole:roleSelect.value});refreshCompatibility();});
 const status=node('div',undefined,'rotation-status');status.id='rotation-compatibility';status.setAttribute('role','status');
 const recommendation=node('div',undefined,'rotation-recommendation');
 const evidence=node('details',undefined,'rotation-evidence');evidence.append(node('summary','Sources & requirements'));const evidenceBody=node('div');evidence.append(evidenceBody);
 $('rotation-description').after(status,recommendation,evidence);
 function choices(){
  const dropdown=$('rotation-preset');dropdown.replaceChildren();const groups=new Map();
  for(const preset of ROTATION_PRESETS.filter(p=>p.id!=='custom')){
   const spec=preset.specialisation||preset.name.split(' | ')[0];let group=groups.get(spec);if(!group){group=node('optgroup');group.label=spec;groups.set(spec,group);dropdown.append(group);}
   const option=node('option',preset.name);option.value=preset.id;group.append(option);
  }
  const savedEntries=saved();if(savedEntries.length){const group=node('optgroup');group.label='Saved rotations';for(const [index,entry] of savedEntries.entries()){const option=node('option',entry.name);option.value=`saved:${index}`;group.append(option);}dropdown.append(group);}
  const custom=node('option','New Custom Rotation');custom.value='custom';dropdown.append(custom);dropdown.value=getBuild().controls.rotationPreset;
 }
 function refreshCompatibility(){
  const build=getBuild(),preset=ROTATION_PRESETS.find(p=>p.id===build.controls.rotationPreset);if(!preset)return;
  const result=presetCompatibility(preset,build,{talents:getTalents(),lookup:lookupGear,role:build.controls.rotationRole||'dps'});
  status.textContent=`${build.controls.rotationRole==='healing'?'Healing':build.controls.rotationRole==='tank'?'Threat / tanking':'DPS'} configuration · Simulation unavailable`+(result.missing.length?` · ${result.missing.slice(0,3).join(' ')}${result.missing.length>3?' More requirements below.':''}`:'');
  status.classList.toggle('incompatible',result.missing.length>0);
  evidenceBody.replaceChildren();
  for(const message of [...result.missing,...result.unresolved,...(preset.id==='custom'?[]:['Priority strategy: research-based; not validated on OctoWoW.']),`Ruleset: ${preset.ruleset}`])evidenceBody.append(node('p',message));
  for(const source of preset.sources){const link=node('a',source);link.href=source;link.target='_blank';link.rel='noopener noreferrer';evidenceBody.append(link);}
  const matches=recommendPresets(build,{talents:getTalents(),lookup:lookupGear,role:build.controls.rotationRole||'dps'});
  recommendation.textContent=matches.length?`Consider: ${matches.map(match=>match.preset.name).join(' · ')}. Configuration matches, not simulated rankings.`:'';
 }
 function edit(rows){try{update({rotationPreset:'custom',rotationRows:rows});$('rotation-preset').value='custom';$('rotation-description').textContent='';$('rotation-save-status').textContent='';refreshCompatibility();}catch(error){$('rotation-save-status').textContent=error.message;renderRows();}}
 function mutate(index,callback){const rows=structuredClone(getBuild().controls.rotationRows);callback(rows[index],rows);edit(rows);}
 function renderRows(){
  const container=$('rotation-rows');container.replaceChildren();
  const rows=getBuild().controls.rotationRows;
  if(!rows.length)container.append(node('div','No abilities configured.','rotation-empty'));
  for(const [index,row] of rows.entries()){
   const section=node('div',undefined,'rotation-row'),header=node('div',undefined,'rotation-row-heading');
   header.append(node('span',String(index+1),'rotation-number'));
   const ability=select(ABILITIES.map(name=>[name,name]),row.ability,`Ability ${index+1}`);ability.addEventListener('change',()=>mutate(index,r=>{const old=r.ability;r.ability=ability.value;for(const c of r.conditions)if(CONDITION_DEFINITIONS[c.metric].subject==='ability'&&c.aura===old)c.aura=ability.value;if(r.abilityId)r.abilityId=`${classId}:${ability.value.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/-$/,'')}`;}));header.append(ability);
   const up=button('↑',()=>{mutate(index,(_,rows)=>{[rows[index-1],rows[index]]=[rows[index],rows[index-1]];});renderRows();},`Move ability ${index+1} up`);up.disabled=index===0;
   const down=button('↓',()=>{mutate(index,(_,rows)=>{[rows[index+1],rows[index]]=[rows[index],rows[index+1]];});renderRows();},`Move ability ${index+1} down`);down.disabled=index===rows.length-1;
   const target=select(['primary','cycle','ally','self','pet'].map(id=>[id,{primary:'Primary target',cycle:'Cycle targets',ally:'Injured allies',self:'Self',pet:'Pet'}[id]]),row.target||'primary',`Target for ability ${index+1}`);target.addEventListener('change',()=>mutate(index,r=>{r.target=target.value;}));header.append(target);
   header.append(up,down,button('×',()=>{mutate(index,(_,rows)=>rows.splice(index,1));renderRows();},`Remove ability ${index+1}`));section.append(header);
   for(const [ci,condition] of row.conditions.entries()){
    const line=node('div',undefined,'rotation-condition');
    const metric=select(Object.entries(METRICS),condition.metric,`Condition ${ci+1} for ability ${index+1}`);
    metric.addEventListener('change',()=>{mutate(index,r=>{r.conditions[ci].metric=metric.value;const def=CONDITION_DEFINITIONS[metric.value];if(def.kind==='boolean'){r.conditions[ci].operator='=';r.conditions[ci].value=1;}r.conditions[ci].aura=def.subject?(def.subject==='ability'?r.ability:def.subject==='talent'?(getTalents()?.talents[0]?.name||r.ability):def.subject==='option=value'?`${CLASS_OPTIONS[classId][0].key}=${getBuild().classOptions[CLASS_OPTIONS[classId][0].key]}`:r.conditions[ci].aura||r.ability):'';});renderRows();});
    line.append(metric);
    if(CONDITION_DEFINITIONS[condition.metric].subject){
     const aura=node('input');aura.placeholder=CONDITION_DEFINITIONS[condition.metric].subject;aura.value=condition.aura;aura.maxLength=80;aura.setAttribute('aria-label',`Aura for ability ${index+1}, condition ${ci+1}`);aura.addEventListener('change',()=>mutate(index,r=>r.conditions[ci].aura=aura.value));line.append(aura);
    }
    const operator=select((CONDITION_DEFINITIONS[condition.metric].kind==='boolean'?['=']:OPERATORS).map(value=>[value,value]),condition.operator,`Comparison for ability ${index+1}, condition ${ci+1}`);operator.addEventListener('change',()=>mutate(index,r=>r.conditions[ci].operator=operator.value));
    const value=node('input');value.type='number';value.min=0;value.max=CONDITION_DEFINITIONS[condition.metric].kind==='boolean'?1:10000;value.step=CONDITION_DEFINITIONS[condition.metric].kind==='boolean'?1:'any';value.value=condition.value;value.setAttribute('aria-label',`Value for ability ${index+1}, condition ${ci+1}`);value.addEventListener('change',()=>{try{mutate(index,r=>r.conditions[ci].value=Number(value.value));}catch{value.value=condition.value;}});
    line.append(operator,value,button('×',()=>{mutate(index,r=>r.conditions.splice(ci,1));renderRows();},`Remove condition ${ci+1} for ability ${index+1}`));section.append(line);
   }
   const add=button('+ Condition',()=>{mutate(index,r=>r.conditions.push({metric:resources[0],operator:'>=',value:30,aura:''}));renderRows();},`Add condition for ability ${index+1}`);add.disabled=row.conditions.length>=6;section.append(add);container.append(section);
  }
 }
 $('rotation-preset').addEventListener('change',()=>{
  const value=$('rotation-preset').value;
  const preset=value.startsWith('saved:')?saved()[Number(value.slice(6))]:ROTATION_PRESETS.find(preset=>preset.id===value);
  if(!preset)return;
  update({rotationPreset:value.startsWith('saved:')?'custom':value,rotationRole:preset.role||getBuild().controls.rotationRole||'dps',rotationRows:structuredClone(preset.rows)});
  $('rotation-description').textContent=preset.description||'';renderRows();roleSelect.value=getBuild().controls.rotationRole;refreshCompatibility();
 });
 const add=$('rotation-add');for(const name of ABILITIES){const option=node('option',name);option.value=name;add.append(option);}
 add.addEventListener('change',()=>{if(!add.value)return;edit([...getBuild().controls.rotationRows,{ability:add.value,conditions:[]}]);add.value='';renderRows();});
 $('rotation-save').addEventListener('click',()=>{
  const name=$('rotation-name').value.trim();if(!name){$('rotation-name').focus();return;}
  try{const entries=saved().filter(entry=>entry.name!==name);if(entries.length>=20)throw new Error('You can save up to 20 rotations.');entries.push({name,role:getBuild().controls.rotationRole,rows:validateRows(getBuild().controls.rotationRows)});localStorage.setItem(SAVED_KEY,JSON.stringify(entries));choices();$('rotation-save-status').textContent='Saved.';}catch(error){$('rotation-save-status').textContent=error.message;}
 });
 for(const [id,key] of [['key-interval','keyInterval'],['key-variability','variability'],['key-variability-ms','variabilityMs']])$(id).addEventListener('change',()=>{
  try{update({[key]:key==='variability'?$(id).checked:Number($(id).value)});$('key-variability-ms').disabled=!getBuild().controls.variability;}catch{render();}
 });
 function render(){renderChecks();choices();renderRows();const controls=getBuild().controls;roleSelect.value=controls.rotationRole||'dps';for(const [id,key] of [['key-interval','keyInterval'],['key-variability-ms','variabilityMs']])$(id).value=controls[key];$('key-variability').checked=controls.variability;$('key-variability-ms').disabled=!controls.variability;$('rotation-description').textContent=ROTATION_PRESETS.find(p=>p.id===controls.rotationPreset)?.description||'';refreshCompatibility();}
 return {render,refreshCompatibility};
}
