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
