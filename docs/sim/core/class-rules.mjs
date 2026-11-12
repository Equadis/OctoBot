// OctoWoW public race/class pages audited 2026-11-12. See CLASS-AUDIT.md.
// Additional combinations extend Vanilla; dedicated race pages supersede the
// older new-races overview. Unknown base stats are never borrowed from a race.
export const RACE_MASKS=Object.freeze({Human:1,Orc:2,Dwarf:4,'Night Elf':8,Undead:16,Tauren:32,Gnome:64,Troll:128,Goblin:256,'High Elf':512});
export const RACE_FACTIONS=Object.freeze({Human:'Alliance',Dwarf:'Alliance','Night Elf':'Alliance',Gnome:'Alliance','High Elf':'Alliance',Orc:'Horde',Undead:'Horde',Tauren:'Horde',Troll:'Horde',Goblin:'Horde'});
export const CLASS_RACES=Object.freeze({
 warrior:['Human','Dwarf','Night Elf','Gnome','High Elf','Orc','Undead','Tauren','Troll','Goblin'],
 paladin:['Human','Dwarf','High Elf'],
 hunter:['Human','Dwarf','Night Elf','Gnome','High Elf','Orc','Undead','Tauren','Troll','Goblin'],
 rogue:['Human','Dwarf','Night Elf','Gnome','High Elf','Orc','Undead','Troll','Goblin'],
 priest:['Human','Dwarf','Night Elf','High Elf','Undead','Tauren','Troll'],
 shaman:['Orc','Tauren','Troll'],
 mage:['Human','Dwarf','Gnome','High Elf','Orc','Undead','Troll','Goblin'],
 warlock:['Human','Dwarf','Gnome','Orc','Undead','Troll','Goblin'],
 druid:['Night Elf','Tauren'],
});
export const CLASS_RESOURCES=Object.freeze({warrior:['rage'],rogue:['energy','comboPoints'],druid:['mana','energy','rage','comboPoints'],hunter:['mana','petFocus'],paladin:['mana'],shaman:['mana'],mage:['mana'],warlock:['mana','soulShards'],priest:['mana']});
export function validRace(classId,race){return Boolean(CLASS_RACES[classId]?.includes(race));}
export function slotAllowed(classId,slot){return !['ammo','quiver'].includes(slot)||classId==='hunter';}
export function isManaClass(classId){return CLASS_RESOURCES[classId]?.includes('mana')||false;}
export function racialPassives(race){
 return ({Human:{meleeSkills:{4:5,5:5,7:5,8:5}},Orc:{meleeSkills:{0:5,1:5}},Dwarf:{frostResistance:10,rangedSkills:{3:5}},'Night Elf':{natureResistance:10,dodge:1},Undead:{shadowResistance:10},Tauren:{natureResistance:10,healthMultiplier:1.05,skillBonuses:{Herbalism:15}},Gnome:{intellectMultiplier:1.05,arcaneResistance:10,skillBonuses:{Engineering:15}},Troll:{rangedSkills:{2:5,16:5}},Goblin:{meleeSkills:{4:3,5:3,15:3},skillBonuses:{Mining:10,Jewelcrafting:10}},'High Elf':{agilityMultiplier:1.02,rangedSkills:{2:3},skillBonuses:{Enchanting:10}}})[race]||{};
}
