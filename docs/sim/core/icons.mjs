// Icon names (Wowhead / Blizzard icon set) for gameplay entries shown in lists and dropdowns.
// Consumables and food take their icon from the item data through their shared buff id; spells and auras are listed here.
import {CONSUMABLES} from './consumables.mjs?v=20261130-ui2';

export const BUFF_ICONS=Object.freeze({
 'battle-shout':'ability_warrior_battleshout',might:'spell_holy_fistofjustice',kings:'spell_magic_magearmor',wild:'spell_nature_regeneration',
 pack:'spell_nature_unrelentingstorm',earth:'spell_nature_earthbindtotem',air:'spell_nature_invisibilitytotem',trueshot:'ability_trueshot',
 windfury:'spell_nature_windfury',flametongue:'spell_nature_guardianward',tricks:'ability_rogue_tricksofthetrade',hemorrhage:'spell_shadow_lifedrain',
 'mark-death':'ability_hunter_markedfordeath',expose:'ability_warrior_riposte',sunder:'ability_warrior_sunder',recklessness:'spell_shadow_unholystrength',
 faerie:'spell_nature_faeriefire',eskhandar:'inv_misc_monsterclaw_04',annihilator:'inv_axe_12',shartateth:'inv_demonaxe',ripper:'inv_sword_31',nightfall:'inv_axe_12',
 'skill-book':'inv_misc_book_09','juju-might':'inv_misc_monsterscales_07','juju-power':'inv_misc_monsterscales_11','wizard-oil-mh':'inv_potion_105','wizard-oil-oh':'inv_potion_105',merlot:'inv_drink_waterskin_05',
});
export const OPTION_ICONS=Object.freeze({
 stance:{Battle:'ability_warrior_offensivestance',Berserker:'ability_racial_avatar',Defensive:'ability_warrior_defensivestance'},
 seal:{'Seal of Command':'ability_warrior_innerrage','Seal of Righteousness':'ability_thunderbolt','Seal of the Crusader':'spell_holy_holysmite','Seal of Wisdom':'spell_holy_righteousnessaura','Seal of Light':'spell_holy_healingaura'},
 aura:{'Retribution Aura':'spell_holy_auraoflight','Sanctity Aura':'spell_holy_mindvision','Devotion Aura':'spell_holy_devotionaura'},
 form:{Moonkin:'spell_nature_forceofnature',Cat:'ability_druid_catform',Bear:'ability_racial_bearform',Shadowform:'spell_shadow_shadowform'},
 mhImbue:{'Windfury Weapon':'spell_nature_cyclone','Flametongue Weapon':'spell_fire_flametounge','Rockbiter Weapon':'spell_nature_rockbiter','Frostbrand Weapon':'spell_frost_frostbrand'},
 aspect:{'Aspect of the Hawk':'spell_nature_ravenform','Aspect of the Monkey':'ability_hunter_aspectofthemonkey','Aspect of the Wild':'spell_nature_protectionformnature','Aspect of the Wolf':'ability_mount_whitedirewolf'},
 pet:{Cat:'ability_hunter_pet_cat',Wolf:'ability_hunter_pet_wolf','Wind Serpent':'ability_hunter_pet_windserpent',Raptor:'ability_hunter_pet_raptor',Boar:'ability_hunter_pet_boar',Bear:'ability_hunter_pet_bear',
  Imp:'spell_shadow_summonimp',Voidwalker:'spell_shadow_summonvoidwalker',Succubus:'spell_shadow_summonsuccubus',Felhunter:'spell_shadow_summonfelhunter',Felguard:'spell_shadow_summonfelguard'},
 armour:{'Mage Armor':'spell_magearmor','Ice Armor':'spell_frost_frostarmor02','Frost Armor':'spell_frost_frostarmor'},
 curse:{'Curse of Agony':'spell_shadow_curseofsargeras','Curse of the Elements':'spell_shadow_chilltouch','Curse of Shadow':'spell_shadow_curseofachimonde','Curse of Recklessness':'spell_shadow_unholystrength'},
 useVampiricEmbrace:{On:'spell_shadow_unsummonbuilding'},
});
export const PROFESSION_ICONS=Object.freeze({
 Alchemy:'trade_alchemy',Blacksmithing:'trade_blacksmithing',Enchanting:'trade_engraving',Engineering:'trade_engineering',Herbalism:'trade_herbalism',
 Leatherworking:'trade_leatherworking',Mining:'trade_mining',Skinning:'inv_misc_pelt_wolf_01',Tailoring:'trade_tailoring',Jewelcrafting:'inv_misc_gem_01',
 Cooking:'inv_misc_food_15','First Aid':'spell_holy_sealofsalvation',Fishing:'trade_fishing',Survival:'ability_hunter_survivalinstincts',Gardening:'inv_misc_flower_02',
});
const byBuff=new Map(CONSUMABLES.filter(item=>item.buffId&&/^[a-z0-9_]+$/i.test(item.icon||'')).map(item=>[item.buffId,item.icon]));
const byName=new Map(CONSUMABLES.filter(item=>/^[a-z0-9_]+$/i.test(item.icon||'')).map(item=>[item.name.replace(/[’]/g,"'"),item.icon]));
const POISON_KEYS=new Set(['mhPoison','ohPoison']);
// A buff or debuff entry: its own spell icon, the icon of the consumable it represents, or the item with the same name.
export function buffIcon(option){const {id,name=''}=typeof option==='string'?{id:option}:option;return BUFF_ICONS[id]||byBuff.get(id)||byName.get(name.replace(/[’]/g,"'").replace(/\s*\((?:MH|OH)\)$/,''))||null;}
export function consumableIcon(item){return /^[a-z0-9_]+$/i.test(item?.icon||'')?item.icon:null;}
export function optionIcon(key,value){
 if(POISON_KEYS.has(key))return value==='None'?null:byName.get(value)||null;
 return OPTION_ICONS[key]?.[value]||null;
}
export const optionHasIcons=key=>POISON_KEYS.has(key)||Boolean(OPTION_ICONS[key]);
export function professionIcon(name){return PROFESSION_ICONS[name]||null;}
