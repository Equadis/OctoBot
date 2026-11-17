// Deterministic scoped item/set modifiers. A scope is an explicit ability,
// family, pet or target label, never permission to modify the global sheet.
// Flat bonuses described as "up to" are power/coefficient contributions,
// not guaranteed damage. Proc frequency/uptime is never guessed.
const N='([0-9]+(?:\\.[0-9]+)?)';
const A="([A-Za-z][A-Za-z :'’,-]*?)";
const unit='(?:sec(?:ond)?s?\\.?|min(?:ute)?s?\\.?)';
const clean=s=>String(s||'').trim().replace(/\s+/g,' ').replace(/^Equip:\s*/i,'').replace(/\.$/,'');
const abilities=s=>s.replace(/^your /i,'').replace(/ (?:spell|ability)$/i,'').replace(/\s*,\s*and\s+/gi,',').replace(/\s+and\s+/gi,',').split(',').map(s=>s.trim()).filter(Boolean);
const mod=(scope,stat,amount,condition)=>({scope,stat,amount:Number(amount),...(condition?{condition}:{})});
const list=(scope,stat,n,condition)=>abilities(scope).map(a=>mod(a,stat,n,condition));
const found=modifiers=>({status:'scoped',stats:{},modifiers});
export function scopedEquipmentEffect(raw){
 const t=clean(raw);let m;
 const match=p=>t.match(new RegExp('^'+p+'$','i'));

 // Exact compound descriptions and utility effects from the imported inventory.
 // Never split arbitrary sentences: every term must agree with the source.
 if((m=match('Improves spell critical strike chance by '+N+'% and increases Shadow damage dealt by damage over time effects by '+N+'%')))return {status:'scoped',stats:{spellCrit:+m[1]},modifiers:[mod('Shadow periodic damage','damagePct',m[2])]};
 if((m=match("Increases Holy Shock's chance to hit by "+N+"% and its damage by "+N+"%")))return found([mod('Holy Shock (damage)','hitPct',m[1]),mod('Holy Shock (damage)','damagePct',m[2])]);
 if((m=match("Increases your pet and enslaved demon's damage and health by "+N+"%")))return found([mod('Pet','damagePct',m[1],{pet:true}),mod('Pet','healthPct',m[1],{pet:true})]);
 if((m=match("Increases Attack Power by "+N+" for both you and your pet")))return {status:'scoped',stats:{ap:+m[1]},modifiers:[mod('Pet','attackPower',m[1],{pet:true})]};
 if((m=match("Increases the range of your Mend Pet spell by "+N+"% and the effect by "+N+"%. Also reduces the cost by "+N+"%")))return found([mod('Mend Pet','rangeIncreasePct',m[1]),mod('Mend Pet','healingPct',m[2]),mod('Mend Pet','manaCostReductionPct',m[3])]);
 if((m=match('Health or Mana gained from Drain Life and Drain Mana increased by '+N+'%')))return found([mod('Drain Life','healthReturnPct',m[1]),mod('Drain Mana','manaReturnPct',m[1])]);
 if((m=match('Mana cost of Shadow spells reduced by '+N+'%')))return found([mod('Shadow spells','manaCostReductionPct',m[1])]);
 if((m=match('Damage dealt by Thorns increased by '+N+' and duration increased by '+N+'%')))return found([mod('Thorns','flatDamage',m[1]),mod('Thorns','durationIncreasePct',m[2])]);
 if((m=match('Improves the threat reduction of Feint by '+N+'%')))return found([mod('Feint','threatRemovedPct',m[1])]);
 if((m=match('The radius of your totems that affect friendly targets is increased to '+N+' yd')))return found([mod('Friendly totems','radiusOverrideYards',m[1])]);
 if((m=match('Increases the amount healed by Chain Heal to targets beyond the first by '+N+'%')))return found([mod('Chain Heal (subsequent targets)','healingPct',m[1])]);
 if((m=match('Increases the radius of a Paladin\\x27s auras by '+N)))return found([mod('Paladin auras','radiusIncreaseYards',m[1])]);
 if((m=match('Increases the attack power granted by Battle Shout by '+N)))return found([mod('Battle Shout','attackPowerBonus',m[1])]);
 if((m=match('Increase the Slow effect and damage of Thunder Clap by '+N+'%')))return found([mod('Thunder Clap','slowEffectPct',m[1]),mod('Thunder Clap','damagePct',m[1])]);
 if((m=match('Increases the chain target damage multiplier of your Chain Lightning spell by '+N+'%')))return found([mod('Chain Lightning (subsequent targets)','chainDamageMultiplierPct',m[1])]);
 if((m=match("Increases the amount healed by your Judgement of Light by "+N)))return found([mod('Judgement of Light','flatHealing',m[1])]);
 if((m=match('Your Cleanse spell also heals the target for '+N)))return found([mod('Cleanse','flatHealing',m[1])]);
 if((m=match('Increases the mana gained from your Mana Spring totems by '+N+'%')))return found([mod('Mana Spring Totem','manaReturnPct',m[1])]);
 if((m=match('Your Lightning Shield spell also grants you '+N+' mana per 5 sec\\. while active')))return found([mod('Lightning Shield','mp5',m[1],{shield:'Lightning Shield'})]);
 if((m=match("Water Shield grants an additional "+N+" mana per 5 sec while active. In addition, mana restored when Water Shield is triggered by attacks is increased by "+N)))return found([mod('Water Shield','mp5',m[1],{shield:'Water Shield'}),mod('Water Shield','triggerMana',m[2],{shield:'Water Shield'})]);
 if((m=match('Increases the chance of triggering a Judgement of Light heal by '+N+'%')))return found([mod('Judgement of Light','triggerChancePct',m[1])]);
 if((m=match('Gives you a '+N+'% chance to avoid interruption caused by damage while casting '+A)))return found(list(m[2],'pushbackAvoidancePct',m[1]));
 if((m=match('Your Blizzard spell has a '+N+'% chance to be uninterruptible')))return found([mod('Blizzard','uninterruptibleChancePct',m[1])]);
 if((m=match('Reduces the cost of your Hamstring ability by '+N+' rage points')))return found([mod('Hamstring','rageCostReduction',m[1])]);
 if((m=match('Increases the Holy damage bonus of your Judgement of the Crusader by '+N)))return found([mod('Judgement of the Crusader','holyDamageBonus',m[1])]);
 if((m=match('Increases the melee attack power bonus of your Seal of the Crusader by '+N+' and the Holy damage increase of your Judgement of the Crusader by '+N)))return found([mod('Seal of the Crusader','attackPowerBonus',m[1]),mod('Judgement of the Crusader','holyDamageBonus',m[2])]);
 if((m=match('Increases the armor from your Devotion Aura by '+N)))return found([mod('Devotion Aura','armourBonus',m[1])]);
 if((m=match('Increases the number of charges of your Holy Shield by '+N)))return found([mod('Holy Shield','charges',m[1])]);
 if((m=match('Increases the speed of your Ghost Wolf ability by '+N+'%')))return found([mod('Ghost Wolf','movementSpeedPct',m[1])]);
 if((m=match('Increases the swim speed of your Aquatic Form by '+N+'%')))return found([mod('Aquatic Form','swimSpeedPct',m[1])]);
 if((m=match('Reduces the casting cost of all your Blessings by '+N)))return found([mod('Blessings','manaCostReduction',m[1])]);
 if((m=match('Your rogue and druid opening moves deal '+N+'% more damage')))return found([mod('Rogue and Druid opening moves','damagePct',m[1])]);
 if((m=match('Reduces the time between periodic ticks and the duration of (Rake and Rip|your class-specific bleed effects)(?: by)? '+N+'%')))return found(list(m[1],'tickIntervalReductionPct',m[2]).concat(list(m[1],'durationReductionPct',m[2])));
 if((m=match('Adds '+N+' (fire|Lightning) damage to your (?:melee attacks|weapon attack)')))return found([mod('Melee attacks',m[2].toLowerCase()==='fire'?'fireDamageOnHit':'lightningDamageOnHit',m[1])]);
 if((m=match('Increases damage done to Demons with either spells or physical attacks by '+N)))return found([mod('Damage against Demons','flatDamage',m[1],{target:'Demon'})]);
 if((m=match('Increases damage and healing done by magical spells and effects by up to '+N+' while moving')))return found([mod('Moving spells','damagePower',m[1],{moving:true}),mod('Moving healing','healingPower',m[1],{moving:true})]);
 if((m=match('Increases your movement speed by '+N+'% while in Bear, Cat, or Travel Form\\. Only active outdoors')))return found([mod('Movement','runSpeedPct',m[1],{forms:['Bear','Cat','Travel'],outdoors:true})]);
 if((m=match('Increases your effective stealth level by '+N)))return found([mod('Stealth','level',m[1])]);
 if((m=match('(?:Increased )?(Fishing|Skinning|Mining|Herbalism|Poisons) \\+'+N)))return found([mod('Skill: '+m[1],'skillBonus',m[2])]);
 if((m=match('Engineering skill increased by '+N)))return found([mod('Skill: Engineering','skillBonus',m[1])]);
 if((m=match('Increases the speed at which you cook by '+N+'%')))return found([mod('Cooking','speedPct',m[1])]);
 if(/^(?:Run speed increased slightly|Slightly increases your stealth detection|Allows underwater breathing|Immune to Disarm|Increases your effective stealth level|Increases your lockpicking skill slightly|Impress others with your fashion sense|Increases your stealth detection|Increases movement speed and life regeneration rate|Protects the wearer from being fully engulfed by Shadow Flame|Reduces damage from falling|While equipped, the wearer suffers less damage from falls|Minor increase to running and swimming speed|Bestows the wearer with the evil aura of a Twilight's Hammer cultist|Increases the chance to gather Black Lotus|Increases the chance to find Arcane Crystal)$/i.test(t))return {status:'utility',stats:{},note:'Effect known; no authoritative numerical magnitude in tooltip'};
 // Exact non-random combat event triggers are not static bonuses either.
 if(/^(?:Chance to |Gives your .* chance|When |On successful |On .* critical hits|After |Killing |Summoning |Casting |Gain up to .* each time|Summons tiny spiders|You automatically charge|Deals .* when you are|Deals .* every time|Causes .* creature that strikes|Deals .* anyone who strikes|Heals the rogue for .* when Vanish|Your .* (?:critical hits|criticals|ticks) (?:cause|place|have)|Your Greater Heals now|Your Healing Wave will now jump|Your finishing moves now refund|Each spell you cast can trigger)/i.test(t))return {status:'event',stats:{}};

 // These are event-dependent mechanics, even if the source uses Equip:.
 if(/^(?:Use:|Chance on hit:)|\b(?:chance (?:on|of (?!a critical hit)|when|after|whenever|to (?:trigger|grant|restore|summon|heal|deal|inflict|reflect|return|strike|become))|on (?:a |every )?(?:melee|ranged|spell) (?:hit|attack|critical)|when struck|whenever|after casting|critical hits (?:cause|trigger)|stacks up to|next (?:spell|attack|cast)|has a chance|have a chance|sometimes heals)\b/i.test(t))return {status:'event',stats:{}};
 if((m=match('(?:\\+'+N+' Attack Power|Attack Power increased by '+N+') when fighting (Undead|Beasts|Demons|Elementals|Dragonkin)(?:\\. It also allows the acquisition of Scourgestones on behalf of the Argent Dawn)?')))return found([mod('Target','attackPower',m[1]??m[2],{target:m[3].replace(/s$/,'')})]);
 if((m=match('\\+'+N+' Attack Power when fighting Undead and Demons(?:\\. It also allows the acquisition of Scourgestones on behalf of the Argent Dawn)?')))return found([mod('Target','attackPower',m[1],{target:'Undead or Demon'})]);
 if((m=match('\\+'+N+' All Resistances against players')))return found([mod('Target','allResistance',m[1],{target:'Player'})]);
 if((m=match('Increases (?:your )?damage against (undead|demons|beasts|dragonkin|elementals) by '+N+'%')))return found([mod('Target','damagePct',m[2],{target:m[1]})]);
 if((m=match('Increases damage done to (Undead|Demons|Undead and Demons) by magical spells and effects by up to '+N+'(?:\\. It also allows the acquisition of Scourgestones on behalf of the Argent Dawn)?')))return found([mod('Damage spells','damagePower',m[2],{target:m[1]})]);
 if((m=match(N+'% of damage dealt is returned as healing')))return found([mod('Damage dealt','leechPct',m[1])]);
 if((m=match('Allows '+N+'% of your Health regeneration to work while in combat')))return found([mod('Natural health regeneration','inCombatPct',m[1])]);
 if((m=match('Decreases your chance to parry an attack by '+N+'%')))return found([mod('Defence','parryPct',-Number(m[1]))]);
 if((m=match('Increases your chance to resist (Fear|Stun and Fear|Silence and Interrupt|immobilizing) effects by '+N+'%')))return found([mod(m[1],'resistPct',m[2])]);
 if((m=match('Increases (?:your chance to get a critical strike|the critical effect chance|the critical hit chance|your chance to critically strike|your chance of a critical hit|your chance to get a critical strike) (?:with|of) (?:your )?'+A+'(?: by)? '+N+'%'))||(m=match('Improves your chance to get a critical strike with '+A+' by '+N+'%')))return found(list(m[1],'critPct',m[2]));
 if((m=match('Improves your chance to hit with '+A+' by '+N+'%')))return found(list(m[1],'hitPct',m[2]));
 if((m=match('(?:Reduces|Decreases) (?:the )?cooldown (?:of|on) (?:your )?'+A+' by '+N+' (sec(?:ond)?s?|min(?:ute)?s?)')))return found(list(m[1],'cooldownReductionSeconds',Number(m[2])*(/^min/i.test(m[3])?60:1)));
 if((m=match('(?:Reduces|Decreases) the cooldown of (?:your )?'+A+' by '+N+'%')))return found(list(m[1],'cooldownReductionPct',m[2]));
 if((m=match('(?:Reduces|Decreases) the cast(?:ing)? time of (?:your )?'+A+' by '+N+' sec(?:ond)?s?')))return found(list(m[1],'castReductionSeconds',m[2]));
 if((m=match('-'+N+' sec(?:ond)?s? (?:to|on) the casting time of (?:your )?'+A)))return found(list(m[2],'castReductionSeconds',m[1]));
 if((m=match('(?:Increases|Improves|Increase) the duration of (?:your |all )?'+A+' by '+N+' sec(?:ond)?s?')))return found(list(m[1],'durationIncreaseSeconds',m[2]));
 if((m=match('(?:Increases|Improves|Increase) the duration of (?:your |all )?'+A+' by '+N+'%')))return found(list(m[1],'durationIncreasePct',m[2]));
 if((m=match('(?:Increases|Increase) the (range|radius) of (?:your )?'+A+' by '+N+' (?:yds?|yards?)')))return found(list(m[2],m[1].toLowerCase()+'IncreaseYards',m[3]));
 if((m=match('(?:Increases|Increase) the (range|radius) of (?:your )?'+A+' by '+N+'%')))return found(list(m[2],m[1].toLowerCase()+'IncreasePct',m[3]));
 if((m=match('(?:Reduces|Decreases|Decrease) the (mana|rage|energy|health) cost of (?:your |all )?'+A+' by '+N+'(%)?')))return found(list(m[2],m[1].toLowerCase()+'CostReduction'+(m[4]?'Pct':''),m[3]));
 if((m=match('(?:Reduces|Decreases) the cost of (?:your )?'+A+' by '+N+'%')))return found(list(m[1],'resourceCostReductionPct',m[2]));
 if((m=match(A+' (Rage|Energy|Mana) cost reduced by '+N)))return found(list(m[1],m[2].toLowerCase()+'CostReduction',m[3]));
 if((m=match('-'+N+' (rage|energy|mana) cost (?:to|for) (?:your )?'+A)))return found(list(m[3],m[2].toLowerCase()+'CostReduction',m[1]));
 if((m=match("Increases your pet's (maximum health|critical strike chance|armor|damage) by "+N+'%'))||(m=match('Increases damage dealt by your pet by '+N+'%'))){const kind=m[2]?({'maximum health':'healthPct','critical strike chance':'critPct',armor:'armourPct',damage:'damagePct'})[m[1].toLowerCase()]:'damagePct';return found([mod('Pet',kind,m[2]??m[1],{pet:true})]);}
 if((m=match('Increases (?:the )?damage (?:done |dealt |caused )?(?:by|of) (?:your )?'+A+' by (?:up to )?'+N+'%')))return found(list(m[1],'damagePct',m[2]));
 if((m=match(N+'% increased damage (?:on|to) your '+A)))return found(list(m[2],'damagePct',m[1]));
 if((m=match('Increases (?:the )?damage (?:done |dealt |caused )?(?:by|of) (?:your )?'+A+' by up to '+N)))return found(list(m[1],'damagePower',m[2]));
 if((m=match('Increases (?:the )?damage (?:done |dealt |caused )?(?:by|of) (?:your )?'+A+' by '+N)))return found(list(m[1],'flatDamage',m[2]));
 if((m=match('Increases healing done by (?:your )?'+A+' by up to '+N)))return found(list(m[1],'healingPower',m[2]));
 if((m=match('Increases the (?:amount of )?damage absorbed by (?:your )?'+A+' by '+N)))return found(list(m[1],'flatAbsorb',m[2]));
 if((m=match(N+'% increase to the total damage absorbed by '+A)))return found(list(m[2],'absorbPct',m[1]));
 if((m=match('(?:Reduces|Decreases) the threat generated by (?:your )?'+A+' by '+N+'%')))return found(list(m[1],'threatReductionPct',m[2]));
 if((m=match('Increases the threat generated by (?:your )?'+A+' by '+N+'%')))return found(list(m[1],'threatIncreasePct',m[2]));
 if((m=match('Increases your maximum (Energy|Rage) by '+N)))return found([mod('Resource capacity',m[1].toLowerCase()+'Capacity',m[2])]);
 if((m=match('Increases the chance to apply poisons to your target by '+N+'%')))return found([mod('Poison application','chancePct',m[1])]);
 if((m=match("Increases your pet's damage by "+N+"%, maximum health by "+N+"% and critical strike chance by "+N+"%")))return found([mod('Pet','damagePct',m[1],{pet:true}),mod('Pet','healthPct',m[2],{pet:true}),mod('Pet','critPct',m[3],{pet:true})]);
 if((m=match("Increases your pet's stamina by "+N+" and all spell resistances by "+N))||(m=match('Your pet gains '+N+' stamina and '+N+' spell resistance against all schools of magic')))return found([mod('Pet','stamina',m[1],{pet:true}),mod('Pet','allResistance',m[2],{pet:true})]);
 if((m=match("Increases the Ranged Attack Power bonus of your Aspect of the Hawk by "+N+"%")))return found([mod('Aspect of the Hawk','attackPowerBonusPct',m[1],{aspect:'Aspect of the Hawk'})]);
 return null;
}
export function combineScopedEquipment(entries,context={}){
 const result=new Map();
 for(const e of entries)for(const m of e.modifiers||[]){
  const c=m.condition||{};let active=true;
  if(c.pet)active=Boolean(context.classOptions?.pet&&context.classOptions.pet!=='None');
  if(c.aspect)active=active&&context.classOptions?.aspect===c.aspect;
  if(c.shield)active=active&&context.classOptions?.shield===c.shield;
  if(c.moving)active=active&&context.classOptions?.moving==='Yes';
  if(c.outdoors)active=active&&context.classOptions?.outdoors==='Yes';
  if(c.forms)active=active&&c.forms.includes(context.classOptions?.form);
  // Target-dependent effects require an explicit scenario. No default creature type.
  if(c.target){const target=String(context.classOptions?.targetCreature||context.targetCreature||'').toLowerCase();active=active&&Boolean(target)&&c.target.toLowerCase().split(/ or | and /).map(t=>t.replace(/s$/,'')).includes(target.replace(/s$/,''));}
  const key=JSON.stringify([m.scope.toLowerCase(),m.stat,m.condition||null,active]);
  const old=result.get(key)||{...m,amount:0,active,sources:[]};old.amount+=m.amount;old.sources.push(e.source||e.raw||e.effect);result.set(key,old);
 }
 return [...result.values()];
}
export function applyScopedEquipment(rows,scope,baseline={}){
 const tags=new Set((typeof scope==='string'?[scope]:[scope.name,...(scope.tags||[])]).filter(Boolean).map(s=>s.toLowerCase()));
 const mods={};for(const r of rows)if(r.active&&tags.has(r.scope.toLowerCase()))mods[r.stat]=(mods[r.stat]||0)+r.amount;
 const g=k=>mods[k]||0,calc=(k,fn)=>Number.isFinite(baseline[k])?fn(baseline[k]):null;
 const reduce=(n,flat,pct)=>Math.max(0,n-flat)*Math.max(0,1-pct/100);
 return {modifiers:mods,damage:calc('damage',n=>Math.max(0,n+g('flatDamage'))*(1+g('damagePct')/100)),healing:calc('healing',n=>Math.max(0,n+g('flatHealing'))*(1+g('healingPct')/100)),castSeconds:calc('castSeconds',n=>reduce(n,g('castReductionSeconds'),0)),cooldownSeconds:calc('cooldownSeconds',n=>reduce(n,g('cooldownReductionSeconds'),g('cooldownReductionPct'))),durationSeconds:calc('durationSeconds',n=>Math.max(0,n+g('durationIncreaseSeconds'))*(1+g('durationIncreasePct')/100)*Math.max(0,1-g('durationReductionPct')/100)),manaCost:calc('manaCost',n=>reduce(n,g('manaCostReduction'),g('manaCostReductionPct')+g('resourceCostReductionPct'))),rageCost:calc('rageCost',n=>reduce(n,g('rageCostReduction'),g('rageCostReductionPct')+g('resourceCostReductionPct'))),energyCost:calc('energyCost',n=>reduce(n,g('energyCostReduction'),g('energyCostReductionPct')+g('resourceCostReductionPct'))),critPct:calc('critPct',n=>Math.min(100,Math.max(0,n+g('critPct')))),absorb:calc('absorb',n=>Math.max(0,n+g('flatAbsorb'))*(1+g('absorbPct')/100)),hitPct:calc('hitPct',n=>Math.min(100,Math.max(0,n+g('hitPct')))),tickInterval:calc('tickInterval',n=>reduce(n,0,g('tickIntervalReductionPct'))),threat:calc('threat',n=>Math.max(0,n)*(1+g('threatIncreasePct')/100)*Math.max(0,1-g('threatReductionPct')/100)),rangeYards:calc('rangeYards',n=>Math.max(0,n+g('rangeIncreaseYards'))*(1+g('rangeIncreasePct')/100)),healthCost:calc('healthCost',n=>reduce(n,g('healthCostReduction'),g('healthCostReductionPct')))};
}
