/**
 * Ability-level talent calculation. Exact profile membership is explicit,
 * not inferred from slash-separated tooltip labels. This is not a rotation
 * or damage simulator. Baseline damage/cost/timing values must come from a
 * separate, rank-appropriate source; absent input is returned as null.
 */
const profile=(name,type,...tags)=>({name,type,tags:[name,...tags]});
const many=(names,type,...tags)=>names.map(n=>profile(n,type,...tags));
const spell=(name,school,...tags)=>profile(name,'spell',school,'All spells','Spell casting','Spells','Offensive spells',school+' spells',school+' spell casting',...tags);
const heal=(name,school,...tags)=>profile(name,'heal',school,'All spells','Spell casting','Spells','Healing spells',school+' spell casting',...tags);
const melee=(name,...tags)=>profile(name,'melee','Melee attacks','All physical attacks','Weapons / Stormstrike / Lightning Strike',...tags);
const ranged=(name,...tags)=>profile(name,'ranged','Ranged weapons',...tags);
const utility=(name,...tags)=>profile(name,'utility',...tags);
const balance=(name,school,...tags)=>spell(name,school,'Balance spell casting','Balance/utility spells','Balance and healing spells','Balance spells',...tags);
const aff=(name,...tags)=>spell(name,'Shadow','Affliction','Affliction spells','Affliction spell casting',...tags);
const dest=(name,school,...tags)=>spell(name,school,'Destruction','Destruction spells',...tags);
const war=(name,...tags)=>melee(name,'Battle/Defensive/Berserker abilities',...tags);
const rogueBuilder=(name,...tags)=>melee(name,'Combo-point generators',...tags);
const holyHeal=(name,...tags)=>heal(name,'Holy',...tags);
const spellUtility=(name,...tags)=>utility(name,'All spells','Spell casting','Spells',...tags);
const fireTotem=(name,...tags)=>profile(name,'unknown','Fire','Totems','Fire Totems',...tags);
const sham=(name,school,...tags)=>spell(name,school,'Offensive Fire/Frost/Nature',...tags);
const shock=(name,school,...tags)=>sham(name,school,'Shock spells','Instant spells',...tags);
const hunterShot=(name,...tags)=>ranged(name,'Shots and Stings',...tags);
const allDmg=(p,tag)=>({...p,tags:[...p.tags,tag]});
const hunterMelee=(name,...tags)=>melee(name,'Traps and melee abilities',...tags);
const feral=(name,...tags)=>melee(name,'Feral abilities',...tags);
const ABILITIES={
 warrior:[
  war('Heroic Strike'),profile('Rend','periodic','Rend bleed','Battle/Defensive/Berserker abilities','All physical attacks'),war('Overpower'),war('Thunder Clap'),
  war('Slam'),war('Execute'),war('Mortal Strike'),war('Bloodthirst'),war('Whirlwind'),
  war('Cleave'),war('Shield Slam'),war('Revenge'),utility('Charge'),utility('Intercept','Intercept/Intervene'),
  utility('Intervene','Intercept/Intervene'),utility('Pummel','Pummel school lockout'),
  ...many(['Taunt','Disarm','Bloodrage'],'utility'),utility('Berserker Rage','Berserker Rage activation'),
  utility('Shield Wall','Retaliation/Recklessness/Shield Wall'),utility('Recklessness','Retaliation/Recklessness/Shield Wall'),
  utility('Retaliation','Retaliation/Recklessness/Shield Wall'),utility('Battle Shout','Shouts','Battle/Demoralizing Shout'),utility('Demoralizing Shout','Shouts','Battle/Demoralizing Shout')
 ],
 paladin:[
  holyHeal('Holy Light','Holy Light / Flash of Light / Holy Shock','Flash of Light/Holy Light'),
  holyHeal('Flash of Light','Holy Light / Flash of Light / Holy Shock','Flash of Light/Holy Light'),
  holyHeal('Holy Shock (healing)','Holy Shock','Holy Light / Flash of Light / Holy Shock'),
  spell('Holy Shock (damage)','Holy','Holy Shock'),spell('Exorcism','Holy'),spell('Consecration','Holy'),
  melee('Crusader Strike'),profile('Holy Strike','unknown','Holy Strike'),
  profile('Holy Strike (healing)','heal','Holy Strike healing','Holy Strike healing power'),
  profile('Judgement of Righteousness','unknown','Holy','Seal/Judgement of Righteousness','Judgement/Seals','Judgement'),
  profile('Seal of Righteousness','unknown','Holy','Seal/Judgement of Righteousness','Judgement/Seals'),profile('Retribution Aura','unknown','Holy'),
  ...many(['Seal of Command','Seal of the Crusader','Seal of Wisdom','Seal of Light'],'utility','Judgement/Seals'),
  utility('Judgement','Judgement/Seals'),utility('Hand of Reckoning'),utility('Lay on Hands'),utility('Devotion Aura'),utility('Concentration Aura'),
  ...many(['Hand of Protection','Hand of Freedom','Hammer of Justice'],'utility')
 ],
 rogue:[
  rogueBuilder('Sinister Strike','Sinister Strike/Eviscerate/Riposte/Surprise Attack'),
  rogueBuilder('Backstab','Backstab/Garrote/Ambush from behind'),
  rogueBuilder('Ambush','Backstab/Garrote/Ambush from behind'),
  rogueBuilder('Noxious Assault'),rogueBuilder('Hemorrhage'),rogueBuilder('Ghostly Strike'),
  rogueBuilder('Surprise Attack','Sinister Strike/Eviscerate/Riposte/Surprise Attack'),
  melee('Eviscerate','Sinister Strike/Eviscerate/Riposte/Surprise Attack'),
  profile('Garrote','periodic','Backstab/Garrote/Ambush from behind','Rupture/Garrote','Cheap Shot/Garrote'),
  profile('Rupture','periodic','Rupture/Garrote'),
  melee('Riposte','Sinister Strike/Eviscerate/Riposte/Surprise Attack'),
  profile('Poison damage','unknown','Poisons','Poison application'),
  utility('Cheap Shot','Cheap Shot/Garrote'),utility('Slice and Dice','Slice and Dice/Flourish'),
  utility('Flourish','Slice and Dice/Flourish'),utility('Envenom','Poisons'),utility('Expose Armor'),utility('Distract'),
  utility('Gouge'),utility('Stealth'),utility('Throw','Throw/Deadly Throw'),utility('Deadly Throw','Throw/Deadly Throw')
 ].map(p=>['melee','periodic','unknown'].includes(p.type)?allDmg(p,'Humanoid/Giant/Beast/Dragonkin targets'):p),
 druid:[
  balance('Wrath','Nature','Starfire/Moonfire/Wrath','Starfire/Moonfire/Hurricane/Insect Swarm/Wrath'),
  balance('Starfire','Arcane','Starfire/Moonfire/Wrath','Starfire/Moonfire/Hurricane/Insect Swarm/Wrath'),
  balance('Moonfire','Arcane','Starfire/Moonfire/Wrath','Starfire/Moonfire/Hurricane/Insect Swarm/Wrath'),profile('Moonfire (periodic)','periodic','Moonfire','Arcane','Periodic magic','Starfire/Moonfire/Hurricane/Insect Swarm/Wrath'),
  balance('Hurricane','Nature','Starfire/Moonfire/Hurricane/Insect Swarm/Wrath'),
  profile('Insect Swarm','periodic','Nature','Starfire/Moonfire/Hurricane/Insect Swarm/Wrath','Balance and healing spells','Balance spells','Balance/utility spells','Spells','Periodic magic'),
  heal('Healing Touch','Nature','Healing Touch/Regrowth/Tranquility','Balance and healing spells'),
  heal('Regrowth','Nature','Healing Touch/Regrowth/Tranquility','Balance and healing spells'),
  profile('Regrowth (periodic)','heal-periodic','Healing spells','Periodic magic','Regrowth with Rejuvenation'),
  profile('Rejuvenation','heal-periodic','Healing spells','Periodic magic','Balance and healing spells'),
  profile('Tranquility','heal','Healing spells','Healing Touch/Regrowth/Tranquility','Balance and healing spells'),
  feral('Claw','Claw/Rake/Maul/Swipe/Savage Bite','Claw per active Bleed'),
  feral('Shred'),feral('Rake','Claw/Rake/Maul/Swipe/Savage Bite'),
  feral('Maul','Claw/Rake/Maul/Swipe/Savage Bite'),feral('Swipe','Claw/Rake/Maul/Swipe/Savage Bite'),
  feral('Savage Bite','Claw/Rake/Maul/Swipe/Savage Bite'),feral('Ferocious Bite'),
  profile('Rip','periodic','All physical attacks','Feral abilities'),
  utility('Tiger\'s Fury'),utility('Enrage'),utility('Bash','Bash/Pounce'),utility('Pounce','Bash/Pounce')
 ],
 shaman:[
  sham('Lightning Bolt','Nature','Lightning spells','Lightning Bolt/Chain Lightning'),
  sham('Chain Lightning','Nature','Lightning spells','Lightning Bolt/Chain Lightning'),
  shock('Earth Shock','Nature'),shock('Flame Shock','Fire'),profile('Flame Shock (periodic)','periodic','Flame Shock','Fire','All spells','Spells','Offensive spells','Fire spells','Shock spells','Periodic magic','Offensive Fire/Frost/Nature'),shock('Frost Shock','Frost'),
  sham('Molten Blast','Fire','Instant spells'),sham('Earthquake','Nature'),
  ...['Healing Wave','Lesser Healing Wave','Chain Heal'].map(n=>heal(n,'Nature')),
  melee('Stormstrike','Physical/imbue attacks'),melee('Lightning Strike','Physical/imbue attacks'),
  utility('Stoneclaw Totem','Totems','Helpful Totems'),utility('Earthbind Totem','Totems','Helpful Totems'),
  fireTotem('Fire Nova Totem'),fireTotem('Magma Totem'),fireTotem('Searing Totem'),utility('Grounding Totem','Totems','Helpful Totems'),
  utility('Mana Spring Totem','Totems','Helpful Totems'),utility('Healing Stream Totem','Totems','Helpful Totems'),
  utility('Earth Shield','Shield spells'),utility('Lightning Shield','Shield spells'),utility('Water Shield','Shield spells'),
  utility('Ghost Wolf'),utility('Reincarnation'),utility('Totemic Recall')
 ],
 hunter:[
  ranged('Auto Shot'),hunterShot('Aimed Shot','Steady Shot/Aimed Shot'),
  hunterShot('Steady Shot','Steady Shot/Aimed Shot'),hunterShot('Multi-Shot','Multi-Shot/Volley'),
  hunterShot('Arcane Shot'),profile('Volley','unknown','Shots and Stings','Multi-Shot/Volley'),
  profile('Serpent Sting','periodic','Shots and Stings'),
  utility('Viper Sting','Shots and Stings'),utility('Scorpid Sting','Shots and Stings'),
  hunterMelee('Raptor Strike','Raptor Strike/Mongoose Bite'),hunterMelee('Mongoose Bite','Raptor Strike/Mongoose Bite'),
  hunterMelee('Carve'),hunterMelee('Lacerate'),hunterMelee('Wing Clip'),
  utility('Freezing Trap','Frost/Freezing Trap','Traps and melee abilities','Trap effects'),
  utility('Frost Trap','Frost/Freezing Trap','Traps and melee abilities','Trap effects'),
  profile('Immolation Trap','unknown','Immolation/Explosive Trap','Traps and melee abilities','Trap effects'),
  profile('Explosive Trap','unknown','Immolation/Explosive Trap','Traps and melee abilities','Trap effects'),
  utility('Revive Pet'),profile('Mend Pet','heal-periodic'),utility('Feign Death'),utility('Kill Command')
 ].map(p=>['melee','ranged','periodic','unknown'].includes(p.type)?allDmg(allDmg(allDmg(p,'All damage when no pet'),'Beast/Giant/Dragonkin/Humanoid targets'),'These targets'):p),
 mage:[
  spell('Fireball','Fire'),profile('Fireball (periodic)','periodic','Fireball','Fire','All spells','Spells','Offensive spells','Fire spells','Periodic magic'),spell('Fire Blast','Fire'),spell('Scorch','Fire'),
  spell('Pyroblast','Fire'),profile('Pyroblast (periodic)','periodic','Pyroblast','Fire','All spells','Spells','Offensive spells','Fire spells','Periodic magic'),spell('Flamestrike','Fire'),profile('Flamestrike (periodic)','periodic','Flamestrike','Fire','All spells','Spells','Offensive spells','Fire spells','Periodic magic'),spell('Blast Wave','Fire'),
  spell('Frostbolt','Frost','Frostbolt/Icicles/Blizzard'),spell('Icicles','Frost','Frostbolt/Icicles/Blizzard'),
  spell('Blizzard','Frost','Frostbolt/Icicles/Blizzard'),
  spell('Frost Nova','Frost','Frost Nova/Cone of Cold'),spell('Cone of Cold','Frost','Frost Nova/Cone of Cold'),
  spell('Arcane Missiles','Arcane','Arcane Missiles channel'),spell('Arcane Rupture','Arcane'),
  spell('Arcane Explosion','Arcane'),profile('Wand attack','unknown','Wand'),utility('Mana Shield'),utility('Frost Armor','Frost/Ice Armor'),utility('Ice Armor','Frost/Ice Armor'),utility('Frost Ward')
 ],
 warlock:[
  ...['Curse of the Elements','Curse of Shadow','Curse of Recklessness'].map(name=>spellUtility(name,'Shadow','Affliction','Affliction spells','Affliction spell casting')),
  profile('Corruption','periodic','Shadow','Affliction','Affliction spells','Affliction spell casting','All spells','Spell casting','Spells','Offensive spells'),profile('Curse of Agony','periodic','Shadow','Affliction','Affliction spells','All spells','Spell casting','Spells','Offensive spells'),profile('Curse of Doom','periodic','Shadow','Affliction','Affliction spells','All spells','Spell casting','Spells','Offensive spells'),aff('Drain Soul','Drain Soul/Life/Mana','Drain Soul/Dark Harvest/Death Coil per Affliction effect'),
  aff('Drain Life','Drain Soul/Life/Mana'),spellUtility('Drain Mana','Shadow','Affliction','Affliction spells','Drain Soul/Life/Mana'),
  aff('Dark Harvest','Drain Soul/Dark Harvest/Death Coil per Affliction effect'),aff('Death Coil','Drain Soul/Dark Harvest/Death Coil per Affliction effect'),
  profile('Siphon Life','periodic','Shadow','Affliction','Affliction spells','All spells','Spell casting','Spells','Offensive spells'),dest('Shadow Bolt','Shadow','Shadow Bolt/Searing Pain/Immolate'),
  dest('Searing Pain','Fire','Shadow Bolt/Searing Pain/Immolate'),
  dest('Immolate','Fire','Shadow Bolt/Searing Pain/Immolate'),
  dest('Soul Fire','Fire'),dest('Shadowburn','Shadow'),dest('Conflagrate','Fire'),
  dest('Rain of Fire','Fire'),dest('Hellfire','Fire'),
  profile('Immolate (periodic)','periodic','Fire','Immolate','Immolate periodic','Destruction'),
  spellUtility('Life Tap','Imp'),...many(['Curse of Weakness','Curse of Exhaustion','Health Funnel','Mana Funnel','Demon Armor'],'utility')
 ].map(p=>['spell','periodic'].includes(p.type)?allDmg(allDmg(allDmg(allDmg(p,'All damage when no pet'),'All damage while Soul Link demon active'),'Succubus'),'Imp'):p),
 priest:[
  spell('Smite','Holy','Smite/Holy Fire/Heal/Greater Heal','Smite/Holy Fire/Chastise','Instant/Holy/Discipline spells'),
  spell('Holy Fire','Holy','Smite/Holy Fire/Heal/Greater Heal','Smite/Holy Fire/Chastise','Instant/Holy/Discipline spells'),profile('Holy Fire (periodic)','periodic','Holy Fire','Holy','All spells','Spells','Offensive spells','Holy spells','Periodic magic'),
  spell('Chastise','Holy','Smite/Holy Fire/Chastise','Instant/Holy/Discipline spells'),
  spell('Holy Nova','Holy','Prayer of Healing/Holy Nova','Instant/Holy/Discipline spells'),
  spell('Mind Blast','Shadow'),spell('Mind Flay','Shadow'),spell('Mana Burn','Discipline','Instant/Holy/Discipline spells'),
  profile('Shadow Word: Pain','periodic','Shadow','All spells','Spell casting','Spells','Offensive spells','Shadow spells','Instant/Holy/Discipline spells'),
  holyHeal('Heal','Smite/Holy Fire/Heal/Greater Heal','Lesser Heal/Heal/Greater Heal/Prayer of Healing','Healing target with Renew'),
  holyHeal('Greater Heal','Smite/Holy Fire/Heal/Greater Heal','Lesser Heal/Heal/Greater Heal/Prayer of Healing','Healing target with Renew'),
  holyHeal('Lesser Heal','Lesser Heal/Heal/Greater Heal/Prayer of Healing','Healing target with Renew'),
  holyHeal('Flash Heal','Healing target with Renew'),
  holyHeal('Prayer of Healing','Lesser Heal/Heal/Greater Heal/Prayer of Healing','Prayer of Healing/Holy Nova','Healing target with Renew'),
  profile('Renew','heal-periodic','Holy','All spells','Spell casting','Spells','Healing spells','Healing target with Renew','Instant/Holy/Discipline spells'),
  spellUtility('Power Word: Shield','Instant/Holy/Discipline spells'),spellUtility('Psychic Scream','Instant/Holy/Discipline spells'),spellUtility('Fade','Instant/Holy/Discipline spells'),profile('Wand attack','unknown','Wand/Bow'),profile('Bow attack','unknown','Wand/Bow')
 ]
};

const finite=n=>Number.isFinite(n);
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const plus=(map,k,v)=>{map[k]=(map[k]||0)+v;};
const noNegative=n=>Math.max(0,n);
const rel=(pct)=>1+pct/100;
const reduction=(pct)=>Math.max(0,1-pct/100);
const statAlias={criticalChance:'crit',criticalDamage:'criticalDamagePct',spellCostReductionPct:'manaCostReductionPct',pushbackResistancePct:'pushbackAvoidancePct'};
const isDamage=t=>['melee','ranged','spell','periodic','unknown'].includes(t);
const isHealing=t=>['heal','heal-periodic'].includes(t);
export function abilityProfiles(classId){return (ABILITIES[classId]||[]).map(p=>({...p,tags:[...p.tags]}));}
export function calculateAbilityTalentEffects(audit,profile,baseline={}){
 const modifiers={},matched=[];
 if(!audit?.active)return {profile,modifiers,matched,values:{}};
 const tags=new Set(profile.tags);
 for(const effect of audit.abilityEffects||[]){
  const scopes=Array.isArray(effect.scope)?effect.scope:[effect.scope];
  if(effect.kind==='ranged'){if(profile.type!=='ranged')continue;}
  else if(!['spell','scoped'].includes(effect.kind)||!scopes.some(s=>tags.has(s)))continue;
  const stat=statAlias[effect.stat]||effect.stat;
  // A damaging-spell talent must not turn a heal into damage. The same
  // selected talent is counted at most once even if two scope tags match.
  if((stat==='damagePct'||stat==='criticalDamagePct')&&!isDamage(profile.type))continue;
  if((stat==='healingPct'||stat==='periodicHealingPct')&&!isHealing(profile.type))continue;
  plus(modifiers,stat,effect.amount);matched.push({talent:effect.name,stat,value:effect.amount});
 }
 const get=k=>modifiers[k]||0;
 const damagePct=get('damagePct')+(isDamage(profile.type)?get('damageAndHealingPct'):0);
 const healingPct=get('healingPct')+get('periodicHealingPct')+(isHealing(profile.type)?get('damageAndHealingPct'):0);
 const manaFactor=reduction(get('manaCostReductionPct'));
 const castFactor=1/rel(get('castSpeedPct'));
 const cooldownReduction=get('cooldownReductionSeconds')+get('cooldownReductionMinutes')*60;
 const value=(key,fn)=>finite(baseline[key])?fn(baseline[key]):null;
 const values={
  resistReductionPct:get('resistReductionPct'),rangeBonusYards:get('rangeIncreaseYards'),rangeFactor:rel(get('rangeIncreasePct')),threatFactor:rel(get('threatPct')-get('threatReductionPct')),hasteFactor:rel(get('hastePct')),absorbFactor:rel(get('absorbPct')),absorb:value('absorb',n=>noNegative(n)*rel(get('absorbPct'))),
  damageFactor:rel(damagePct),healingFactor:rel(healingPct),manaFactor,castFactor,
  criticalBonusFactor:rel(get('criticalDamagePct')),
  castTimeReductionSeconds:get('castTimeReductionSeconds'),
  cooldownReductionSeconds:cooldownReduction,
  hitBonusPct:get('hit'),critBonusPct:get('crit'),
  missPct:value('missPct',n=>clamp(n-get('hit'),profile.type==='spell'?1:0,100)),
  critPct:['periodic','heal-periodic','utility'].includes(profile.type)?null:value('critPct',n=>clamp(n+get('crit'))),
  damage:value('damage',n=>noNegative(n)*rel(damagePct)),
  healing:value('healing',n=>noNegative(n)*rel(healingPct)),
  manaCost:value('manaCost',n=>noNegative(n)*manaFactor),
  rageCost:value('rageCost',n=>noNegative(n-get('rageCostReduction')-get('rageEnergyCostReduction'))),
  energyCost:value('energyCost',n=>noNegative(n-get('energyCostReduction')-get('rageEnergyCostReduction'))),
  castSeconds:value('castSeconds',n=>noNegative(n-get('castTimeReductionSeconds'))*castFactor),
  cooldownSeconds:value('cooldownSeconds',n=>noNegative(n-cooldownReduction)*reduction(get('cooldownReductionPct'))),
  gcdSeconds:value('gcdSeconds',n=>noNegative(n-get('globalCooldownReductionSeconds'))),
  durationSeconds:value('durationSeconds',n=>noNegative(n+get('durationIncreaseSeconds'))*rel(get('durationPct'))),
  criticalBonus:['periodic','heal-periodic','utility'].includes(profile.type)?null:value('criticalBonus',n=>noNegative(n)*rel(get('criticalDamagePct'))),
  rangeYards:value('rangeYards',n=>noNegative(n+get('rangeIncreaseYards'))*rel(get('rangeIncreasePct'))),
  resistPct:value('resistPct',n=>clamp(n-get('resistReductionPct'))),
  threat:value('threat',n=>noNegative(n)*rel(get('threatPct')-get('threatReductionPct'))),
  attackInterval:value('attackInterval',n=>noNegative(n)/rel(get('hastePct')))
 };
 return {profile,modifiers,matched,values};
}
export function abilityEstimates(classId,audit,baselines={},build={}){
 const shadowform=classId==='priest'&&build.classOptions?.form==='Shadowform'&&audit?.details?.some(d=>d.name==='Shadowform'&&d.status==='calculated');
 return abilityProfiles(classId).filter(p=>!shadowform||!p.tags.includes('Holy')||p.name==='Holy Nova').map(p=>calculateAbilityTalentEffects(audit,p,baselines[p.type]||{})).filter(p=>p.matched.length);
}
