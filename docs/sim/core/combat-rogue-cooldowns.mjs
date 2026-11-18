// Imported talent descriptions and published rank data; unresolved timing is explicit.
const num=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit Rogue '+k+' required');return x;};
const int=(x,k,min=1)=>{if(!Number.isSafeInteger(x)||x<min)throw new Error('Explicit Rogue '+k+' required');return x;};
const eligible=new Set(['rogue:sinister-strike','rogue:backstab','rogue:ambush','rogue:noxious-assault','rogue:eviscerate']);
export function compileExposeArmor(build,component,policy){
 const p=policy.exposeModel;if(!p||!Array.isArray(p.outcomes)||!p.outcomes.length||!Array.isArray(p.armourByCombo)||p.armourByCombo.length!==5)throw new Error('Explicit Expose Armor outcomes and five combo values required');
 const talent=int(Number(build.talents?.['147']??0),'Improved Expose Armor rank',0);if(talent>2)throw new Error('Invalid Improved Expose Armor rank');
 return {kind:'expose-armor',when:'always',durationMs:int(p.durationMs,'Expose Armor duration'),outcomes:p.outcomes,armourByCombo:p.armourByCombo.map(x=>num(x,'armour amount')*(1+.25*talent))};
}
export function compileRogueCooldown(build,rank,p){
 const id=rank.abilityId,tid={'rogue:adrenaline-rush':'127','rogue:cold-blood':'142','rogue:preparation':'160'}[id];
 if(!tid||Number(build.talents?.[tid]??0)<1)throw new Error('Rogue cooldown requires its talent');
 if(!p||typeof p!=='object')throw new Error('Explicit Rogue cooldown policy required');
 if(id==='rogue:preparation'){if(!Array.isArray(p.resetAbilityIds)||new Set(p.resetAbilityIds).size!==p.resetAbilityIds.length||p.resetAbilityIds.some(x=>typeof x!=='string'||!x.startsWith('rogue:')||x===id))throw new Error('Explicit other Rogue cooldown reset list required');return {kind:'rogue-reset',when:'always',abilityIds:p.resetAbilityIds};}
 const aura={id,name:id==='rogue:cold-blood'?'Cold Blood':'Adrenaline Rush',kind:'buff',maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',durationMs:id==='rogue:adrenaline-rush'?15000:int(p.durationMs,'Cold Blood duration'),modifiers:id==='rogue:adrenaline-rush'?[{stat:'energyRegenFactor',mode:'multiplyPct',value:100}]:[]};
 if(id==='rogue:cold-blood'){num(p.criticalMultiplier,'Cold Blood critical multiplier',1);if(!['cast','landed'].includes(p.consume))throw new Error('Explicit Cold Blood consumption required');return {kind:'cold-blood',when:'always',aura,policy:{criticalMultiplier:p.criticalMultiplier,consume:p.consume}};}
 return {kind:'aura',when:'always',auraTarget:'actor',aura};
}
export function coldBloodOutcomes(outcomes,multiplier){num(multiplier,'Cold Blood critical multiplier',1);return outcomes.map(o=>{if(!o.landed||o.critical===true||o.name==='crit')return o;if(o.name!=='hit'&&!o.name.startsWith('hit-'))return o;return {...o,name:'cold-blood-'+o.name,critical:true,multiplier:o.multiplier*multiplier};});}
export function coldBloodEligible(id){return eligible.has(id);}
