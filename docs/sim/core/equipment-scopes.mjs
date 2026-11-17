// Deterministic scoped item/set modifiers. A scope is an explicit ability,
// family, pet or target label, never permission to modify the global sheet.
// Flat bonuses described as "up to" are power/coefficient contributions,
// not guaranteed damage. Proc frequency/uptime is never guessed.
const N='([0-9]+(?:\\.[0-9]+)?)';
const A="([A-Za-z][A-Za-z :'’,-]*?)";
const unit='(?:sec(?:ond)?s?\\.?|min(?:ute)?s?\\.?)';
const clean=s=>String(s||'').trim().replace(/\s+/g,' ').replace(/^Equip:\s*/i,'').replace(/\.$/,'');
const abilities=s=>s.replace(/^your /i,'').replace(/ (?:spell|spells|ability|abilities)$/i,'').replace(/\s*,\s*and\s+/gi,',').replace(/\s+and\s+/gi,',').split(',').map(s=>s.trim()).filter(Boolean);
const mod=(scope,stat,amount,condition)=>({scope,stat,amount:Number(amount),...(condition?{condition}:{})});
const list=(scope,stat,n,condition)=>abilities(scope).map(a=>mod(a,stat,n,condition));
const found=modifiers=>({status:'scoped',stats:{},modifiers});
export function scopedEquipmentEffect(raw){
 const t=clean(raw);let m;
 const match=p=>t.match(new RegExp('^'+p+'$','i'));
 // These are event-dependent mechanics, even if the source uses Equip:.
 if(/^(?:Use:|Chance on hit:)|\b(?:chance (?:on|of|when|after|whenever|to (?:trigger|grant|restore|summon|heal|deal|inflict|reflect|return|strike|become))|on (?:a |every )?(?:melee|ranged|spell) (?:hit|attack|critical)|when struck|whenever|after casting|critical hits (?:cause|trigger)|stacks up to|next (?:spell|attack|cast)|has a chance|have a chance|sometimes heals)\b/i.test(t))return {status:'event',stats:{}};
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
 if((m=match("Increases your pet's (maximum health|critical strike chance|armor|damage) by "+N+'%'))||(m=match('Increases damage dealt by your pet by '+N+'%'))){const kind=m[2]?({'maximum health':'healthPct','critical strike chance':'critPct',armor:'armourPct',damage:'damagePct'})[m[1].toLowerCase()]:'damagePct';return found([mod('Pet',kind,m[2]??m[1],{pet:true})]);}
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
  if(c.aspect)active=context.classOptions?.aspect===c.aspect;
  // Target type is not exposed in main's build schema. Keep unresolved modifiers
  // visible but inactive until a caller supplies an explicit target type.
  if(c.target){const target=String(context.targetCreature||'').toLowerCase();active=Boolean(target)&&c.target.toLowerCase().split(' or ').includes(target);}
  const key=JSON.stringify([m.scope,m.stat,m.condition||null,active]);
  const old=result.get(key)||{...m,amount:0,active,sources:[]};old.amount+=m.amount;old.sources.push(e.source||e.raw||e.effect);result.set(key,old);
 }
 return [...result.values()];
}
export function applyScopedEquipment(rows,scope,baseline={}){
 const mods={};for(const r of rows)if(r.active&&r.scope.toLowerCase()===scope.toLowerCase())mods[r.stat]=(mods[r.stat]||0)+r.amount;
 const g=k=>mods[k]||0,calc=(k,fn)=>Number.isFinite(baseline[k])?fn(baseline[k]):null;
 const reduce=(n,flat,pct)=>Math.max(0,n-flat)*Math.max(0,1-pct/100);
 return {modifiers:mods,damage:calc('damage',n=>Math.max(0,n+g('flatDamage'))*(1+g('damagePct')/100)),healing:calc('healing',n=>Math.max(0,n)*(1+g('healingPct')/100)),castSeconds:calc('castSeconds',n=>reduce(n,g('castReductionSeconds'),0)),cooldownSeconds:calc('cooldownSeconds',n=>reduce(n,g('cooldownReductionSeconds'),g('cooldownReductionPct'))),durationSeconds:calc('durationSeconds',n=>Math.max(0,n+g('durationIncreaseSeconds'))*(1+g('durationIncreasePct')/100)),manaCost:calc('manaCost',n=>reduce(n,g('manaCostReduction'),g('manaCostReductionPct')+g('resourceCostReductionPct'))),rageCost:calc('rageCost',n=>reduce(n,g('rageCostReduction'),g('rageCostReductionPct')+g('resourceCostReductionPct'))),energyCost:calc('energyCost',n=>reduce(n,g('energyCostReduction'),g('energyCostReductionPct')+g('resourceCostReductionPct'))),critPct:calc('critPct',n=>Math.min(100,Math.max(0,n+g('critPct')))),absorb:calc('absorb',n=>Math.max(0,n+g('flatAbsorb'))*(1+g('absorbPct')/100))};
}
