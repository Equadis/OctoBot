// Editable planning priorities, not a claim of validated optimal combat behaviour.
const row=(ability,conditions=[])=>({ability,conditions});
const condition=(metric,operator,value,aura='')=>({metric,operator,value,aura});
const preset=(id,name,abilities)=>({id,name,description:'',rows:abilities.map(a=>typeof a==='string'?row(a):a)});
const profile=(abilities,resources,presets)=>({abilities,resources,presets:[...presets,preset('custom','New Custom Rotation',[])]});
const upkeep=(aura,ability=aura,max=2)=>row(ability,[condition('comboPoints','>=',1),condition('comboPoints','<=',max),condition('auraDuration','<',1,aura)]);
function roguePriority(builder,{rupture=false,expose=false,envenom=true,ar=false,spam=false}={}){
 const rows=[];
 if(ar)rows.push(row('Adrenaline Rush',[condition('energy','<=',30)]));
 if(envenom)rows.push(upkeep('Envenom'));
 rows.push(upkeep('Slice and Dice'));
 if(envenom)rows.push(row('Envenom',[condition('comboPoints','>=',2),condition('auraDuration','<',1,'Envenom')]));
 rows.push(row('Slice and Dice',[condition('comboPoints','>=',2),condition('auraDuration','<',1,'Slice and Dice')]));
 if(expose)rows.push(row('Expose Armor',[condition('comboPoints','>=',rupture?5:4),condition('auraDuration','<',1,'Expose Armor')]));
 if(rupture)rows.push(row('Rupture',[condition('comboPoints','>=',4),condition('auraDuration','<',9,'Rupture')]));
 rows.push(row('Eviscerate',[condition('comboPoints','>=',spam?1:5)]),row(builder));return rows;
}
const ROGUE_PRESETS=[];
for(const expose of [false,true])for(const rupture of [true,false])ROGUE_PRESETS.push({id:`assassination-noxious${expose?'-expose':''}${rupture?'-rupture':''}`,name:`Assassination | Noxious Assault${expose?' Expose Armour':''} (${rupture?'Rupture':'No Rupture'})`,description:'Noxious Assault builder; Envenom and Slice and Dice upkeep, then finishers.',rows:roguePriority('Noxious Assault',{rupture,expose})});
ROGUE_PRESETS.push({id:'combat-spam',name:'Combat | 1Cp Eviscerate Spam',description:'Sinister Strike builder, 1 CP buff upkeep and Eviscerate.',rows:roguePriority('Sinister Strike',{spam:true})});
for(const builder of ['Sinister Strike','Backstab'])for(const ar of [true,false])for(const rupture of [true,false])ROGUE_PRESETS.push({id:`combat-${builder==='Backstab'?'backstab':'sinister'}-${ar?'ar':'envenom'}${rupture?'-rupture':''}`,name:`Combat | ${builder} ${ar?'AR':'Envenom'} (${rupture?'Rupture':'No Rupture'})`,description:`${builder} builder with Slice and Dice upkeep${ar?', Adrenaline Rush at low energy':', Envenom upkeep'}.`,rows:roguePriority(builder,{rupture,ar,envenom:!ar})});
for(const expose of [true,false])ROGUE_PRESETS.push({id:`subtlety-hemorrhage${expose?'-expose':''}`,name:`Subtlety | Hemorrhage (${expose?'Expose Armour':'No Expose Armour'})`,description:'Garrote opener, Slice and Dice and Rupture upkeep, Hemorrhage builder.',rows:[row('Garrote',[condition('combatTime','<=',0)]),...(expose?[row('Expose Armor',[condition('comboPoints','>=',5),condition('auraDuration','<',1,'Expose Armor')])]:[]),upkeep('Slice and Dice','Slice and Dice',5),row('Rupture',[condition('comboPoints','>=',5),condition('auraDuration','<',1,'Rupture')]),row('Hemorrhage')]});
export const CLASS_ROTATIONS=Object.freeze({
 rogue:profile(['Sinister Strike','Backstab','Hemorrhage','Noxious Assault','Garrote','Rupture','Slice and Dice','Eviscerate','Envenom','Expose Armor','Adrenaline Rush','Cold Blood','Blade Flurry','Vanish','Preparation','Mark for Death','Shadow of Death'],['energy','comboPoints'],ROGUE_PRESETS),
 paladin:profile(['Holy Strike','Crusader Strike','Seal of Command','Seal of Righteousness','Judgement','Consecration','Exorcism','Hammer of Wrath','Holy Shock','Holy Shield','Holy Light','Flash of Light'],['mana','manaPercent'],[
  preset('retribution','Retribution',['Seal of Command','Holy Strike','Crusader Strike','Judgement','Consecration']),preset('holy-shock','Holy | Holy Shock',['Holy Shock','Judgement','Consecration']),preset('protection','Protection',['Holy Shield','Consecration','Judgement','Holy Strike'])]),
 druid:profile(['Wrath','Starfire','Moonfire','Insect Swarm','Hurricane','Shred','Claw','Rake','Rip','Ferocious Bite','Tiger’s Fury','Maul','Swipe','Demoralizing Roar','Faerie Fire','Rejuvenation','Regrowth','Healing Touch','Swiftmend'],['mana','manaPercent','energy','comboPoints','rage'],[
  preset('balance','Balance',['Moonfire','Insect Swarm','Starfire']),preset('feral-cat','Feral | Cat',[row('Rip',[condition('comboPoints','>=',5)]),'Shred']),preset('feral-bear','Feral | Bear',['Maul','Swipe'])]),
 shaman:profile(['Lightning Bolt','Chain Lightning','Earth Shock','Flame Shock','Frost Shock','Stormstrike','Lightning Shield','Searing Totem','Magma Totem','Fire Nova Totem','Elemental Mastery','Nature’s Swiftness','Healing Wave','Lesser Healing Wave','Chain Heal'],['mana','manaPercent'],[
  preset('elemental','Elemental',['Elemental Mastery','Chain Lightning','Lightning Bolt']),preset('enhancement','Enhancement',['Stormstrike','Flame Shock','Earth Shock']),preset('restoration-damage','Restoration | Damage',['Flame Shock','Lightning Bolt'])]),
 hunter:profile(['Aimed Shot','Multi-Shot','Arcane Shot','Serpent Sting','Raptor Strike','Mongoose Bite','Counterattack','Rapid Fire','Bestial Wrath','Trueshot Aura','Hunter’s Mark','Intimidation','Scatter Shot','Volley','Mend Pet'],['mana','manaPercent','petFocus'],[
  preset('beast-mastery','Beast Mastery',['Bestial Wrath','Aimed Shot','Multi-Shot']),preset('marksmanship','Marksmanship',['Rapid Fire','Aimed Shot','Multi-Shot']),preset('survival','Survival',['Serpent Sting','Aimed Shot','Multi-Shot'])]),
 mage:profile(['Frostbolt','Fireball','Scorch','Fire Blast','Pyroblast','Arcane Missiles','Arcane Explosion','Blizzard','Flamestrike','Arcane Power','Presence of Mind','Combustion','Evocation','Cold Snap'],['mana','manaPercent'],[
  preset('arcane','Arcane',['Arcane Power','Arcane Missiles']),preset('fire','Fire',['Combustion','Scorch','Fireball']),preset('frost','Frost',['Frostbolt'])]),
 warlock:profile(['Shadow Bolt','Corruption','Curse of Agony','Curse of Doom','Immolate','Conflagrate','Searing Pain','Soul Fire','Drain Soul','Drain Life','Life Tap','Shadowburn','Death Coil','Drain Mana'],['mana','manaPercent','soulShards'],[
  preset('affliction','Affliction',['Curse of Agony','Corruption','Shadow Bolt']),preset('demonology','Demonology',['Corruption','Shadow Bolt']),preset('destruction','Destruction',['Immolate','Conflagrate','Shadow Bolt'])]),
 priest:profile(['Mind Blast','Mind Flay','Shadow Word: Pain','Smite','Holy Fire','Devouring Plague','Vampiric Embrace','Power Infusion','Inner Focus','Shadowform','Power Word: Shield','Flash Heal','Heal','Greater Heal','Renew'],['mana','manaPercent'],[
  preset('discipline','Discipline',['Power Infusion','Holy Fire','Smite']),preset('holy','Holy',['Holy Fire','Smite']),preset('shadow','Shadow',['Shadow Word: Pain','Mind Blast','Mind Flay'])]),
});
