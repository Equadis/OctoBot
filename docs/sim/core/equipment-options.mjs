// Public display/reference data, independently represented for the OctoBot UI.
// These enchant choices and patch tags are not validated combat modifiers.
export const EQUIPMENT_REFERENCE=Object.freeze({url:'https://www.combatgum.app/rogue',retrievedAt:'2026-11-11'});
export const NEW_ITEM_IDS=new Set([33053, 33056, 33059, 33062, 33067, 33074, 33078, 33081, 33138, 33139, 33149, 33153, 33154, 33156, 33157, 33188, 33209, 33225, 33241, 33242, 33247, 33248, 33249, 33253, 33269, 33271, 33273, 33275, 33276, 33277, 33279, 33284, 33288, 33293, 33301, 33304, 33306, 33308, 33312, 33314, 33315, 33326, 33330, 33331, 33345, 33386, 33387, 33388, 33389, 33390, 33391, 33662, 33668, 33670, 33671, 33673, 33849, 33850, 33851, 33852, 33853, 33855, 33858, 33886, 33887, 33888, 33889, 33890, 33892, 33893, 33907, 33908, 33909, 33910, 33911, 33913, 33914, 42183, 42184, 42193, 42195, 61533]);
export const ENCHANTS=Object.freeze([
  {
    "id": "crusader_mh",
    "name": "Crusader (MH)",
    "slot": "mainhand"
  },
  {
    "id": "enchant_mh_5wd",
    "name": "+5 Weapon Damage (MH)",
    "slot": "mainhand"
  },
  {
    "id": "enchant_mh_agi",
    "name": "+15 Agility (MH)",
    "slot": "mainhand"
  },
  {
    "id": "enchant_mh_str",
    "name": "+15 Strength (MH)",
    "slot": "mainhand"
  },
  {
    "id": "enchant_mh_sp",
    "name": "Spell Power (MH) (+30 SP)",
    "slot": "mainhand"
  },
  {
    "id": "crusader_oh",
    "name": "Crusader (OH)",
    "slot": "offhand"
  },
  {
    "id": "lifestealing_mh",
    "name": "Lifestealing (MH)",
    "slot": "mainhand"
  },
  {
    "id": "fiery_weapon_mh",
    "name": "Fiery Weapon (MH)",
    "slot": "mainhand"
  },
  {
    "id": "fiery_blaze_mh",
    "name": "Fiery Blaze (MH)",
    "slot": "mainhand"
  },
  {
    "id": "elemental_slayer_mh",
    "name": "Elemental Slayer (MH)",
    "slot": "mainhand"
  },
  {
    "id": "enchant_oh_5wd",
    "name": "+5 Weapon Damage (OH)",
    "slot": "offhand"
  },
  {
    "id": "elemental_slayer_oh",
    "name": "Elemental Slayer (OH)",
    "slot": "offhand"
  },
  {
    "id": "enchant_oh_agi",
    "name": "+15 Agility (OH)",
    "slot": "offhand"
  },
  {
    "id": "lifestealing_oh",
    "name": "Lifestealing (OH)",
    "slot": "offhand"
  },
  {
    "id": "fiery_weapon_oh",
    "name": "Fiery Weapon (OH)",
    "slot": "offhand"
  },
  {
    "id": "fiery_blaze_oh",
    "name": "Fiery Blaze (OH)",
    "slot": "offhand"
  },
  {
    "id": "enchant_oh_str",
    "name": "+15 Strength (OH)",
    "slot": "offhand"
  },
  {
    "id": "enchant_oh_sp",
    "name": "Spell Power (OH) (+30 SP)",
    "slot": "offhand"
  },
  {
    "id": "enchant_head_dodge",
    "name": "Dodge (+2% Dodge)",
    "slot": "head"
  },
  {
    "id": "enchant_head_ap",
    "name": "Death's Embrace (+28 AP, +1% Dodge)",
    "slot": "head",
    "classes": [
      "rogue"
    ]
  },
  {
    "id": "enchant_head_haste",
    "name": "Arcanum of Rapidity (+1% Haste)",
    "slot": "head"
  },
  {
    "id": "enchant_head_agi",
    "name": "Lesser Arcanum of Voracity (+8 Agi)",
    "slot": "head"
  },
  {
    "id": "enchant_head_sp",
    "name": "Arcanum of Focus (+12 SP)",
    "slot": "head"
  },
  {
    "id": "enchant_legs_dodge",
    "name": "Dodge (+2% Dodge)",
    "slot": "legs"
  },
  {
    "id": "enchant_legs_ap",
    "name": "Death's Embrace (+28 AP, +1% Dodge)",
    "slot": "legs",
    "classes": [
      "rogue"
    ]
  },
  {
    "id": "enchant_legs_haste",
    "name": "Arcanum of Rapidity (+1% Haste)",
    "slot": "legs"
  },
  {
    "id": "enchant_legs_agi",
    "name": "Lesser Arcanum of Voracity (+8 Agi)",
    "slot": "legs"
  },
  {
    "id": "enchant_legs_sp",
    "name": "Arcanum of Focus (+12 SP)",
    "slot": "legs"
  },
  {
    "id": "enchant_shoulder_naxx",
    "name": "Might of the Scourge (+26 AP, +1% Crit)",
    "slot": "shoulder"
  },
  {
    "id": "enchant_shoulder_ap",
    "name": "Zandalar Signet of Might (+30 AP)",
    "slot": "shoulder"
  },
  {
    "id": "enchant_shoulder_haste",
    "name": "Sigil of Quickness (+2% Haste)",
    "slot": "shoulder"
  },
  {
    "id": "enchant_shoulder_arpen",
    "name": "Sigil of Penetration (+40 ArPen)",
    "slot": "shoulder"
  },
  {
    "id": "enchant_shoulder_sp",
    "name": "Power of the Scourge (+15 SP, +1% Spell Crit)",
    "slot": "shoulder"
  },
  {
    "id": "enchant_back_dodge",
    "name": "Dodge (+1% Dodge)",
    "slot": "back"
  },
  {
    "id": "enchant_back_agi",
    "name": "Enchant Cloak - Lesser Agility (+3 Agi)",
    "slot": "back"
  },
  {
    "id": "enchant_back_agi7",
    "name": "Enchant Cloak - Agility (+7 Agi)",
    "slot": "back"
  },
  {
    "id": "enchant_chest_defense",
    "name": "Defense (+5 Defense)",
    "slot": "chest"
  },
  {
    "id": "enchant_chest_greater_stats",
    "name": "Enchant Chest - Greater Stats (+4 All)",
    "slot": "chest"
  },
  {
    "id": "enchant_chest_stats",
    "name": "Enchant Chest - Stats (+3 All)",
    "slot": "chest"
  },
  {
    "id": "enchant_wrist_str",
    "name": "Enchant Bracer - Superior Strength (+9 Str)",
    "slot": "wrist"
  },
  {
    "id": "enchant_wrist_agi",
    "name": "Enchant Bracer - Greater Agility (+7 Agi)",
    "slot": "wrist"
  },
  {
    "id": "enchant_wrist_sp",
    "name": "Enchant Bracer - Spell Power (+12 SP)",
    "slot": "wrist"
  },
  {
    "id": "enchant_hands_agi15",
    "name": "Enchant Gloves - Superior Agility (+15 Agi)",
    "slot": "hands"
  },
  {
    "id": "enchant_hands_str",
    "name": "Enchant Gloves - Major Strength (+9 Str)",
    "slot": "hands"
  },
  {
    "id": "enchant_hands_haste",
    "name": "Enchant Gloves - Minor Haste (+1% Haste)",
    "slot": "hands"
  },
  {
    "id": "enchant_hands_agi7",
    "name": "Enchant Gloves - Greater Agility (+7 Agi)",
    "slot": "hands"
  },
  {
    "id": "enchant_hands_shadow_power",
    "name": "Enchant Gloves - Shadow Power (+20 SP)",
    "slot": "hands"
  },
  {
    "id": "enchant_hands_fire_power",
    "name": "Enchant Gloves - Fire Power (+20 SP)",
    "slot": "hands"
  },
  {
    "id": "enchant_hands_frost_power",
    "name": "Enchant Gloves - Frost Power (+20 SP)",
    "slot": "hands"
  },
  {
    "id": "enchant_hands_nature_power",
    "name": "Enchant Gloves - Nature Power (+20 SP)",
    "slot": "hands"
  },
  {
    "id": "enchant_feet_defense",
    "name": "Defense (+5 Defense)",
    "slot": "feet"
  },
  {
    "id": "enchant_feet_agi",
    "name": "Enchant Boots - Greater Agility (+7 Agi)",
    "slot": "feet"
  },
  {
    "id": "enchant_waist_defense",
    "name": "Defense (+5 Defense)",
    "slot": "waist"
  },
  {
    "id": "enchant_waist_agi",
    "name": "Mithril Belt Buckle (+6 Agi)",
    "slot": "waist"
  },
  {
    "id": "enchant_waist_str",
    "name": "Obsidian Belt Buckle (+10 Str)",
    "slot": "waist"
  },
  {
    "id": "enchant_waist_arpen",
    "name": "Iron Belt Buckle (+25 ArPen)",
    "slot": "waist"
  },
  {
    "id": "enchant_neck_agi",
    "name": "Brilliant Opal Gemstone (+6 Agi)",
    "slot": "neck"
  },
  {
    "id": "enchant_neck_str",
    "name": "Azerothian Ruby Gemstone (+6 Str)",
    "slot": "neck"
  },
  {
    "id": "enchant_neck_stats",
    "name": "Stunning Imperial Gemstone (+3 All Stats)",
    "slot": "neck"
  },
  {
    "id": "enchant_ring1_agi",
    "name": "Brilliant Opal Gemstone (+6 Agi)",
    "slot": "ring1"
  },
  {
    "id": "enchant_ring1_str",
    "name": "Azerothian Ruby Gemstone (+6 Str)",
    "slot": "ring1"
  },
  {
    "id": "enchant_ring1_stats",
    "name": "Stunning Imperial Gemstone (+3 All Stats)",
    "slot": "ring1"
  },
  {
    "id": "enchant_ring2_agi",
    "name": "Brilliant Opal Gemstone (+6 Agi)",
    "slot": "ring2"
  },
  {
    "id": "enchant_ring2_str",
    "name": "Azerothian Ruby Gemstone (+6 Str)",
    "slot": "ring2"
  },
  {
    "id": "enchant_ring2_stats",
    "name": "Stunning Imperial Gemstone (+3 All Stats)",
    "slot": "ring2"
  }
].map(enchant=>Object.freeze(enchant)));
export function enchantsForSlot(slot,classId='warrior',item=null){return ENCHANTS.filter(enchant=>enchant.slot===slot && (!enchant.classes || enchant.classes.includes(classId)) && (!['mainhand','offhand'].includes(slot) || !item || item.classs===2));}
export function validEnchant(id,slot,classId='warrior'){return enchantsForSlot(slot,classId).some(enchant=>enchant.id===id);}
export const SORT_OPTIONS=Object.freeze([['new','NEW ITEMS'],['level','Item Level'],['name','Name'],['dps','Weapon DPS'],['speed','Weapon Speed'],['armor','Armour'],['Strength','Strength'],['Agility','Agility'],['Stamina','Stamina'],['Intellect','Intellect'],['Spirit','Spirit'],['attackPower','Attack Power'],['hitRating','Hit %'],['critRating','Crit %'],['hastePercent','Haste %'],['armorPenetration','Armor Pen'],['spellDamage','Spell Damage'],['spellCritRating','Spell Crit %'],['hasProc','Has Proc'],['weaponSkill','Weapon Skill'],['spellstrike','Spellstrike']]);
export function sortEquipment(items,sort='new',direction='desc',details={},references={}){
 const sign=direction==='asc'?1:-1;
 const value=item=>sort==='new'?Number(NEW_ITEM_IDS.has(item.id)):sort==='level'?item.level:sort==='name'?item.name:sort==='armor'?item.armor:sort==='speed'?item.speed:sort==='dps'?item.dps:details[item.id]?.attributes?.[sort]??references[item.id]?.attributes?.[sort]??details[item.id]?.metrics?.[sort]??references[item.id]?.metrics?.[sort];
 return [...items].sort((a,b)=>{const av=value(a),bv=value(b);if(av===undefined || bv===undefined){if(av===undefined && bv!==undefined)return 1;if(bv===undefined && av!==undefined)return -1;}const comparison=typeof av==='string'?av.localeCompare(bv):(av??0)-(bv??0);return sign*comparison || (sort==='new'?sign*((a.level||0)-(b.level||0)):0) || a.name.localeCompare(b.name) || a.id-b.id;});
}
