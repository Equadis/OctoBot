/* Filter state for the Auction House search: validation, conversion to API parameters, and saved searches.
 * Every filter here is answered by the Worker on the server, so counts and pagination always cover ALL results. */
import {parseMoney} from './format.mjs';

export const DEFAULTS=Object.freeze({
  q:'',sort:'recent',dir:'',quality:'',item_class:'',item_subclass:'',slot:'',min_level:'',max_level:'',gear:false,exact:false,
  min_quantity:'',stack:'',max_unit_buyout:'',max_unit_bid:'',has_buyout:false,time_left:'',owner:'',min_market_pct:'',max_market_pct:'',favourites_only:false
});
export const SORTS=Object.freeze([
  ['recent','Recent listings'],['market_pct','Most underpriced (market %)'],['name','Item name'],['unit_buyout','Unit price'],['stack_buyout','Stack price'],
  ['current_bid','Current bid'],['historical_avg','Historical average'],['quantity','Available quantity'],
  ['listings','Number of listings'],['trend_pct','Price movement'],['time_left','Time left (estimated)'],['level','Required level']]);
// Matches the default ordering in cloudflare/octometrics/auction-query.mjs.
export const SORT_DEFAULT_DIR=Object.freeze({recent:'desc',name:'asc',unit_buyout:'asc',stack_buyout:'asc',current_bid:'asc',
 historical_avg:'asc',quantity:'desc',listings:'desc',trend_pct:'asc',market_pct:'asc',time_left:'asc',level:'asc'});
// The star is an action, not a sortable data column. Every displayed metric is sortable.
export const COLUMN_SORTS=Object.freeze([
  ['Item','name'],['Available','quantity'],['Listings','listings'],['Unit price','unit_buyout'],
  ['Stack price','stack_buyout'],['Current bid','current_bid'],['Historical avg.','historical_avg'],
  ['Market %','market_pct'],['Trend','trend_pct'],['Time left','time_left']]);
export function nextColumnSort(current,key){
 if(!SORT_DEFAULT_DIR[key])throw new Error('Unknown Auction House sort column');
 const dir=current.sort===key ? (current.dir||SORT_DEFAULT_DIR[key])==='asc'?'desc':'asc' : SORT_DEFAULT_DIR[key];
 return {sort:key,dir};
}
/** Fields that narrow the results (everything except sorting). */
const NARROWING=['q','quality','item_class','item_subclass','slot','min_level','max_level','gear','exact','min_quantity','stack','max_unit_buyout','max_unit_bid','has_buyout','time_left','owner','min_market_pct','max_market_pct','favourites_only'];
const LABELS={q:'Name',quality:'Rarity',item_class:'Category',item_subclass:'Subcategory',slot:'Slot',min_level:'Min level',max_level:'Max level',gear:'Equipment only',exact:'Exact name',
  min_quantity:'Min quantity',stack:'Stack size',max_unit_buyout:'Max unit buyout',max_unit_bid:'Max unit bid',has_buyout:'Has buyout',time_left:'Time left',owner:'Seller',
  min_market_pct:'Min market %',max_market_pct:'Max market %',favourites_only:'Favourites only'};
const INTS={quality:[0,8],item_class:[0,20],item_subclass:[0,30],slot:[0,40],min_level:[0,70],max_level:[0,70],min_quantity:[1,10000000],stack:[1,100000],min_market_pct:[0,1000000],max_market_pct:[0,1000000]};
const MONEY=['max_unit_buyout','max_unit_bid'];

/** @returns {Record<string,string>} field -> message; empty when the state is valid. */
export function validate(f){
  const errors={};
  for(const [field,[min,max]] of Object.entries(INTS)){
    const v=String(f[field]??'').trim();
    if(v==='')continue;
    const n=Number(v);
    if(!/^\d+$/.test(v)||!Number.isSafeInteger(n)||n<min||n>max)errors[field]=LABELS[field]+' must be a whole number from '+min+' to '+max+'.';
  }
  for(const field of MONEY)if(parseMoney(f[field])===null)errors[field]=LABELS[field]+' must look like 2g 50s, 75s 5c or a number of copper.';
  if(!errors.min_level&&!errors.max_level&&f.min_level!==''&&f.max_level!==''&&Number(f.min_level)>Number(f.max_level))errors.max_level='Maximum level is below the minimum.';
  if(!errors.min_market_pct&&!errors.max_market_pct&&f.min_market_pct!==''&&f.max_market_pct!==''&&Number(f.min_market_pct)>Number(f.max_market_pct))errors.max_market_pct='Maximum market % is below the minimum.';
  if(f.owner&&!/^\d{1,20}$/.test(String(f.owner).trim()))errors.owner='Seller must be a numeric owner GUID.';
  if(f.item_subclass!==''&&f.item_class==='')errors.item_subclass='Choose a category first.';
  return errors;
}
/** Parameters for /api/auction/items. Unset filters are omitted; favourites are passed by the caller. */
export function buildParams(f,{limit=50,offset=0,keys=null}={}){
  const p=new URLSearchParams({limit:String(limit),offset:String(offset),sort:f.sort||DEFAULTS.sort});
  if(f.dir)p.set('dir',f.dir);
  const q=String(f.q||'').trim();
  if(q)p.set('q',q);
  for(const field of Object.keys(INTS)){const v=String(f[field]??'').trim();if(v!=='')p.set(field,v);}
  for(const field of MONEY){const c=parseMoney(f[field]);if(c!==undefined&&c!==null)p.set(field,String(c));}
  for(const field of ['gear','exact','has_buyout'])if(f[field])p.set(field,'1');
  if(f.time_left)p.set('time_left',f.time_left);
  if(String(f.owner||'').trim())p.set('owner',String(f.owner).trim());
  if(f.favourites_only||keys!==null)p.set('keys',keys??'');
  return p;
}
/** Filters currently narrowing the results, for the "n active" badge and the clear-filters button. */
export function activeFilters(f){
  return NARROWING.filter(field=>{const v=f[field];return typeof v==='boolean'?v:String(v??'').trim()!==''&&String(v)!==String(DEFAULTS[field]);})
    .map(field=>({field,label:LABELS[field]}));
}
/** Advanced-panel filters only (the quick controls are always visible). */
export const ADVANCED_FIELDS=Object.freeze(['slot','min_level','max_level','gear','exact','min_quantity','stack','max_unit_buyout','max_unit_bid','has_buyout','time_left','owner','min_market_pct','max_market_pct']);
export const advancedCount=f=>activeFilters(f).filter(a=>ADVANCED_FIELDS.includes(a.field)).length;
/** Reset narrowing filters but keep the user's sort choice. Favourites themselves are never touched here. */
export function reset(f){return {...DEFAULTS,sort:f.sort,dir:f.dir};}

/* ---------- saved searches (localStorage) ---------- */
export const SAVED_KEY='octobot.auction.saved-searches.v1';
export const MAX_SAVED=20;
const sanitise=f=>{
  const out={...DEFAULTS};
  for(const field of Object.keys(DEFAULTS)){
    const v=f?.[field];
    if(typeof DEFAULTS[field]==='boolean')out[field]=v===true;
    else if(typeof v==='string'||typeof v==='number')out[field]=String(v).slice(0,80);
  }
  if(!SORTS.some(([id])=>id===out.sort))out.sort=DEFAULTS.sort;
  if(out.dir!==''&&out.dir!=='asc'&&out.dir!=='desc')out.dir='';
  return out;
};
export function loadSaved(storage){
  try{
    const list=JSON.parse(storage?.getItem(SAVED_KEY)??'[]');
    if(!Array.isArray(list))return [];
    return list.filter(e=>e&&typeof e.name==='string'&&e.name.trim()&&e.name.length<=40).slice(0,MAX_SAVED).map(e=>({name:e.name.trim(),filters:sanitise(e.filters)}));
  }catch{return [];}
}
export function saveSearches(storage,list){try{storage.setItem(SAVED_KEY,JSON.stringify(list));return true;}catch{return false;}}
/** Adds or replaces (case-insensitive name). Returns null when the name is empty. */
export function addSaved(list,name,filters){
  const n=String(name||'').trim().slice(0,40);
  if(!n)return null;
  const entry={name:n,filters:sanitise(filters)};
  const without=list.filter(e=>e.name.toLowerCase()!==n.toLowerCase());
  return [...without,entry].slice(-MAX_SAVED);
}
export const removeSaved=(list,name)=>list.filter(e=>e.name!==name);
