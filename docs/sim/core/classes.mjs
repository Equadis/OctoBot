// Shared class metadata. Combat effects require separate OctoWoW validation.
// Proficiency baseline is Vanilla; official item masks additionally gate every item.
const define=(id,name,colour,mask,race,armour,weapons,dualWieldLevel=0,relicSubclass=null)=>({id,name,colour,mask,race,armour,weapons,dualWieldLevel,relicSubclass});
export const CLASS_DEFINITIONS=Object.freeze([
 define('warrior','Warrior','#c79c6e',1,'Human',4,[0,1,2,3,4,5,6,7,8,10,13,15,16,18],20),
 define('paladin','Paladin','#f58cba',2,'Human',4,[0,1,4,5,6,7,8],0,7),
 define('rogue','Rogue','#fff569',8,'Human',2,[2,3,4,7,13,15,16,18],10),
 define('druid','Druid','#ff7d0a',1024,'Night Elf',2,[4,5,10,13,15],0,8),
 define('shaman','Shaman','#388bff',64,'Orc',3,[0,1,4,5,10,13,15],0,9),
 define('hunter','Hunter','#abd473',4,'Night Elf',3,[0,1,2,3,6,7,8,10,13,15,16,18],20),
 define('mage','Mage','#69ccf0',128,'Human',1,[7,10,15,19]),
 define('warlock','Warlock','#9482c9',256,'Human',1,[7,10,15,19]),
 define('priest','Priest','#ffffff',16,'Human',1,[4,10,15,19]),
]);
export const CLASS_IDS=Object.freeze(CLASS_DEFINITIONS.map(c=>c.id));
export function classDefinition(id){const value=CLASS_DEFINITIONS.find(c=>c.id===id);if(!value)throw new Error('Unsupported class.');return value;}

export const PRIMARY_PROFESSIONS=Object.freeze(['Alchemy','Blacksmithing','Enchanting','Engineering','Herbalism','Leatherworking','Mining','Skinning','Tailoring']);
export const SECONDARY_SKILLS=Object.freeze(['Cooking','First Aid','Fishing']);
