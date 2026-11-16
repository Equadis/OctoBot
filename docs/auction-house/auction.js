/* OctoBot Auction House: no mock records and no frontend secrets. Filtering, sorting and pagination happen on the server,
 * so result counts and pages always cover every matching item, not just the rows currently loaded. */
import {itemTooltip} from './item-presentation.mjs?v=1';
import {money,pct,trend,left,dateTime,count} from './format.mjs';
import {CATEGORIES,SLOTS,TIME_LEFT,RARITIES,subclassOptions} from './categories.mjs';
import {DEFAULTS,SORTS,validate,buildParams,activeFilters,advancedCount,reset,loadSaved,saveSearches,addSaved,removeSaved} from './filters.mjs';
import {loadFavourites,saveFavourites,toggleFavourite,isFavourite,refreshSnapshots,apiKeys,keyOf,MAX_FAVOURITES} from './favourites.mjs';
import {buildChart,MIN_POINTS} from './chart.mjs';

// A different API origin is honoured only when the page itself is served from this machine (used for local testing against fixtures).
const override=new URLSearchParams(location.search).get('api');
const API=override&&['localhost','127.0.0.1'].includes(location.hostname)?override.replace(/\/$/,''):'https://octometrics.eqvoice.workers.dev';
const $=id=>document.getElementById(id);
const storage=(()=>{try{return window.localStorage;}catch{return null;}})();
const COLS=11;
const state={filters:{...DEFAULTS},page:0,limit:50,queryId:0,favId:0,fav:loadFavourites(storage),saved:loadSaved(storage),listingFiltered:false,sortTouched:false,busy:0,favFailed:false};

function el(tag,content,className){
  const node=document.createElement(tag);
  if(content!==undefined&&content!==null)node.textContent=String(content);
  if(className)node.className=className;
  return node;
}
const td=(row,value,className)=>{const c=el('td',value,className);row.append(c);return c;};
const note=message=>{$('ah-status').textContent=message;};
async function request(path){
  const r=await fetch(API+path,{cache:'no-store',headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('API HTTP '+r.status);
  return r.json();
}
const qualityClass=q=>{const n=Number(q);return q!=null&&Number.isInteger(n)&&n>=0&&n<=6?'ah-q'+n:'ah-q1';};
const itemName=item=>item.item_name||('Item #'+item.item_id);
const variantLabel=v=>v&&v!=='0:0:0'?v:null;

/* ---------- favourites ---------- */
const stars=new Map(); // star button -> item snapshot
function syncStar(button,item){
  const on=isFavourite(state.fav,item),name=itemName(item);
  button.textContent=on?'★':'☆';
  button.setAttribute('aria-pressed',String(on));
  button.setAttribute('aria-label',(on?'Remove ':'Add ')+name+(on?' from':' to')+' favourites');
  button.title=on?'Remove from favourites':'Add to favourites';
}
function syncAllStars(){
  for(const [button,item] of stars){if(!button.isConnected){stars.delete(button);continue;}syncStar(button,item);}
  $('fav-count').textContent=String(state.fav.length);
  const only=$('fav-only');
  only.querySelector('.ah-star-glyph').textContent=state.filters.favourites_only?'★':'☆';
}
function starButton(item){
  const button=el('button','','ah-star');
  button.type='button';
  const snapshot={item_id:item.item_id,variant:item.variant??'',item_name:item.item_name??null,quality:item.quality??null,icon_url:item.icon_url??null};
  stars.set(button,snapshot);
  syncStar(button,snapshot);
  button.addEventListener('click',()=>{
    const result=toggleFavourite(state.fav,snapshot);
    if(result.full){note('You can track up to '+MAX_FAVOURITES+' favourite items. Remove one to add another.');return;}
    state.fav=result.list;
    if(!saveFavourites(storage,state.fav))note('Favourites could not be saved in this browser (storage is unavailable), so they will be lost when you leave the page.');
    syncAllStars();
    void refreshFavourites();
    if(state.filters.favourites_only)void refreshItems();
  });
  return button;
}

/* ---------- rows ---------- */
function itemCell(item){
  const wrapper=el('div',null,'ah-item '+qualityClass(item.quality));
  const icon=el('span');
  if(item.icon_url&&/^https:\/\//.test(item.icon_url)){const image=document.createElement('img');image.className='ah-icon';image.alt='';image.src=item.icon_url;image.loading='lazy';icon.append(image);}
  else{icon.className='ah-icon';icon.setAttribute('aria-hidden','true');}
  const link=el('a',itemName(item));
  link.href='https://octowow.st/db/?item='+encodeURIComponent(item.item_id);
  link.target='_blank';link.rel='noopener noreferrer';
  link.title=itemTooltip(item);
  wrapper.append(icon,link);
  const variant=variantLabel(item.variant);
  if(variant){const v=el('span','variant '+variant,'ah-variant');v.title='Enchant, random property and suffix factor. Variants are priced separately.';wrapper.append(v);}
  return wrapper;
}
/** One table row (plus an expandable detail row), used by both the results table and the favourites overview. */
function appendItemRow(body,item,{unavailable=false,error=false}={}){
  const tr=el('tr');
  td(tr).append(starButton(item));
  const cell=el('td'),wrap=el('div',null,'ah-item');
  const expand=el('button','▸','ah-expand');
  expand.type='button';expand.title='Show auction listings and price history';expand.setAttribute('aria-expanded','false');
  expand.setAttribute('aria-label','Show details for '+itemName(item));
  wrap.append(expand,itemCell(item));cell.append(wrap);tr.append(cell);
  if(unavailable){
    td(tr,error?'Latest data is unavailable, so this item’s current prices cannot be shown.':'Not listed in the latest completed scan. It stays in your favourites.','ah-unavailable').colSpan=COLS-2;
  }else{
    td(tr,item.quantity??'–');td(tr,item.listings??'–');td(tr,money(item.unit_buyout));
    td(tr,money(item.stack_buyout));
    td(tr,item.current_bid>0?money(item.current_bid):money(item.start_bid)+' (start)');
    td(tr,money(item.historical_avg));td(tr,pct(item.market_pct));
    const t=trend(item.trend_pct),tc=td(tr,t.label,t.className);
    tc.title=item.trend_pct==null?(state.listingFiltered?'Hidden while price filters are active':t.text):(t.text+'. Previous '+money(item.previous_unit)+'; now '+money(item.unit_buyout)+'; change '+pct(item.trend_pct));
    td(tr,left(item.time_left_ms,item.captured_at));
  }
  body.append(tr);
  expand.addEventListener('click',()=>toggleDetail(tr,item,expand,unavailable));
}
function toggleDetail(tr,item,expand,unavailable){
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('ah-detail')){next.remove();expand.setAttribute('aria-expanded','false');expand.textContent='▸';return;}
  const detail=el('tr',null,'ah-detail'),cell=el('td','Loading listings…');cell.colSpan=COLS;detail.append(cell);tr.after(detail);
  expand.setAttribute('aria-expanded','true');expand.textContent='▾';
  void fillDetail(cell,item,unavailable);
}
function stat(label,value,small){
  const box=el('div'),dt=el('dt',label),dd=el('dd',value);
  if(small)dd.append(el('small',small));
  box.append(dt,dd);return box;
}
function section(title,open){const d=el('details');if(open)d.open=true;d.append(el('summary',title));const body=el('div');d.append(body);return {d,body};}
function simpleTable(headings,rows){
  const table=el('table'),head=el('tr');
  headings.forEach(h=>head.append(el('th',h)));
  const thead=el('thead');thead.append(head);table.append(thead);
  const body=el('tbody');
  for(const r of rows){const line=el('tr');r.forEach(v=>td(line,v));body.append(line);}
  table.append(body);return table;
}
async function fillDetail(cell,item,unavailable){
  const v=encodeURIComponent(item.variant||'');
  const id=encodeURIComponent(item.item_id);
  try{
    const [listings,history]=await Promise.all([unavailable?Promise.resolve({listings:[]}):request('/api/auction/item/'+id+'?variant='+v),request('/api/auction/history/'+id+'?variant='+v)]);
    const days=Array.isArray(history.history)?history.history:[];
    const stats=el('dl',null,'ah-stats');
    if(!unavailable){
      stats.append(stat('Lowest unit buyout',item.unit_buyout==null?'No buyout listed':money(item.unit_buyout)));
      stats.append(stat('Lowest stack buyout',item.stack_buyout==null||!(item.stack_buyout>0)?'No buyout listed':money(item.stack_buyout)));
      stats.append(stat('Available',count(item.quantity),count(item.listings)+' listing'+(item.listings===1?'':'s')));
      stats.append(stat('Historical average',item.historical_avg==null?'Not enough history':money(item.historical_avg),item.historical_avg==null?'Needs 4 days; '+(item.historical_days??days.length)+' so far':(item.historical_days??'')+' daily observations'));
      stats.append(stat('Market %',pct(item.market_pct),'Current unit buyout ÷ historical average'));
      const t=trend(item.trend_pct);
      stats.append(stat('Movement since previous scan',item.trend_pct==null?'No comparison':t.label+' '+pct(item.trend_pct),item.previous_unit==null?t.text:money(item.previous_unit)+' → '+money(item.unit_buyout)));
      stats.append(stat('Cheapest listing time left',left(item.time_left_ms,item.captured_at),'Estimate, not guaranteed'));
    }else stats.append(stat('Current status','Not listed','No auctions in the latest completed scan'));
    const parts=[stats];
    if(state.listingFiltered&&!unavailable)parts.push(el('p','Totals above reflect your active price, stack and time filters. The listings below are every auction for this item.','ah-muted'));
    // price history
    const hist=section('Price history',true);
    const chart=buildChart(document,days,item.historical_avg??null);
    if(chart){hist.body.append(chart);hist.body.append(el('p','Daily lowest unit buyout from completed scans'+(item.historical_avg!=null?'; the dashed line is the historical average.':'.'),'ah-chart-note'));}
    else hist.body.append(el('p','Not enough history for a chart yet: '+days.length+' day'+(days.length===1?'':'s')+' observed, at least '+MIN_POINTS+' needed.','ah-muted'));
    if(days.length){
      const raw=section('Daily observations ('+days.length+')',false);
      raw.body.append(simpleTable(['Day','Lowest unit buyout','Quantity','Listings'],days.map(d=>[d.day,money(d.representative_unit),count(d.quantity),count(d.listings)])));
      hist.body.append(raw.d);
    }
    parts.push(hist.d);
    // individual auctions
    if(!unavailable){
      const rows=listings.listings||[];
      const auctions=section('Auction listings ('+rows.length+(listings.limited?'+':'')+')',true);
      if(!rows.length)auctions.body.append(el('p','No listings are available for this item.','ah-muted'));
      else auctions.body.append(simpleTable(['Seller (owner GUID)','Quantity','Starting bid','Current bid','Minimum next bid','Buyout','Unit buyout','Time left (est.)'],
        rows.map(r=>[r.owner_guid?'GUID '+r.owner_guid:'Unknown',r.quantity,money(r.start_bid),r.current_bid>0?money(r.current_bid):'No bids',money(r.min_next_bid),r.buyout>0?money(r.buyout):'No buyout',money(r.unit_buyout),left(r.time_left_ms,r.captured_at)])));
      if(listings.limited)auctions.body.append(el('p','Showing the 200 cheapest auctions.','ah-chart-note'));
      parts.push(auctions.d);
    }
    const inner=el('div',null,'ah-detail-inner');inner.append(...parts);cell.replaceChildren(inner);
  }catch{cell.textContent='Details are unavailable right now; the previous snapshot is unchanged.';}
}

/* ---------- results ---------- */
function renderRows(data,{favouritesOnlyEmpty=false}={}){
  const body=$('items');body.replaceChildren();
  const items=Array.isArray(data.items)?data.items:[];
  state.listingFiltered=Boolean(data.listing_filtered);
  if(!items.length){
    const tr=el('tr'),cell=td(tr,favouritesOnlyEmpty?'You have no favourite items yet. Select the star beside any item to add it.':
      (activeFilters(state.filters).length?'No items match these filters in the latest completed scan.':'No matching records in the latest completed scan.'),'ah-empty');
    cell.colSpan=COLS;body.append(tr);
  }
  for(const item of items)appendItemRow(body,item);
  $('result-count').textContent=count(data.total??items.length)+' item'+((data.total??items.length)===1?'':'s')+(state.listingFiltered?' (price filters active)':'');
  $('page-label').textContent='Page '+(state.page+1);
  $('previous').disabled=state.page===0;
  $('next').disabled=!data.has_more;
}
async function refreshItems(){
  const id=++state.queryId;
  const errors=validate(state.filters);
  renderErrors(errors);
  if(Object.keys(errors).length)return;
  if(state.filters.favourites_only&&!state.fav.length){renderRows({items:[],total:0,has_more:false},{favouritesOnlyEmpty:true});return;}
  const params=buildParams(state.filters,{limit:state.limit,offset:state.page*state.limit,keys:state.filters.favourites_only?apiKeys(state.fav):null});
  busy(1);
  try{
    const data=await request('/api/auction/items?'+params);
    if(id!==state.queryId)return;
    if(!data.items.length&&state.page>0&&data.total>0){state.page=Math.max(0,Math.ceil(data.total/state.limit)-1);return refreshItems();}
    renderRows(data);
    state.fav=refreshSnapshots(state.fav,data.items);
  }catch{if(id===state.queryId)renderRows({items:[],total:0,has_more:false});}
  finally{busy(-1);}
}
async function refreshFavourites(){
  const id=++state.favId,body=$('fav-body');
  $('fav-count').textContent=String(state.fav.length);
  if(!state.fav.length){
    body.replaceChildren(el('p','No favourites yet. Select the star beside any item to track it here, with its latest price, quantity, market % and trend. Favourites are saved in this browser.','ah-muted ah-empty-fav'));
    return;
  }
  let data=null;
  state.favFailed=false;
  try{data=await request('/api/auction/items?'+buildParams({...DEFAULTS,sort:'name'},{limit:100,keys:apiKeys(state.fav)}));}catch{state.favFailed=true;}
  if(id!==state.favId)return;
  const wasFiltered=state.listingFiltered;
  state.listingFiltered=false;
  const found=new Map((data?.items||[]).map(i=>[keyOf(i),i]));
  if(data){state.fav=refreshSnapshots(state.fav,data.items);saveFavourites(storage,state.fav);}
  const table=el('table'),head=el('tr');
  ['','Item','Available','Listings','Unit price','Stack price','Current bid','Historical avg.','Market %','Trend','Time left'].forEach((h,i)=>{const th=el('th',h);if(i===0){th.className='ah-col-star';th.append(el('span','Favourite','sr-only'));}head.append(th);});
  const thead=el('thead');thead.append(head);table.append(thead);
  const tbody=el('tbody');
  const ordered=[...state.fav].sort((a,b)=>itemName(a).localeCompare(itemName(b),'en-GB'));
  for(const f of ordered){
    const live=found.get(keyOf(f));
    if(live)appendItemRow(tbody,live);else appendItemRow(tbody,f,{unavailable:true,error:state.favFailed});
  }
  table.append(tbody);
  const scroll=el('div',null,'ah-scroll');scroll.append(table);
  body.replaceChildren(scroll);
  state.listingFiltered=wasFiltered;
}

/* ---------- summary and refresh ---------- */
function busy(delta){
  state.busy=Math.max(0,state.busy+delta);
  const on=state.busy>0,button=$('refresh');
  button.disabled=on;button.classList.toggle('loading',on);button.setAttribute('aria-busy',String(on));
}
async function refreshSummary(first){
  try{
    const s=await request('/api/auction/summary');
    $('collector').textContent=s.collector_status||'OFFLINE';
    $('last-scan').textContent=dateTime(s.completed_at);
    $('auction-count').textContent=count(s.auction_count);
    $('item-count').textContent=count(s.item_count);
    $('scan-progress').textContent=s.scanning?((s.pages_done??0)+' / '+(s.pages_expected??'?')+' pages'):'Idle';
    if(!s.completed_at)note('No data – no completed Auction House scan has been verified.');
    else{
      const age=Math.max(0,Date.now()-Date.parse(s.completed_at));
      let message='Latest full snapshot: '+dateTime(s.completed_at)+(age>2*3600000?' · Stale':' · Recently observed');
      if(s.items_with_metadata!=null&&s.item_count>0&&s.items_with_metadata<s.item_count)
        message+=' · Level, category and slot filters can see '+count(s.items_with_metadata)+' of '+count(s.item_count)+' items; the catalogue does not describe the rest.';
      note(message);
    }
    if(first&&s.historical_days<4&&state.filters.sort==='market_pct'&&!state.sortTouched){state.filters.sort='name';$('sort').value='name';}
  }catch{note('Auction House feed unavailable – no data is being invented.');$('collector').textContent='OFFLINE';}
}
async function refreshAll(first=false){
  busy(1);
  try{await refreshSummary(first);await Promise.all([refreshItems(),refreshFavourites()]);}
  finally{busy(-1);}
}

/* ---------- controls ---------- */
function option(value,label){const o=document.createElement('option');o.value=String(value);o.textContent=label;return o;}
function fillSelect(select,first,pairs){select.replaceChildren(option('',first),...pairs.map(([v,l])=>option(v,l)));}
function populate(){
  $('sort').replaceChildren(...SORTS.map(([v,l])=>option(v,l)));
  fillSelect($('quality'),'All rarities',RARITIES);
  fillSelect($('item_class'),'All categories',CATEGORIES.map(c=>[c.id,c.name]));
  fillSelect($('slot'),'Any slot',SLOTS.map(s=>[s.id,s.name]));
  fillSelect($('time_left'),'Any time left',TIME_LEFT);
  fillSubclasses();
}
function fillSubclasses(){
  const select=$('item_subclass'),klass=$('item_class').value;
  const options=klass===''?[]:subclassOptions(klass);
  fillSelect(select,klass===''?'Choose a category first':'All subcategories',options.map(s=>[s.id,s.name]));
  select.disabled=klass===''||!options.length;
}
const TEXT_FIELDS=['q','quality','item_class','item_subclass','slot','min_level','max_level','min_quantity','stack','max_unit_buyout','max_unit_bid','time_left','owner','min_market_pct','max_market_pct'];
const CHECK_FIELDS=['gear','exact','has_buyout'];
const DOM_ID={q:'search'};
function readFilters(){
  const f=state.filters;
  for(const k of TEXT_FIELDS)f[k]=$(DOM_ID[k]||k).value;
  for(const k of CHECK_FIELDS)f[k]=$(k).checked;
  f.sort=$('sort').value;
}
function writeFilters(){
  const f=state.filters;
  $('item_class').value=f.item_class;fillSubclasses();
  for(const k of TEXT_FIELDS)$(DOM_ID[k]||k).value=f[k];
  for(const k of CHECK_FIELDS)$(k).checked=f[k];
  $('sort').value=f.sort;
  const fav=$('fav-only');fav.setAttribute('aria-pressed',String(f.favourites_only));
  syncDirection();updateBadges();syncAllStars();
}
function syncDirection(){
  const d=state.filters.dir,b=$('dir');
  b.textContent=d==='asc'?'↑':d==='desc'?'↓':'⇅';
  const label=d==='asc'?'ascending':d==='desc'?'descending':'default';
  b.setAttribute('aria-label','Sort direction: '+label);b.title='Sort direction: '+label+' (click to change)';
}
function updateBadges(){
  const n=advancedCount(state.filters),badge=$('adv-badge');
  badge.hidden=n===0;badge.textContent=String(n);
}
function renderErrors(errors){$('filter-errors').textContent=Object.values(errors).join(' ');}
function renderSaved(){
  const box=$('saved-list');box.replaceChildren();
  for(const s of state.saved){
    const chip=el('span',null,'ah-chip'),apply=el('button',s.name),remove=el('button','✕','ah-chip-remove');
    apply.type=remove.type='button';apply.title='Apply this saved search';remove.title='Delete this saved search';remove.setAttribute('aria-label','Delete saved search '+s.name);
    apply.addEventListener('click',()=>{state.filters={...DEFAULTS,...s.filters};state.page=0;writeFilters();void refreshItems();});
    remove.addEventListener('click',()=>{state.saved=removeSaved(state.saved,s.name);saveSearches(storage,state.saved);renderSaved();});
    chip.append(apply,remove);box.append(chip);
  }
  if(!state.saved.length)box.append(el('span','No saved searches yet.','ah-muted'));
}
let debounce;
function changed(immediate){
  readFilters();state.page=0;updateBadges();
  clearTimeout(debounce);
  debounce=setTimeout(refreshItems,immediate?0:250);
}
function bind(){
  for(const id of [...TEXT_FIELDS.map(k=>DOM_ID[k]||k),...CHECK_FIELDS,'sort']){
    const node=$(id);
    node.addEventListener(node.tagName==='INPUT'&&node.type!=='checkbox'?'input':'change',()=>{
      if(id==='item_class'){$('item_subclass').value='';fillSubclasses();}
      if(id==='sort')state.sortTouched=true;
      changed(node.tagName==='SELECT'||node.type==='checkbox');
    });
  }
  $('filters').addEventListener('submit',e=>e.preventDefault());
  $('dir').addEventListener('click',()=>{state.filters.dir=state.filters.dir===''?'asc':state.filters.dir==='asc'?'desc':'';state.sortTouched=true;syncDirection();state.page=0;void refreshItems();});
  $('fav-only').addEventListener('click',()=>{state.filters.favourites_only=!state.filters.favourites_only;$('fav-only').setAttribute('aria-pressed',String(state.filters.favourites_only));state.page=0;syncAllStars();void refreshItems();});
  $('adv-toggle').addEventListener('click',()=>{const open=$('advanced').hidden;$('advanced').hidden=!open;$('adv-toggle').setAttribute('aria-expanded',String(open));});
  $('reset').addEventListener('click',()=>{state.filters=reset(state.filters);state.page=0;writeFilters();void refreshItems();});
  $('refresh').addEventListener('click',()=>{void refreshAll();});
  $('previous').addEventListener('click',()=>{if(state.page>0){state.page--;void refreshItems();}});
  $('next').addEventListener('click',()=>{if(!$('next').disabled){state.page++;void refreshItems();}});
  $('save-search').addEventListener('click',()=>{
    readFilters();
    const next=addSaved(state.saved,$('save-name').value,state.filters);
    if(!next){renderErrors({name:'Give the search a name before saving it.'});return;}
    state.saved=next;if(!saveSearches(storage,state.saved))renderErrors({storage:'Saved searches cannot be stored in this browser.'});else renderErrors({});
    $('save-name').value='';renderSaved();
  });
  $('fav-collapse').addEventListener('click',()=>{
    const hide=$('fav-body').hidden===false;
    $('fav-body').hidden=hide;$('fav-collapse').textContent=hide?'Show':'Hide';$('fav-collapse').setAttribute('aria-expanded',String(!hide));
    try{storage?.setItem('octobot.auction.favourites.collapsed',hide?'1':'0');}catch{/* optional convenience only */}
  });
  try{if(storage?.getItem('octobot.auction.favourites.collapsed')==='1')$('fav-collapse').click();}catch{/* ignore */}
}
populate();bind();renderSaved();writeFilters();
await refreshAll(true);
setInterval(()=>{void refreshAll();},60_000);
