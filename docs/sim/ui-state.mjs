// Temporary Gear Planner view state. It lives in sessionStorage so it survives moving between OctoBot pages in a tab
// but is dropped on a refresh or a new session. Saved builds (localStorage) are never touched here.
export const UI_PREFIX='octosim.ui.';
export const INTERNAL_RELOAD_KEY='octosim.internal-reload.v1';
export const uiKey=classId=>`${UI_PREFIX}${classId}.v1`;
const SLOT_PATTERN=/^[a-z0-9]{2,12}$/;
// True only for a real refresh. The planner reloads itself to follow history changes; that reload carries a flag and is not a refresh.
export function consumeReload(storage,navigationType){
  try{if(storage?.getItem(INTERNAL_RELOAD_KEY)){storage.removeItem(INTERNAL_RELOAD_KEY);return false;}}catch{}
  return navigationType==='reload';
}
export function markInternalReload(storage){try{storage.setItem(INTERNAL_RELOAD_KEY,'1');}catch{}}
export function clearUi(storage){
  try{for(const key of Object.keys(storage))if(key.startsWith(UI_PREFIX))storage.removeItem(key);}catch{}
}
const flags=value=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([key,flag])=>/^[\w-]{1,60}$/.test(key)&&typeof flag==='boolean'));
export function sanitiseUi(value){
  if(!value||typeof value!=='object')return null;
  const filters=value.filters&&typeof value.filters==='object'?{
    search:typeof value.filters.search==='string'?value.filters.search.slice(0,200):'',
    sort:typeof value.filters.sort==='string'?value.filters.sort.slice(0,40):'',
    quality:typeof value.filters.quality==='string'?value.filters.quality.slice(0,2):'',
    direction:value.filters.direction==='asc'?'asc':'desc',
  }:null;
  const number=n=>Number.isFinite(n)&&n>=0&&n<1e6?Math.round(n):0;
  return {
    slot:typeof value.slot==='string'&&SLOT_PATTERN.test(value.slot)?value.slot:null,
    filters,panels:flags(value.panels),groups:flags(value.groups),
    optionsOpen:typeof value.optionsOpen==='boolean'?value.optionsOpen:null,
    collapsedStats:Array.isArray(value.collapsedStats)?value.collapsedStats.filter(name=>typeof name==='string'&&name.length<=40).slice(0,20):[],
    scrollY:number(value.scrollY),itemScroll:number(value.itemScroll),
  };
}
export function loadUi(storage,classId){try{return sanitiseUi(JSON.parse(storage.getItem(uiKey(classId))));}catch{return null;}}
export function saveUi(storage,classId,state){try{storage.setItem(uiKey(classId),JSON.stringify(state));}catch{}}
