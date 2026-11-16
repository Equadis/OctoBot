/* OctoBot Auction House — no mock records and no frontend secrets. */
const API='https://octometrics.eqvoice.workers.dev';
const $=id=>document.getElementById(id);
const state={page:0,limit:50,loading:false,last:null,queryId:0};
const money=n=>{
  if(n==null||!Number.isFinite(Number(n)))return '—';
  let c=Math.max(0,Math.round(Number(n)));
  const g=Math.floor(c/10000),s=Math.floor(c%10000/100),b=c%100;
  return [g?g+'g':null,(g||s)?s+'s':null,b+'c'].filter(Boolean).join(' ');
};
const date=s=>s?new Date(s).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC':'NO DATA';
const pct=n=>n==null||!Number.isFinite(Number(n))?'NO DATA':Number(n).toFixed(1)+'%';
function trend(n){
  if(n==null||!Number.isFinite(Number(n)))return {label:'—',className:'ah-change-neutral'};
  n=Number(n);
  if(Math.abs(n)<10)return {label:'→',className:'ah-change-neutral'};
  return {label:(n>0?'↑':'↓').repeat(Math.abs(n)>=25?2:1),className:n>0?'ah-change-up':'ah-change-down'};
}
function left(ms,capturedAt){
  if(!Number.isFinite(Number(ms))||ms==null)return 'Uncertain';
  const elapsed=Math.max(0,Date.now()-Date.parse(capturedAt||''));
  const remaining=Math.max(0,Number(ms)-elapsed);
  if(!remaining)return 'Uncertain';
  const hours=Math.floor(remaining/3600000);
  const minutes=Math.floor(remaining%3600000/60000);
  return '≈ '+(hours?hours+'h ':'')+minutes+'m';
}
function el(tag,content,className){
  const node=document.createElement(tag);
  if(content!==undefined&&content!==null)node.textContent=String(content);
  if(className)node.className=className;
  return node;
}
function td(row,value){const cell=el('td',value);row.append(cell);return cell;}
function note(message){$('ah-status').textContent=message;}
async function request(path){
  const r=await fetch(API+path,{cache:'no-store',headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('API HTTP '+r.status);
  return r.json();
}
function qualityClass(q){return 'ah-q'+(Number.isInteger(Number(q))?Math.max(0,Math.min(5,Number(q))):1);}
function itemCell(item){
  const wrapper=el('div',null,'ah-item');
  const icon=el('span');
  if(item.icon_url&&/^https:\/\//.test(item.icon_url)){const image=document.createElement('img');image.className='ah-icon';image.alt='';image.src=item.icon_url;image.loading='lazy';icon.append(image);}
  else {icon.className='ah-icon';icon.setAttribute('aria-hidden','true');}
  const link=el('a',item.item_name||('Item #'+item.item_id));
  link.href='https://octowow.st/db/?item='+encodeURIComponent(item.item_id);
  link.target='_blank';link.rel='noopener noreferrer';
  link.title='Open the OctoWoW item database';
  wrapper.append(icon,link);
  wrapper.classList.add(qualityClass(item.quality));
  return wrapper;
}
function renderRows(data){
  const body=$('items');body.replaceChildren();
  const items=Array.isArray(data.items)?data.items:[];
  if(!items.length){const tr=el('tr');const cell=td(tr,'No matching records in the latest completed scan.');cell.colSpan=10;cell.className='ah-empty';body.append(tr);}
  for(const item of items){
    const tr=el('tr'),cell=el('td');
    const wrap=el('div',null,'ah-item');
    const expand=el('button','▸', 'ah-expand');
    expand.type='button';expand.title='Show individual auction listings';expand.setAttribute('aria-expanded','false');
    wrap.append(expand,itemCell(item));cell.append(wrap);tr.append(cell);
    td(tr,item.quantity??'—');td(tr,item.listings??'—');td(tr,money(item.unit_buyout));
    td(tr,money(item.stack_buyout));td(tr,money(item.current_bid??item.start_bid));
    td(tr,money(item.historical_avg));td(tr,pct(item.market_pct));
    const t=trend(item.trend_pct),trendCell=td(tr,t.label);trendCell.className=t.className;
    trendCell.title=item.trend_pct==null?'No previous completed scan for this item':('Previous '+money(item.previous_unit)+'; now '+money(item.unit_buyout)+'; change '+pct(item.trend_pct));
    td(tr,left(item.time_left_ms,item.captured_at));
    body.append(tr);
    expand.addEventListener('click',async()=>{
      const next=tr.nextElementSibling;
      if(next&&next.classList.contains('ah-detail')){next.remove();expand.setAttribute('aria-expanded','false');expand.textContent='▸';return;}
      expand.disabled=true;
      const detail=el('tr',null,'ah-detail'),detailCell=el('td','Loading listings…');detailCell.colSpan=10;detail.append(detailCell);tr.after(detail);
      try{
        const result=await request('/api/auction/item/'+encodeURIComponent(item.item_id)+'?variant='+encodeURIComponent(item.variant||''));
        const detailTable=el('table');const thead=el('thead');const headings=el('tr');
        ['Seller','Quantity','Starting bid','Current bid','Minimum next bid','Buyout','Unit buyout','Time left'].forEach(v=>headings.append(el('th',v)));
        thead.append(headings);detailTable.append(thead);const tbody=el('tbody');
        for(const row of result.listings||[]){
          const line=el('tr');
          [row.seller||'Unknown',row.quantity,money(row.start_bid),money(row.current_bid),money(row.min_next_bid),money(row.buyout),money(row.unit_buyout),left(row.time_left_ms,row.captured_at)].forEach(value=>td(line,value));
          tbody.append(line);
        }
        detailTable.append(tbody);detailCell.replaceChildren(detailTable);
      }catch{detailCell.textContent='Listings are unavailable; the prior snapshot remains unchanged.';}
      expand.disabled=false;expand.textContent='▾';expand.setAttribute('aria-expanded','true');
    });
  }
  $('result-count').textContent=(data.total??items.length).toLocaleString('en-GB')+' items';
  $('page-label').textContent='Page '+(state.page+1);
  $('previous').disabled=state.page===0;
  $('next').disabled=!data.has_more;
}
async function refreshSummary(){
  try{
    const summary=await request('/api/auction/summary');
    $('collector').textContent=summary.collector_status||'OFFLINE';
    $('last-scan').textContent=date(summary.completed_at);
    $('auction-count').textContent=summary.auction_count==null?'—':Number(summary.auction_count).toLocaleString('en-GB');
    $('item-count').textContent=summary.item_count==null?'—':Number(summary.item_count).toLocaleString('en-GB');
    $('scan-progress').textContent=summary.scanning?((summary.pages_done??0)+' / '+(summary.pages_expected??'?')+' pages'):'Idle';
    if(!summary.completed_at)note('NO DATA — no completed Auction House scan has been verified.');
    else{const age=Math.max(0,Date.now()-Date.parse(summary.completed_at));note('Latest full snapshot: '+date(summary.completed_at)+(age>2*3600000?' · STALE':' · recently observed'));}
    if(summary.historical_days<4)$('sort').value=$('sort').value==='market_pct'?'name':$('sort').value;
  }catch{note('Auction House feed unavailable — no data is being invented.');$('collector').textContent='OFFLINE';}
}
async function refreshItems(){
  const id=++state.queryId;state.loading=true;$('refresh').disabled=true;
  const params=new URLSearchParams({limit:String(state.limit),offset:String(state.page*state.limit),sort:$('sort').value});
  if($('search').value.trim())params.set('q',$('search').value.trim());
  if($('quality').value!=='')params.set('quality',$('quality').value);
  try{const data=await request('/api/auction/items?'+params);if(id===state.queryId)renderRows(data);}
  catch{if(id===state.queryId)renderRows({items:[],total:0,has_more:false});}
  finally{state.loading=false;$('refresh').disabled=false;}
}
async function refreshAll(){await Promise.all([refreshSummary(),refreshItems()]);}
let debounce;
for(const id of ['search','quality','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>{
  state.page=0;clearTimeout(debounce);debounce=setTimeout(refreshItems,250);
});
$('refresh').addEventListener('click',refreshAll);
$('previous').addEventListener('click',()=>{if(state.page>0){state.page--;void refreshItems();}});
$('next').addEventListener('click',()=>{if(!$('next').disabled){state.page++;void refreshItems();}});
await refreshAll();
setInterval(refreshAll,60_000);
