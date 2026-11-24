/* Item categories, subcategories and equipment slots, as numeric IDs from the OctoWoW catalogue snapshot.
 * Names are given only where the standard 1.12 item data is unambiguous AND the catalogue agrees (weapons, armour,
 * recipes, ammunition). Other subclasses are labelled "Type N": the filter still works on the real ID, but we
 * do not attach a name we cannot verify. */
const t=(id,name)=>Object.freeze({id,name});
export const WEAPON=Object.freeze([t(0,'One-handed axes'),t(1,'Two-handed axes'),t(2,'Bows'),t(3,'Guns'),t(4,'One-handed maces'),t(5,'Two-handed maces'),t(6,'Polearms'),
  t(7,'One-handed swords'),t(8,'Two-handed swords'),t(10,'Staves'),t(13,'Fist weapons'),t(14,'Miscellaneous'),t(15,'Daggers'),t(16,'Thrown'),t(18,'Crossbows'),t(19,'Wands'),t(20,'Fishing poles')]);
export const ARMOUR=Object.freeze([t(0,'Miscellaneous'),t(1,'Cloth'),t(2,'Leather'),t(3,'Mail'),t(4,'Plate'),t(6,'Shields'),t(7,'Librams'),t(8,'Idols'),t(9,'Totems')]);
export const RECIPE=Object.freeze([t(0,'Books'),t(1,'Leatherworking'),t(2,'Tailoring'),t(3,'Engineering'),t(4,'Blacksmithing'),t(5,'Cooking'),t(6,'Alchemy'),t(7,'First Aid'),t(8,'Enchanting'),t(9,'Fishing'),t(10,'Jewelcrafting')]);
export const AMMUNITION=Object.freeze([t(2,'Arrows'),t(3,'Bullets')]);
export const QUIVER=Object.freeze([t(2,'Quivers'),t(3,'Ammo pouches')]);
export const CATEGORIES=Object.freeze([
  Object.freeze({id:2,name:'Weapons',subclasses:WEAPON}),
  Object.freeze({id:4,name:'Armor',subclasses:ARMOUR}),
  Object.freeze({id:9,name:'Recipes',subclasses:RECIPE}),
  Object.freeze({id:0,name:'Consumables',subclasses:null}),
  Object.freeze({id:7,name:'Trade goods',subclasses:null}),
  Object.freeze({id:1,name:'Containers',subclasses:null}),
  Object.freeze({id:6,name:'Projectiles',subclasses:AMMUNITION}),
  Object.freeze({id:11,name:'Quivers',subclasses:QUIVER}),
  Object.freeze({id:12,name:'Quest items',subclasses:null}),
  Object.freeze({id:13,name:'Keys',subclasses:null}),
  Object.freeze({id:15,name:'Miscellaneous',subclasses:null})
]);
/** Subclass IDs present in the catalogue snapshot for classes whose subclass names are not verified (checked by a test). */
export const OBSERVED_SUBCLASSES=Object.freeze({0:[0,2,3,4,5,6],7:[1,2,3,7],1:[0,1,2,3,7],12:[0],13:[0],15:[0,2,4]});
/** Subcategory choices for a class; classes without verified names offer "Type N" so every real ID stays reachable. */
export function subclassOptions(classId){
  const category=CATEGORIES.find(c=>c.id===Number(classId));
  if(!category)return [];
  if(category.subclasses)return category.subclasses;
  return (OBSERVED_SUBCLASSES[category.id]||[]).map(id=>t(id,'Type '+id));
}
export const SLOTS=Object.freeze([t(1,'Head'),t(2,'Neck'),t(3,'Shoulder'),t(5,'Chest'),t(20,'Robe'),t(4,'Shirt'),t(19,'Tabard'),t(9,'Wrist'),t(10,'Hands'),t(6,'Waist'),
  t(7,'Legs'),t(8,'Feet'),t(11,'Finger'),t(12,'Trinket'),t(16,'Back'),t(13,'One-hand'),t(17,'Two-hand'),t(14,'Shield'),t(23,'Held in off-hand'),
  t(15,'Ranged (bow)'),t(26,'Ranged (gun, crossbow, wand)'),t(25,'Thrown'),t(24,'Ammunition'),t(28,'Relic'),t(18,'Bag')]);
export const TIME_LEFT=Object.freeze([['short','Short (under 30 minutes)'],['medium','Medium (30 minutes to 2 hours)'],['long','Long (2 to 12 hours)'],['very_long','Very long (over 12 hours)']]);
export const RARITIES=Object.freeze([[0,'Poor'],[1,'Common'],[2,'Uncommon'],[3,'Rare'],[4,'Epic'],[5,'Legendary']]);
