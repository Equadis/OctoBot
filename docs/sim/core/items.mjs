import { classDefinition } from './classes.mjs?v=20261111-classes1';
// Database listing filters are preliminary. Equipping requires the source detail masks.
export const SLOT_TYPES = Object.freeze({ head:[1],neck:[2],shoulder:[3],back:[16],chest:[5,20],wrist:[9],hands:[10],waist:[6],legs:[7],feet:[8],ring1:[11],ring2:[11],trinket1:[12],trinket2:[12],mainhand:[13,17,21],offhand:[13,14,22,23],ranged:[15,25,26,28],shirt:[4],tabard:[19],ammo:[24],quiver:[18] });
export const RACES = Object.freeze({Human:1,Orc:2,Dwarf:4,'Night Elf':8,Undead:16,Tauren:32,Gnome:64,Troll:128});


export function listingRestriction(item, build, slot) {
  if (!item || !SLOT_TYPES[slot]?.includes(item.slot)) return 'Wrong equipment slot.';
  let cls;try{cls=classDefinition(build.classId);}catch{return 'Class equipment rules are not implemented.';}
  if ((item.reqlevel || 0) > build.level) return `Requires level ${item.reqlevel}.`;
  if(['ammo','quiver'].includes(slot)){
    if(!['warrior','rogue','hunter'].includes(cls.id))return 'This class cannot use ranged ammunition.';
    if(slot==='ammo'&&item.classs!==6||slot==='quiver'&&item.classs!==11)return 'Wrong equipment type.';
    const weapon=build.gear.ranged?.subclass;
    if(weapon!==undefined&&![2,3,18].includes(weapon))return 'Select a bow, crossbow or gun first.';
    if(weapon!==undefined&&item.subclass!==(weapon===3?3:2))return 'Ammunition or container does not match the ranged weapon.';
    return null;
  }
  if (item.classs === 2 && !cls.weapons.includes(item.subclass) && !(item.subclass===20 && (build.skills?.Fishing||0)>0)) return `Weapon type cannot be used by a ${cls.name}.`;
  if(item.classs===4&&item.subclass===4&&cls.armour===4&&build.level<40)return 'Plate armour requires level 40.';
  if(item.classs===4&&item.subclass===3&&cls.armour===3&&build.level<40)return 'Mail armour requires level 40.';
  if(item.classs===4){
    const maxArmour=build.level<40&&cls.armour>=3?cls.armour-1:cls.armour;
    const shield=item.subclass===6&&['warrior','paladin','shaman'].includes(cls.id);
    const relic=item.slot===28&&item.subclass===cls.relicSubclass;
    if(!(item.subclass===0||(item.subclass>=1&&item.subclass<=maxArmour)||shield||relic))return `Armour type cannot be used by a ${cls.name}.`;
  }
  if (item.classs === 2 && item.subclass === 6 && build.level < 20) return 'Polearms require level 20.';
  if (item.classs === 4 && item.subclass === 4 && build.level < 40) return 'Plate armour requires level 40.';
  if (slot === 'offhand' && item.classs === 2 && (!cls.dualWieldLevel||build.level<cls.dualWieldLevel)) return cls.dualWieldLevel?`Dual wield requires level ${cls.dualWieldLevel}.`:'This class cannot dual wield.';
  if(slot==='ranged' && (cls.relicSubclass!==null ? item.slot!==28||item.subclass!==cls.relicSubclass : item.slot===28))return 'This ranged slot type cannot be used by this class.';
  if (slot === 'offhand' && build.gear.mainhand?.twoHanded) return 'Clear the two-handed main hand first.';
  return null;
}

export function detailRestriction(item, detail, build, slot) {
  const preliminary = listingRestriction(item, build, slot);
  if (preliminary) return preliminary;
  if (!detail || detail.id !== item.id || !Number.isInteger(detail.classMask) || !Number.isInteger(detail.raceMask)) return 'Source equipment restrictions could not be verified.';
  if (detail.classMask !== -1 && !(detail.classMask & classDefinition(build.classId).mask)) return 'This item is restricted to another class.';
  const race = RACES[build.race];
  if (!race) return 'Select a supported race to verify equipment restrictions.';
  if (detail.raceMask !== -1 && !(detail.raceMask & race)) return 'This item is restricted to another race.';
  if (detail.requiredLevel > build.level) return `Requires level ${detail.requiredLevel}.`;
  if (!SLOT_TYPES[slot]?.includes(detail.slot)) return 'The source item detail specifies a different equipment slot.';
  const unmet=detail.requirements.filter(requirement=>{const skill=requirement.match(/^Requires ([A-Za-z ]+) \((\d+)\)$/);return !skill||(build.skills?.[skill[1]]||0)<Number(skill[2]);});
  if(unmet.length)return `Additional requirement: ${unmet.join('; ')}.`;
  if (detail.unique && Object.entries(build.gear).some(([other, equipped]) => other !== slot && equipped.id === item.id)) return 'This unique item is already equipped.';
  return null;
}

export function filterItems(items, {build,slot,search='',quality=''}) {
  const query = search.trim().toLowerCase();
  const match = query.match(/^https:\/\/octowow\.st\/db\/\?item=(\d+)$/);
  const term = match ? match[1] : query;
  return items.filter(item => !listingRestriction(item,build,slot) &&
    (quality === '' || item.quality === Number(quality)) &&
    (!term || String(item.id) === term || item.name.toLowerCase().includes(term)))
    .sort((a,b) => (b.level || 0)-(a.level || 0) || a.name.localeCompare(b.name) || a.id-b.id);
}

export function equipmentTotals(gear) {
  const totals = {};
  for (const item of Object.values(gear)) for (const [stat,value] of Object.entries(item.attributes || {})) {
    if (Number.isFinite(value)) totals[stat] = (totals[stat] || 0)+value;
  }
  return totals;
}

// All strings are rendered as text, never inserted as source HTML or executed.
export function detailFromDocument(doc, id) {
  const tooltip = doc.getElementById(`tooltip${id}-generic`);
  const name = tooltip?.querySelector('b');
  if (!name || !doc.querySelector('.infobox')) throw new Error('The database did not return an item detail page.');
  const facts = doc.querySelector('.infobox').textContent;
  const mask = key => {
    const match = facts.match(new RegExp(`${key} Mask:\\s*(-?\\d+)`));
    if (!match) throw new Error(`The source omits the ${key.toLowerCase()} restriction mask.`);
    return Number(match[1]);
  };
  const copy = tooltip.cloneNode(true);
  for (const br of copy.querySelectorAll('br')) br.replaceWith(doc.createTextNode('\n'));
  for (const table of copy.querySelectorAll('table,div')) table.prepend(doc.createTextNode('\n'));
  for (const td of copy.querySelectorAll('td,th')) td.append(doc.createTextNode('\n'));
  const text = copy.textContent.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
  const primary = copy.querySelector('b').closest('td').textContent;
  const inventory = [...copy.querySelectorAll('td')].map(td=>td.textContent.trim()).find(value => /^(Head|Neck|Shoulder|Back|Chest|Robe|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|One-hand|Two-hand|Main Hand|Off Hand|Held In Off-hand|Ranged|Thrown|Relic|Shirt|Tabard|Projectile)$/i.test(value));
  const types = {'shirt':4,'tabard':19,'projectile':24,'head':1,'neck':2,'shoulder':3,'back':16,'chest':5,'robe':20,'wrist':9,'hands':10,'waist':6,'legs':7,'feet':8,'finger':11,'trinket':12,'one-hand':13,'two-hand':17,'main hand':21,'off hand':22,'held in off-hand':23,'ranged':26,'thrown':25,'relic':28};
  let slot = types[inventory?.toLowerCase()];
  // Shields use the Off Hand label as well as an explicit Shield armour type.
  if (slot === 22 && [...tooltip.querySelectorAll('th')].some(th=>th.textContent.trim()==='Shield')) slot=14;
  if(!slot&&/\b\d+ Slot Bag\b/.test(primary))slot=18;
  if (!slot) throw new Error('The source equipment slot could not be verified.');
  const attributes = {};
  for (const match of primary.matchAll(/(?:^|\n)\s*\+(\d+) (Strength|Agility|Stamina|Intellect|Spirit|[A-Za-z]+ Resistance)\b/g)) attributes[match[2]] = Number(match[1]);
  const armor = primary.match(/(?:^|\n)\s*(\d+) Armor\b/); if (armor) attributes.Armour=Number(armor[1]);
  const requirements = text.split('\n').map(line=>line.trim()).filter(line=>/^Requires\b/.test(line) && !/^Requires Level \d+$/.test(line));
  return {...(/Adds ([0-9.]+) damage per second/.test(primary)?{ammunitionDps:Number(primary.match(/Adds ([0-9.]+) damage per second/)[1])}:{}),id, name:name.textContent.trim(),classMask:mask('Class'),raceMask:mask('Race'),slot,
    requiredLevel:Number(primary.match(/Requires Level (\d+)/)?.[1] || 0),requirements,unique:/\bUnique(?:-Equipped)?\b/.test(primary),attributes,
    // Only the item's own text before set bonuses is used for the picker summary.
    effects:[...new Set([...tooltip.querySelectorAll('span')].map(span=>span.textContent.trim()).filter(text=>/^(Equip:|Use:|Chance on hit:)/.test(text)))],
    tooltipText:text,summary:primary.trim(),source:`https://octowow.st/db/?item=${id}`};
}
