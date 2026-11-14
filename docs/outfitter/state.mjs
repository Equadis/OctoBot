// Browser implementation of Tmog's slot/outfit workflow and T.O.L. interchange.
// Inventory-slot IDs differ from the inventory-type IDs used by the 3D viewer.
export const SLOTS = [
 [1,'Head',[1]],[3,'Shoulder',[3]],[15,'Back',[16]],[5,'Chest',[5,20]],
 [4,'Shirt',[4]],[19,'Tabard',[19]],[9,'Wrist',[9]],[10,'Hands',[10]],
 [6,'Waist',[6]],[7,'Legs',[7]],[8,'Feet',[8]],
 [16,'Main hand',[13,17,21]],[17,'Off hand',[13,14,22,23]],[18,'Ranged',[15,25,26]]
].map(([id,name,types])=>({id,name,types}));
export const RACES = [[1,'Human'],[2,'Orc'],[3,'Dwarf'],[4,'Night Elf'],[5,'Undead'],[6,'Tauren'],[7,'Gnome'],[8,'Troll']];
export const emptyOutfit = () => ({version:1,race:1,gender:0,gear:{},hideHead:false,hideBack:false});
export function normalise(value) {
 if(!value || typeof value!=='object') throw Error('Invalid outfit.');
 const next=emptyOutfit();
 if(RACES.some(([id])=>id===value.race)) next.race=value.race;
 if(value.gender===1) next.gender=1;
 next.hideHead=value.hideHead===true;next.hideBack=value.hideBack===true;
 for(const {id} of SLOTS) {const item=Number(value.gear?.[id]);if(Number.isSafeInteger(item)&&item>0&&item<=1000000)next.gear[id]=item;}
 return next;
}
export function equip(outfit,slot,item) {
 const spec=SLOTS.find(s=>s.id===slot);
 if(!spec || !spec.types.includes(item.slot))throw Error('This item does not fit the selected slot.');
 const next=normalise(outfit);
 // Two-handed weapons and off-hand equipment are mutually exclusive.
 if(slot===16&&item.slot===17)delete next.gear[17];
 next.gear[slot]=item.id;return next;
}
export function exportTmog(outfit) {
 return 'T.O.L.'+SLOTS.filter(s=>outfit.gear[s.id]).map(s=>`${s.id}:${outfit.gear[s.id]};`).join('');
}
export function importTmog(text) {
 const code=text.trim();
 if(code.length>4096 || !/^T\.O\.L\.(?:\d+:\d+;)*$/.test(code))throw Error('Enter a Tmog code beginning with T.O.L.');
 const value=emptyOutfit();
 for(const pair of code.slice(6).split(';').filter(Boolean)) {
  const [slot,item]=pair.split(':').map(Number);
  if(!SLOTS.some(s=>s.id===slot)||!Number.isSafeInteger(item)||item<1||item>1000000)throw Error('Invalid item or equipment slot in Tmog code.');
  value.gear[slot]=item;
 }
 return value;
}
export function encode(outfit) {return encodeURIComponent(JSON.stringify(normalise(outfit)));}
export function decode(text) {if(text.length>8192)throw Error('Outfit link is too large.');return normalise(JSON.parse(decodeURIComponent(text)));}
export function viewerSlot(slot,item) {
 if(slot===16)return 21;
 if(slot===17)return 22;
 if(slot===18)return 26;
 return item.slot===20?5:item.slot;
}
export function filterItems(items,{slot,query='',subclass='',quality=''}) {
 const spec=SLOTS.find(s=>s.id===slot);if(!spec)return [];
 const q=query.trim().toLowerCase();
 return items.filter(i=>spec.types.includes(i.slot)&&[2,4].includes(i.classs)&&
  (!q||i.name.toLowerCase().includes(q)||String(i.id)===q)&&
  (subclass===''||`${i.classs}:${i.subclass}`===subclass)&&
  (quality===''||i.quality===Number(quality))).sort((a,b)=>a.name.localeCompare(b.name)||a.id-b.id);
}

// Items the Classic model library does not contain (custom OctoWoW copies of tier items, for example) often share a
// name with an original item that it does contain. These helpers find those same-name items so the preview can borrow
// their model. The result is an approximation and is always labelled as one.
const nameKey = item => `${item.slot}|${item.classs}|${item.subclass}|${String(item.name).trim().toLowerCase()}`;
export function buildNameIndex(items) {
 const index = new Map();
 for (const item of items) {
  const key = nameKey(item);
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(item);
 }
 for (const list of index.values()) list.sort((a, b) => a.id - b.id); // original (lower id) items first
 return index;
}
export function sameNameItems(index, item, limit = 3) {
 return (index.get(nameKey(item)) || []).filter(other => other.id !== item.id).slice(0, limit);
}

// Second approximation, used only when no same-name item has a model: items that share an inventory icon, slot and
// type are very often the same underlying display, so an original item with the same icon is a close stand-in.
const iconKey = item => `${item.slot}|${item.classs}|${item.subclass}|${String(item.icon || '').toLowerCase()}`;
export function buildIconIndex(items) {
 const index = new Map();
 for (const item of items) {
  if (!item.icon) continue;
  const key = iconKey(item);
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(item);
 }
 for (const list of index.values()) list.sort((a, b) => a.id - b.id);
 return index;
}
export function sameIconItems(index, item, limit = 5) {
 if (!item.icon) return [];
 return (index.get(iconKey(item)) || []).filter(other => other.id !== item.id).slice(0, limit);
}
