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
  const timed=(item.effects||[]).join(' ').match(/^Use: Restores (\d+) health and mana over (\d+) sec\.$/i);
  const text=(item.effects||[]).join(' ');
  const armour=text.match(/^Use: Increases armor by (\d+) for (\d+) sec\.$/i);
  const resistance=text.match(/^Use: Increases your resistance to all schools of magic by (\d+) for (\d+) sec\.$/i);
  const dualRes=text.match(/^Use: Increases Frost and Shadow resistance by (\d+) for (\d+) sec\.$/i);
  const rage=text.match(/^Use: Increases Rage by (\d+) to (\d+) and increases Strength by (\d+) for (\d+) sec\.$/i);
  const bandage=/bandage/i.test(item.name)?text.match(/^Use: Heals (\d+) damage over (\d+) sec\.(?:\s*Usable only inside (Warsong Gulch|Arathi Basin)\.)?$/i):null;
  const aura=item.effectAudit?.status==='timed'?(armour||resistance||dualRes):null;
  if(!m&&!both&&!timed&&!aura&&!rage&&!bandage)throw Error('Unsupported compound or timed consumable: '+item.name);
  if(u.acknowledgeCooldownUnverified!==true||!Number.isSafeInteger(u.cooldownMs)||u.cooldownMs<0||!Number.isSafeInteger(u.count)||u.count<1||!Array.isArray(u.atMs)||u.atMs.length>u.count)throw Error('Explicit consumable inventory and cooldown policy required');
  if(item.sharedCooldown&&(!Number.isSafeInteger(u.sharedCooldownMs)||u.sharedCooldownMs<0))throw Error('Explicit shared consumable cooldown required');
  const sharedGroup=bandage?'bandage':item.sharedCooldown;if(bandage&&(!Number.isSafeInteger(u.sharedCooldownMs)||u.sharedCooldownMs<0))throw Error('Explicit shared bandage cooldown required');
  const common={id:'consumable:'+item.id,source:item.name,provenance:item.source,trigger:'use',atMs:u.atMs,cooldownMs:u.cooldownMs,...(sharedGroup?{sharedGroup,sharedCooldownMs:u.sharedCooldownMs}:{})};
  if(bandage){const durationMs=Number(bandage[2])*1000,intervalMs=u.tickIntervalMs;if(!Number.isSafeInteger(intervalMs)||intervalMs<1||durationMs%intervalMs!==0||u.acknowledgeTickTimingUnverified!==true||u.acknowledgeChannelUnverified!==true)throw Error('Explicit bandage channel and tick policy required');const zone=bandage[3]??(item.id===19307?'Alterac Valley':null);if(zone&&u.zone!==zone)throw Error('Bandage requires matching battleground');return {...common,effect:{kind:'periodic-restore',resource:'health',amount:Number(bandage[1])*intervalMs/durationMs,durationMs,intervalMs,channel:true}};}
  if(aura){const stats=armour?['incomingArmourDelta']:resistance?['incomingAllResistanceDelta']:['incomingFrostResistanceDelta','incomingShadowResistanceDelta'];return {...common,effect:{kind:'aura',durationMs:Number(aura[2])*1000,modifiers:stats.map(stat=>({stat,mode:'flat',value:Number(aura[1])}))}};}
  if(rage){if(u.acknowledgeSourceRangeUnverified!==true)throw Error('Explicit imported Rage range acknowledgement required');return {...common,effect:{kind:'compound',effects:[{kind:'resource',resource:'rage',min:Number(rage[1]),max:Number(rage[2])},{kind:'aura',durationMs:Number(rage[4])*1000,modifiers:[{stat:'strength',mode:'flat',value:Number(rage[3])}]}]}};}
  if(timed){const durationMs=Number(timed[2])*1000,intervalMs=u.tickIntervalMs;if(!Number.isSafeInteger(intervalMs)||intervalMs<1||durationMs%intervalMs!==0||u.acknowledgeTickTimingUnverified!==true)throw Error('Explicit periodic restoration interval required');return {...common,effect:{kind:'compound',effects:['health','mana'].map(resource=>({kind:'periodic-restore',resource,amount:Number(timed[1])*intervalMs/durationMs,durationMs,intervalMs}))}};}
  const resource=both?'mana':m[3].toLowerCase(),min=Number((both??m)[1]),max=Number((both??m)[2]??(both??m)[1]);
  if(both&&u.rangePolicy!=='independent')throw Error('Explicit independent compound restoration rolls required');
  if(max<min)throw Error('Invalid restoration range');
  return {id:'consumable:'+item.id,source:item.name,provenance:item.source,trigger:'use',atMs:u.atMs,cooldownMs:u.cooldownMs,...(item.sharedCooldown?{sharedGroup:item.sharedCooldown,sharedCooldownMs:u.sharedCooldownMs}:{}),effect:both?{kind:'compound',effects:[{kind:'resource',resource:'mana',min,max},{kind:'heal',min,max}]}:resource==='health'?{kind:'heal',min,max}:{kind:'resource',resource,min,max}};
 });
}
