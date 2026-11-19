import {CONSUMABLE_BY_ID,consumableRestriction} from './consumables.mjs';
// Only entire, unambiguous restoration tooltips are compiled. Cooldowns are
// explicitly supplied research assumptions until live category evidence exists.
export function compileConsumableUses(build,uses=[]){
 if(!Array.isArray(uses))throw Error('Explicit consumable schedules required');
 const seen=new Set();
 return uses.map(u=>{
  const item=CONSUMABLE_BY_ID.get(u.itemId);
  const reason=consumableRestriction(item,build);
  if(reason)throw Error(reason);
  if(seen.has(u.itemId))throw Error('Duplicate consumable schedule');seen.add(u.itemId);
  if(!(item.buffId?(build.controls.buffIds||[]).includes(item.buffId):(build.controls.consumableIds||[]).includes(item.id)))throw Error('Consumable must be selected: '+item.name);
  const m=(item.effects||[]).join(' ').match(/^Use: (?:Instantly restores|Restores) (\d+)(?: to (\d+))? (mana|energy|rage|health)\.$/i);
  const both=(item.effects||[]).join(' ').match(/^Use: Restores (\d+) to (\d+) mana and health\.$/i);
  if(!m&&!both)throw Error('Unsupported compound or timed consumable: '+item.name);
  if(u.acknowledgeCooldownUnverified!==true||!Number.isSafeInteger(u.cooldownMs)||u.cooldownMs<0||!Number.isSafeInteger(u.count)||u.count<1||!Array.isArray(u.atMs)||u.atMs.length>u.count)throw Error('Explicit consumable inventory and cooldown policy required');
  if(item.sharedCooldown&&(!Number.isSafeInteger(u.sharedCooldownMs)||u.sharedCooldownMs<0))throw Error('Explicit shared consumable cooldown required');
  const resource=both?'mana':m[3].toLowerCase(),min=Number((both??m)[1]),max=Number((both??m)[2]??(both??m)[1]);
  if(both&&u.rangePolicy!=='independent')throw Error('Explicit independent compound restoration rolls required');
  if(max<min)throw Error('Invalid restoration range');
  return {id:'consumable:'+item.id,source:item.name,provenance:item.source,trigger:'use',atMs:u.atMs,cooldownMs:u.cooldownMs,...(item.sharedCooldown?{sharedGroup:item.sharedCooldown,sharedCooldownMs:u.sharedCooldownMs}:{}),effect:both?{kind:'compound',effects:[{kind:'resource',resource:'mana',min,max},{kind:'heal',min,max}]}:resource==='health'?{kind:'heal',min,max}:{kind:'resource',resource,min,max}};
 });
}
