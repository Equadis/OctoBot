/* OctoBot Auction House. Item filters use the versioned catalogue when available. */
import {parseSnapshotQuery,querySnapshot} from "./snapshot-query.mjs?v=20261130-ui2";
import {displayItemName,variantDetails,variantLines,richItemTooltip} from './item-presentation.mjs?v=20261130-ui2';
import {attachTooltip} from '../sim/tooltip.mjs?v=20261117-notes1';
import {measureScrollingNames} from '../scrolling-names.mjs?v=20261130-ui2';
import {money,moneyParts,pct,listingMarketPct,marketClass,trend,left,timeClass,bidAmount,scanStatus,lastScanClass,indexCoverage,indexedClass,dateTime,count} from './format.mjs?v=20261120-hourly';
import {CATEGORIES,SLOTS,TIME_LEFT,RARITIES,subclassOptions} from './categories.mjs';
import {DEFAULTS,SORT_DEFAULT_DIR,COLUMN_SORTS,nextColumnSort,validate,buildParams,activeFilters,advancedCount,reset,loadSaved,saveSearches,addSaved,removeSaved} from './filters.mjs?v=20261130-ui2';
import {loadFavourites,saveFavourites,toggleFavourite,isFavourite,refreshSnapshots,apiKeys,keyOf,MAX_FAVOURITES} from './favourites.mjs';
import {buildChart,MIN_POINTS} from './chart.mjs?v=20261130-ui2';
import {auctionSearchFromURL} from '../world-chat/chat-interactions.mjs?v=3';

// A different API origin is honoured only when the page itself is served from this machine (used for local testing against fixtures).
const override=new URLSearchParams(location.search).get('api');
const API=override&&['localhost','127.0.0.1'].includes(location.hostname)?override.replace(/\/$/,''):'https://octometrics.eqvoice.workers.dev';
const $=id=>document.getElementById(id);
const REALM=new URLSearchParams(location.search).get('realm')==="Y'Shaarj"?"Y'Shaarj":"N'Zoth";
const realmSelect=$('ah-realm');
if(realmSelect){
 realmSelect.value=REALM;
 realmSelect.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('realm',realmSelect.value);location.assign(url.toString());});
}
document.title='OctoBot · Auction House';
const realmHeading=$('ah-realm-heading');if(realmHeading)realmHeading.textContent='Auction House';
const storage=(()=>{try{const s=window.localStorage;if(REALM==="N'Zoth")return s;return {getItem:key=>s.getItem('pvp:'+key),setItem:(key,value)=>s.setItem('pvp:'+key,value),removeItem:key=>s.removeItem('pvp:'+key)};}catch{return null;}})();
const COLS=11;
const state={filters:{...DEFAULTS},favSort:{sort:DEFAULTS.sort,dir:DEFAULTS.dir},page:0,limit:50,queryId:0,favId:0,fav:loadFavourites(storage),saved:loadSaved(storage),listingFiltered:false,scan:{completedAt:null,scanning:false,startedAt:null,pages:'',collectorStatus:null},sortTouched:false,busy:0,favFailed:false};

function el(tag,content,className){
  const node=document.createElement(tag);
  if(content instanceof Node)node.append(content);
  else if(content!==undefined&&content!==null)node.textContent=String(content);
  if(className)node.className=className;
  return node;
}
const td=(row,value,className)=>{const c=el('td',value,className);row.append(c);return c;};
const note=message=>{$('ah-status').textContent=message;};
/** Gold, silver and copper each in their own colour. */
const COIN={g:'gold',s:'silver',c:'copper'};
function moneyNode(n){
  const wrap=el('span',null,'ah-money'),parts=moneyParts(n);
  if(!parts){wrap.textContent=money(n);return wrap;}
  wrap.setAttribute('aria-label',parts.map(p=>(p.number==='<1'?'less than 1':p.amount)+' '+COIN[p.unit]).join(' '));
  for(const p of parts){
    wrap.append(el('span',p.number,'ah-num'));
    const coin=document.createElement('img');coin.className='ah-coin';coin.src='../img/coin-'+COIN[p.unit]+'.png';coin.alt='';coin.width=16;coin.height=16;
    wrap.append(coin);
  }
  return wrap;
}
function marketNode(n){return el('span',pct(n),marketClass(n));}
function updateTimeNode(node,now=Date.now()){const ms=node.dataset.duration===''?null:Number(node.dataset.duration),capturedAt=node.dataset.capturedAt;const cls=timeClass(ms,capturedAt,now);node.textContent=left(ms,capturedAt,now);node.className=cls?'ah-auction-time '+cls:'ah-auction-time';}
function timeNode(ms,capturedAt){const node=el('span',null,'ah-auction-time');node.dataset.duration=ms??'';node.dataset.capturedAt=capturedAt??'';updateTimeNode(node);return node;}
function tickAuctionTimes(){const now=Date.now();for(const node of document.querySelectorAll('.ah-auction-time[data-duration]'))updateTimeNode(node,now);}
const moneyTd=(row,n)=>{const c=el('td');c.append(moneyNode(n));row.append(c);return c;};
async function request(path,signal){
  const url=new URL(API+path);url.searchParams.set('realm',REALM);
  const r=await fetch(url,{signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('API HTTP '+r.status);
  return r.json();
}
let catalogueRequest=null, itemRequest=null, favouriteRequest=null;
async function catalogueFor(scanId){
  if(catalogueRequest?.scanId!==scanId){
    const promise=request('/api/auction/catalogue?scan_id='+encodeURIComponent(scanId));
    catalogueRequest={scanId,promise};
    promise.catch(()=>{if(catalogueRequest?.promise===promise)catalogueRequest=null;});
  }
  return catalogueRequest.promise;
}
async function requestItems(params,signal){
  const scan=state.scan;
  const query=parseSnapshotQuery(params);
  if(scan.catalogue&&scan.id&&!query.error&&!query.listingFiltered){
    try{
      const catalogue=await catalogueFor(scan.id);
      if(signal.aborted)throw signal.reason;
      return querySnapshot(catalogue,query,{});
    }catch(error){
      if(signal.aborted)throw error;
    }
  }
  if(scan.catalogue&&scan.id)params.set('scan_id',scan.id);
  return request('/api/auction/items?'+params,signal);
}
const qualityClass=q=>{const n=Number(q);return q!=null&&Number.isInteger(n)&&n>=0&&n<=6?'ah-q'+n:'ah-q1';};
const itemName=item=>displayItemName(item);
const COLUMNS=['Favorite','Item','Available','Listings','Unit price','Stack price','Current bid','Avg. price','Market %','Trend','Time left'];

/** Keyboard-accessible headers for full-result (server-side) ordering. */
function sortForTable(table){return table.dataset.sortScope==='favourites'?state.favSort:state.filters;}
function updateSortHeaders(table){
 if(!table){for(const t of document.querySelectorAll('table[data-sort-scope]'))updateSortHeaders(t);return;}
 const sort=sortForTable(table);
 for(const th of table.querySelectorAll('th[data-sort-key]')){
  const key=th.dataset.sortKey,active=sort.sort===key;
  const dir=active?(sort.dir||SORT_DEFAULT_DIR[key]):null;
  th.setAttribute('aria-sort',dir==='asc'?'ascending':dir==='desc'?'descending':'none');
  const arrow=th.querySelector('.ah-sort-arrow');
  if(arrow){arrow.textContent=dir==='asc'?'↑':dir==='desc'?'↓':'⇅';arrow.dataset.direction=dir||'none';arrow.setAttribute('aria-hidden','true');}
  th.classList.toggle('ah-sort-active',active);
  const next=nextColumnSort(sort,key);
  const button=th.querySelector('button');
  if(button){const action='Sort '+th.dataset.sortLabel+' '+(next.dir==='asc'?'ascending':'descending');button.setAttribute('aria-label',action);}
 }
}
function prepareSortHeaders(table,scope='items'){
 table.dataset.sortScope=scope;
 const headers=Array.from(table.querySelectorAll('thead th'));
 for(const [i,[label,key]] of COLUMN_SORTS.entries()){
  const th=headers[i+1];if(!th)continue;
  th.dataset.sortKey=key;th.dataset.sortLabel=label;
  const button=el('button',null,'ah-sort-header');button.type='button';
  button.append(el('span',label,'ah-sort-title'),el('span','⇅','ah-sort-arrow'));
  button.addEventListener('click',()=>{
   const sort=sortForTable(table);
   Object.assign(sort,nextColumnSort(sort,key));
   updateSortHeaders(table);
   if(scope==='favourites'){void refreshFavourites();}
   else{state.sortTouched=true;state.page=0;void refreshItems();}
  });
  th.replaceChildren(button);
 }
 updateSortHeaders(table);
}

function measureNames(root){measureScrollingNames(root);}
function scheduleNames(root){if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>measureNames(root));}
window.addEventListener('resize',()=>measureNames(document));

/* ---------- favourites ---------- */
const stars=new Map(); // star button -> item snapshot
function syncStar(button,item){
  const on=isFavourite(state.fav,item),name=itemName(item);
  button.textContent=on?'★':'☆';
  button.setAttribute('aria-pressed',String(on));
  button.setAttribute('aria-label',(on?'Remove ':'Add ')+name+(on?' from':' to')+' favorites');
  button.title=on?'Remove from favorites':'Add to favorites';
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
  button.addEventListener('click',event=>{
    event.stopPropagation();
    const result=toggleFavourite(state.fav,snapshot);
    if(result.full){note('You can track up to '+MAX_FAVOURITES+' favorite items. Remove one to add another.');return;}
    state.fav=result.list;
    if(!saveFavourites(storage,state.fav))note('Favorites could not be saved in this browser (storage is unavailable), so they will be lost when you leave the page.');
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
 if(item.icon_url&&/^https:\/\//.test(item.icon_url)){
  const image=document.createElement('img');image.className='ah-icon';image.alt='';image.src=item.icon_url;image.loading='lazy';icon.append(image);
 }else{icon.className='ah-icon';icon.setAttribute('aria-hidden','true');}
 const label=el('div',null,'ah-item-label'),clip=el('span',null,'ah-name-clip');
 const name=el('span',itemName(item),'ah-name-text');clip.append(name);label.append(clip);
 const effects=variantLines(item);
 if(effects.length)label.append(el('span',effects.join(' · '),'ah-variant-stats'));
 else if(variantDetails(item).unresolved)label.append(el('span','Random bonus unavailable','ah-variant-unresolved'));
 wrapper.append(icon,label);
 attachTooltip(wrapper,()=>richItemTooltip(item));
 return wrapper;
}

/** One table row (plus an expandable detail row), used by both the results table and the favourites overview. */
function appendItemRow(body,item,{unavailable=false,error=false}={}){
  const tr=el('tr',null,'ah-entry');tr.dataset.itemId=String(item.item_id);tr.tabIndex=0;tr.setAttribute('role','button');
  tr.setAttribute('aria-expanded','false');
  tr.setAttribute('aria-label','Show details for '+itemName(item));
  td(tr).append(starButton(item));
  const cell=el('td'),wrap=el('div',null,'ah-entry-name');
  const expand=el('span','▸','ah-expand');expand.setAttribute('aria-hidden','true');
  wrap.append(expand,itemCell(item));cell.append(wrap);tr.append(cell);
  if(unavailable){
    td(tr,error?'Latest data is unavailable, so this item’s current prices cannot be shown.':'Not listed in the latest completed scan. It stays in your favorites.','ah-unavailable').colSpan=COLS-2;
  }else{
    td(tr,item.quantity??'–');td(tr,item.listings??'–');moneyTd(tr,item.unit_buyout);
    moneyTd(tr,item.stack_buyout);
    const bid=bidAmount(item.current_bid,item.start_bid,item.stack_buyout,item.unit_buyout);
    if(bid===null)td(tr,'–');else moneyTd(tr,bid);
    moneyTd(tr,item.historical_avg);td(tr,marketNode(item.market_pct));
    const t=trend(item.trend_pct),tc=td(tr,null,t.className);
    tc.append(el('span',t.label,'ah-trend-arrow'));
    tc.setAttribute('aria-label',item.trend_pct==null?(state.listingFiltered?'Hidden while price filters are active':t.text):(t.text+'. Previous '+money(item.previous_unit)+'; now '+money(item.unit_buyout)+'; change '+pct(item.trend_pct)));
    td(tr).append(timeNode(item.time_left_ms,item.captured_at));
  }
  for(const [index,c] of Array.from(tr.children).entries())c.dataset.label=unavailable&&index===2?'Status':COLUMNS[index];
  body.append(tr);scheduleNames(tr);
  tr.addEventListener('click',event=>{if(event.target.closest('button,a,input,select,textarea'))return;toggleDetail(tr,item,expand,unavailable);});
  tr.addEventListener('keydown',event=>{
   if(event.target!==tr||!['Enter',' '].includes(event.key))return;
   event.preventDefault();toggleDetail(tr,item,expand,unavailable);
  });
}
function toggleDetail(tr,item,expand,unavailable){
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('ah-detail')){next.remove();tr.setAttribute('aria-expanded','false');expand.textContent='▸';return;}
  const detail=el('tr',null,'ah-detail'),cell=el('td','Loading listings…');cell.colSpan=COLS;detail.append(cell);tr.after(detail);
  tr.setAttribute('aria-expanded','true');expand.textContent='▾';
  void fillDetail(cell,item,unavailable);
}
function stat(label,value){
  const box=el('div'),dt=el('dt',label),dd=el('dd',value);
  box.append(dt,dd);return box;
}

/* ---------- price history tooltip ---------- */
const LISTING_PAGE=20;
const formatDay=day=>{const d=new Date(day+'T00:00:00Z');return Number.isNaN(d.getTime())?day:d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});};
let chartTip=null;
// One themed tooltip for every chart. It reads the points already drawn (no extra requests) and snaps to the nearest day, so mouse and touch both work.
function wireChartTooltip(svg){
  const dots=[...svg.querySelectorAll('.ah-chart-dot')];
  if(!dots.length)return;
  if(!chartTip){chartTip=el('div',null,'planner-tooltip ah-chart-tip');chartTip.hidden=true;chartTip.setAttribute('role','tooltip');document.body.append(chartTip);}
  const tip=chartTip;let active=null;
  const hide=()=>{tip.hidden=true;if(active){active.classList.remove('active');active.setAttribute('r','3');}active=null;};
  const nearest=event=>{
    const ctm=svg.getScreenCTM();if(!ctm)return null;
    const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const x=point.matrixTransform(ctm.inverse()).x;
    let best=null,distance=Infinity;
    for(const dot of dots){const d=Math.abs(Number(dot.getAttribute('cx'))-x);if(d<distance){distance=d;best=dot;}}
    return best;
  };
  const show=dot=>{
    if(active!==dot){
      hide();active=dot;dot.classList.add('active');dot.setAttribute('r','5');
      tip.replaceChildren(el('strong',formatDay(dot.dataset.day)),el('span','Lowest unit buyout','ah-chart-tip-label'),moneyNode(Number(dot.dataset.value)));
    }
    tip.hidden=false;
    const box=dot.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
    tip.style.left=Math.max(8,Math.min(box.left+box.width/2-w/2,innerWidth-w-8))+'px';
    tip.style.top=(box.top-h-12>=8?box.top-h-12:Math.min(box.bottom+12,innerHeight-h-8))+'px';
  };
  const onPointer=event=>{const dot=nearest(event);if(dot)show(dot);};
  svg.addEventListener('pointermove',onPointer);
  svg.addEventListener('pointerdown',onPointer);
  svg.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')hide();});
  document.addEventListener('pointerdown',event=>{if(!svg.contains(event.target))hide();});
  window.addEventListener('scroll',hide,{passive:true});
}
function section(title,open){const d=el('details');if(open)d.open=true;d.append(el('summary',title,'collapse-toggle'));const body=el('div');d.append(body);return {d,body};}
function simpleTable(headings,rows){
  const table=el('table'),head=el('tr');
  headings.forEach(h=>head.append(el('th',h)));
  const thead=el('thead');thead.append(head);table.append(thead);
  const body=el('tbody');
  for(const r of rows){const line=el('tr');r.forEach((v,i)=>{const c=td(line,v);c.dataset.label=headings[i];});body.append(line);}
  table.append(body);return table;
}
async function fillDetail(cell,item,unavailable){
  const params=new URLSearchParams({variant:item.variant||''});
  if(state.scan.catalogue&&state.scan.id)params.set('scan_id',state.scan.id);
  const id=encodeURIComponent(item.item_id);
  try{
    const listParams=new URLSearchParams(params);listParams.set('limit',String(LISTING_PAGE));listParams.set('offset','0');
    const sellerFilter=String(state.filters.owner||'').trim();if(sellerFilter)listParams.set('owner',sellerFilter);
    const listings=unavailable?{listings:[]}:await request('/api/auction/item/'+id+'?'+listParams);
    const stats=el('dl',null,'ah-stats');
    if(!unavailable){
      stats.append(stat('Lowest unit buyout',item.unit_buyout==null?'No buyout listed':moneyNode(item.unit_buyout)));
      const lowestStack=item.cheapest_stack_buyout??item.stack_buyout;
      stats.append(stat('Lowest stack buyout',lowestStack>0?moneyNode(lowestStack):'No buyout listed'));
      stats.append(stat('Available',count(item.quantity)));
      stats.append(stat('Avg. price',item.historical_avg==null?'Not enough history':moneyNode(item.historical_avg)));
      stats.append(stat('Market %',marketNode(item.market_pct)));
      const t=trend(item.trend_pct);
      const movement=el('span');
      const change=el('span',null,t.className);change.append(el('span',t.label,'ah-trend-arrow'),' '+pct(item.trend_pct));movement.append(change);
      if(item.previous_unit!=null&&item.unit_buyout!=null){const prices=el('span',null,'ah-trend-prices');prices.append(moneyNode(item.previous_unit),' ',el('span','→'),' ',moneyNode(item.unit_buyout));movement.append(prices);}
      stats.append(stat('Price Trend',item.trend_pct==null?'No comparison':movement));
      stats.append(stat('Cheapest listing time left',timeNode(item.time_left_ms,item.captured_at)));
    }else stats.append(stat('Current status','Not listed'));
    const parts=[stats],variant=variantDetails(item),bonuses=variantLines(item);
    if(variant.hasVariant){
      const vbox=el('section',null,'ah-roll-detail');
      vbox.append(el('strong','Item variant'));
      if(bonuses.length)for(const bonus of bonuses)vbox.append(el('span',bonus));
      else vbox.append(el('span','Random stats unavailable for this variant.','ah-note'));
      if(variant.unresolved)vbox.append(el('small','Unrecognised custom or suffix variant; stats not estimated.'));
      else vbox.append(el('small','Standard Classic DBC reference; OctoWoW custom changes may differ.'));
      parts.unshift(vbox);
    }
    const dbLink=el('a','View in OctoWoW database','ah-db-link');
    dbLink.href='https://octowow.st/db/?item='+encodeURIComponent(item.item_id);
    dbLink.target='_blank';dbLink.rel='noopener noreferrer';
    parts.push(dbLink);
    if(state.listingFiltered&&!unavailable)parts.push(el('p','Totals above reflect your active price, stack and time filters. The listings below are every auction for this item.','ah-muted'));
    // price history
    const hist=section('Price history',true);
    let historyLoaded=false;
    const loadHistory=async()=>{
      if(historyLoaded)return;
      historyLoaded=true;
      hist.body.replaceChildren(el('p','Loading price history…','ah-muted'));
      try{
        const history=await request('/api/auction/history/'+id+'?'+params);
        const days=Array.isArray(history.history)?history.history:[];
        hist.body.replaceChildren();
        const chart=buildChart(document,days);
        if(chart)wireChartTooltip(chart);
        const values=days.map(d=>d.representative_unit).filter(v=>v!=null&&Number.isFinite(Number(v))&&Number(v)>0).map(Number);
        const summary=el('div',null,'ah-history-summary');
        if(values.length){for(const [label,value,colour] of [['All-time high',Math.max(...values),'red'],['Average price',Math.round(values.reduce((a,b)=>a+b,0)/values.length),'yellow'],['All-time low',Math.min(...values),'green']]){const row=el('div',null,'ah-history-stat');row.append(el('span',label+':','ah-time-'+colour),moneyNode(value));summary.append(row);}summary.append(el('small','Based on retained daily lowest unit buyouts.','ah-muted'));}
        if(chart){const layout=el('div',null,'ah-history-layout');layout.append(chart,summary);hist.body.append(layout);hist.body.append(el('p','Daily lowest unit buyout from completed scans.','ah-chart-note'));}
        else hist.body.append(el('p','Not enough history for a chart yet: '+days.length+' day'+(days.length===1?'':'s')+' observed, at least '+MIN_POINTS+' needed.','ah-muted'));
        if(!chart&&values.length)hist.body.append(summary);
        if(days.length){
          const raw=section('Daily observations ('+days.length+')',false);
          raw.body.append(simpleTable(['Day','Lowest unit buyout','Quantity','Listings'],days.map(d=>[d.day,moneyNode(d.representative_unit),count(d.quantity),count(d.listings)])));
          hist.body.append(raw.d);
        }
      }catch{
        historyLoaded=false;
        hist.body.replaceChildren(el('p','Price history is unavailable. Close and reopen to retry.','ah-muted'));
      }
    };
    hist.d.addEventListener('toggle',()=>{if(hist.d.open)void loadHistory();});
    parts.push(hist.d);
    if(hist.d.open)void loadHistory();
    // individual auctions
    if(!unavailable){
      // First 20 cheapest auctions. Newer API versions page on the server (?limit/?offset); an older one returns its whole list
      // (up to 200) once, which is then shown 20 at a time without any further request.
      const headings=['Seller','Quantity','Unit price','Stack price','Current bid','Avg. price','Market %','Time left'];
      const serverPaged=typeof listings.has_more==='boolean';
      const pool=listings.listings||[];
      const seen=new Set();let shown=0,hasMore=false,loading=false;
      const total=serverPaged?listings.total:pool.length;
      const auctions=section('Auction listings ('+count(total)+(!serverPaged&&listings.limited?'+':'')+')',true);
      const listingCells=r=>{
        const bid=Number(r.current_bid)>0?bidAmount(r.current_bid,null,r.buyout,r.unit_buyout):null;
        const average=item.historical_avg;
        return [r.owner_name||'Unknown',r.quantity,moneyNode(r.unit_buyout),r.buyout>0?moneyNode(r.buyout):'–',bid===null?'–':moneyNode(bid),moneyNode(average),marketNode(listingMarketPct(r.unit_buyout,average)),timeNode(r.time_left_ms,r.captured_at)];
      };
      if(!pool.length)auctions.body.append(el('p',state.filters.owner?'No listings from this seller for this item.':'No listings are available for this item.','ah-muted'));
      else{
        const table=simpleTable(headings,[]),tbody=table.tBodies[0];
        const more=el('button','Load More','ah-btn ah-load-more');more.type='button';more.hidden=true;
        const appendRows=rows=>{
          for(const r of rows){
            if(r.auction_id!=null){if(seen.has(r.auction_id))continue;seen.add(r.auction_id);}
            const line=el('tr');listingCells(r).forEach((v,i)=>{const c=td(line,v);c.dataset.label=headings[i];});tbody.append(line);shown++;
          }
        };
        const refresh=()=>{more.hidden=!hasMore;};
        if(serverPaged){appendRows(pool);hasMore=listings.has_more===true;}
        else{appendRows(pool.slice(0,LISTING_PAGE));hasMore=shown<pool.length;}
        more.addEventListener('click',async()=>{
          if(loading||!hasMore)return;
          loading=true;more.disabled=true;more.textContent='Loading…';
          try{
            if(serverPaged){
              const next=await request('/api/auction/item/'+id+'?'+new URLSearchParams({...Object.fromEntries(listParams),offset:String(shown)}));
              appendRows(next.listings||[]);hasMore=next.has_more===true&&(next.listings||[]).length>0;
            }else{
              appendRows(pool.slice(shown,shown+LISTING_PAGE));hasMore=shown<pool.length;
            }
            more.textContent='Load More';
          }catch{more.textContent='Could not load more. Try again.';}
          finally{loading=false;more.disabled=false;refresh();}
        });
        refresh();
        auctions.body.append(table,more);
      }
      if(!serverPaged&&listings.limited)auctions.body.append(el('p','Showing the 200 cheapest auctions.','ah-chart-note'));
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
    const tr=el('tr'),cell=td(tr,favouritesOnlyEmpty?'You have no favorite items yet. Select the star beside any item to add it.':
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
  itemRequest?.abort();
  const controller=itemRequest=new AbortController();
  const errors=validate(state.filters);
  renderErrors(errors);
  if(Object.keys(errors).length)return;
  if(state.filters.favourites_only&&!state.fav.length){renderRows({items:[],total:0,has_more:false},{favouritesOnlyEmpty:true});return;}
  const params=buildParams(state.filters,{limit:state.limit,offset:state.page*state.limit,keys:state.filters.favourites_only?apiKeys(state.fav):null});
  busy(1);
  try{
    const data=await requestItems(params,controller.signal);
    if(id!==state.queryId)return;
    if(!data.items.length&&state.page>0&&data.total>0){state.page=Math.max(0,Math.ceil(data.total/state.limit)-1);return refreshItems();}
    renderRows(data);
    state.fav=refreshSnapshots(state.fav,data.items);
  }catch{if(id===state.queryId)note('Auction House results could not be refreshed.');}
  finally{busy(-1);}
}
async function refreshFavourites(){
  const id=++state.favId,body=$('fav-body');
  favouriteRequest?.abort();
  const controller=favouriteRequest=new AbortController();
  $('fav-count').textContent=String(state.fav.length);
  if(!state.fav.length){
    body.replaceChildren(el('p','No favorites yet. Select the star beside any item to track it here, with its latest price, quantity, market % and trend. Favorites are saved in this browser.','ah-muted ah-empty-fav'));
    return;
  }
  let data=null;
  state.favFailed=false;
  try{data=await requestItems(buildParams({...DEFAULTS,...state.favSort},{limit:100,keys:apiKeys(state.fav)}),controller.signal);}catch{if(id===state.favId)state.favFailed=true;}
  if(id!==state.favId)return;
  const wasFiltered=state.listingFiltered;
  state.listingFiltered=false;
  const found=new Map((data?.items||[]).map(i=>[keyOf(i),i]));
  if(data){state.fav=refreshSnapshots(state.fav,data.items);saveFavourites(storage,state.fav);}
  const table=el('table'),head=el('tr');
  ['','Item','Available','Listings','Unit price','Stack price','Current bid','Avg. price','Market %','Trend','Time left'].forEach((h,i)=>{const th=el('th',h);if(i===0){th.className='ah-col-star';th.append(el('span','Favorite','sr-only'));}head.append(th);});
  const thead=el('thead');thead.append(head);table.append(thead);
  const tbody=el('tbody');
  // The API orders all listed favourites by the selected metric; unavailable ones follow by name.
  const ordered=[...(data?.items||[]),...state.fav.filter(f=>!found.has(keyOf(f))).sort((a,b)=>itemName(a).localeCompare(itemName(b),'en-GB'))];
  for(const f of ordered){
    const live=found.get(keyOf(f));
    if(live)appendItemRow(tbody,live);else appendItemRow(tbody,f,{unavailable:true,error:state.favFailed});
  }
  table.append(tbody);
  prepareSortHeaders(table,'favourites');
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
async function refreshSummary(){
  try{
    const s=await request('/api/auction/summary');
    const st=Object.hasOwn(s,'has_catalogue')?s:await request('/api/auction/scan-status').catch(()=>s);
    state.scan={id:s.scan_id??s.completed_at,catalogue:s.has_catalogue===true,completedAt:s.completed_at,
      scanning:Boolean(st.scanning),startedAt:st.started_at??null,collectorStatus:st.collector_status??null,
      pages:(st.pages_done??0)+' / '+(st.pages_expected??'?')+' pages'};
    $('last-scan').textContent=s.completed_at?'Last scan: '+dateTime(s.completed_at):'No completed scan';
    renderScan();
    $('auction-count').textContent=count(s.auction_count);
    $('historical-auction-count').textContent=count(s.total_historical_auctions);
    const itemCount=$('item-count'),coverage=indexCoverage(s.items_with_metadata,s.item_count);
    itemCount.textContent=count(s.item_count);
    itemCount.className=indexedClass(s.items_with_metadata,s.item_count)||'';
    itemCount.title=coverage===null?'Catalog coverage unavailable':
      'Catalog metadata: '+count(s.items_with_metadata)+' of '+count(s.item_count)+' item variants ('+(coverage*100).toFixed(1)+'%)';
    // Only a problem is worth a line of text; a healthy snapshot shows its time in the cards above.
    note(s.completed_at?'':'No data \u2013 no completed Auction House scan has been verified.');
  }catch{note('Auction House feed unavailable – no data is being invented.');}
}
/** Re-evaluates the scan status card from the last data received; called every second so the timers run. */
function renderScan(){
  const now=Date.now(),sc=state.scan;
  const status=$('scan-progress'),next=scanStatus(sc,now);
  status.textContent=next.text;status.className=next.className;
  const last=$('last-scan');if(last)last.className=lastScanClass(sc.completedAt,now)||'ah-time-yellow';
  status.title=sc.collectorStatus==='STALE'?'Scan upload has not reported progress recently':sc.scanning?sc.pages:'';
}
async function refreshAll(){
  busy(1);
  try{await refreshSummary();await Promise.all([refreshItems(),refreshFavourites()]);}
  finally{busy(-1);}
}

/* ---------- controls ---------- */
function option(value,label){const o=document.createElement('option');o.value=String(value);o.textContent=label;return o;}
function fillSelect(select,first,pairs){select.replaceChildren(option('',first),...pairs.map(([v,l])=>option(v,l)));}
function populate(){
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
}
function writeFilters(){
  const f=state.filters;
  $('item_class').value=f.item_class;fillSubclasses();
  for(const k of TEXT_FIELDS)$(DOM_ID[k]||k).value=f[k];
  for(const k of CHECK_FIELDS)$(k).checked=f[k];
  const fav=$('fav-only');fav.setAttribute('aria-pressed',String(f.favourites_only));
  updateBadges();syncAllStars();updateSortHeaders();
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
  prepareSortHeaders($('items').closest('table'));
  for(const id of [...TEXT_FIELDS.map(k=>DOM_ID[k]||k),...CHECK_FIELDS]){
    const node=$(id);
    node.addEventListener(node.tagName==='INPUT'&&node.type!=='checkbox'?'input':'change',()=>{
      if(id==='item_class'){$('item_subclass').value='';fillSubclasses();}
      changed(node.tagName==='SELECT'||node.type==='checkbox');
    });
  }
  $('filters').addEventListener('submit',e=>e.preventDefault());
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
    $('fav-body').hidden=hide;$('fav-collapse').setAttribute('aria-expanded',String(!hide));
    try{storage?.setItem('octobot.auction.favourites.collapsed',hide?'1':'0');}catch{/* optional convenience only */}
  });
  try{if(storage?.getItem('octobot.auction.favourites.collapsed')==='1')$('fav-collapse').click();}catch{/* ignore */}
}
populate();bind();renderSaved();
state.filters.q=auctionSearchFromURL(location.href);
writeFilters();
await refreshAll();
// A link from World Chat opens straight onto that item's listings (?open=<item id>).
{const wanted=new URLSearchParams(location.search).get('open');if(/^\d{1,10}$/.test(wanted||'')){const row=$('items').querySelector('tr.ah-entry[data-item-id="'+wanted+'"]');if(row&&row.getAttribute('aria-expanded')!=='true')row.click();}}
let polling=false;
async function pollSnapshot(){
  if(document.hidden||polling)return;
  polling=true;
  try{const before=state.scan.id;await refreshSummary();if(state.scan.id!==before)await Promise.all([refreshItems(),refreshFavourites()]);}finally{polling=false;}
}
setInterval(pollSnapshot,60_000);
document.addEventListener('visibilitychange',pollSnapshot);
setInterval(()=>{renderScan();tickAuctionTimes();},1000);                       // keep scan duration and last-scan age current
// Summary polling above replaces repeated full item and favourites refreshes.
