/* Favourite items, kept in localStorage (no accounts). A favourite is an item AND its variant (suffix, enchant),
 * so "of the Bear" and "of the Eagle" are tracked separately. The stored name, rarity and icon are a snapshot of
 * what the site already showed, so an item with no listing in the latest scan can still be named. */
export const STORAGE_KEY='octobot.auction.favourites.v1';
export const MAX_FAVOURITES=100;
export const keyOf=item=>String(Number(item.item_id))+':'+String(item.variant??'');
const clean=v=>{
  const id=Number(v?.item_id);
  const variant=typeof v?.variant==='string'&&/^(?:\d{1,10}:\d{1,10}:\d{1,10})?$/.test(v.variant)?v.variant:null;
  if(!Number.isSafeInteger(id)||id<1||variant===null)return null;
  const name=typeof v.item_name==='string'&&v.item_name.trim()&&v.item_name.length<=160?v.item_name.trim():null;
  const q=Number(v.quality);
  const icon=typeof v.icon_url==='string'&&/^https:\/\/wow\.zamimg\.com\//.test(v.icon_url)&&v.icon_url.length<=400?v.icon_url:null;
  return {item_id:id,variant,item_name:name,quality:v.quality!=null&&Number.isInteger(q)&&q>=0&&q<=8?q:null,icon_url:icon};
};
/** Never throws: private windows, blocked storage or corrupt JSON all yield an empty list. */
export function loadFavourites(storage){
  try{
    const parsed=JSON.parse(storage?.getItem(STORAGE_KEY)??'[]');
    if(!Array.isArray(parsed))return [];
    const seen=new Set(),list=[];
    for(const entry of parsed){
      const f=clean(entry);
      if(f&&!seen.has(keyOf(f))){seen.add(keyOf(f));list.push(f);}
      if(list.length>=MAX_FAVOURITES)break;
    }
    return list;
  }catch{return [];}
}
export function saveFavourites(storage,list){
  try{storage.setItem(STORAGE_KEY,JSON.stringify(list));return true;}catch{return false;}
}
export const isFavourite=(list,item)=>list.some(f=>keyOf(f)===keyOf(item));
/** Returns {list,added,full}. Toggling never duplicates and never exceeds the limit. */
export function toggleFavourite(list,item){
  const k=keyOf(item);
  if(list.some(f=>keyOf(f)===k))return {list:list.filter(f=>keyOf(f)!==k),added:false,full:false};
  const entry=clean(item);
  if(!entry)return {list,added:false,full:false};
  if(list.length>=MAX_FAVOURITES)return {list,added:false,full:true};
  return {list:[...list,entry],added:true,full:false};
}
/** Refreshes stored names, rarity and icons from newer observations without ever deleting a known value. */
export function refreshSnapshots(list,items){
  const byKey=new Map(items.map(i=>[keyOf(i),i]));
  return list.map(f=>{
    const i=byKey.get(keyOf(f));
    if(!i)return f;
    const merged={...f};
    for(const field of ['item_name','quality','icon_url'])if(i[field]!=null)merged[field]=i[field];
    return clean(merged)||f;
  });
}
export const apiKeys=list=>list.map(keyOf).join(',');
