// Guide: baseline toggle, not the stale 15-second haste tooltip.
const num=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit Blade Flurry '+k+' required');return x;};
export function bladeFlurryTemplate(){return {mode:null,damageFactor:null,energyFactor:null,penaltyScope:null,includeWhite:null,abilityIds:[],cleaveBasis:null,cleaveMultiplier:null,secondaryMitigation:null,deactivateCost:null,threat:null};}
export function validateBladeFlurry(p){
 if(!p||!['enable-only','auto-nearby','manual-toggle'].includes(p.mode)||!['all-damage','eligible-only'].includes(p.penaltyScope)||!['effective','post-mitigation','base'].includes(p.cleaveBasis)||typeof p.includeWhite!=='boolean'||!Array.isArray(p.abilityIds)||new Set(p.abilityIds).size!==p.abilityIds.length||p.abilityIds.some(x=>typeof x!=='string'||!x.startsWith('rogue:')))throw new Error('Explicit Blade Flurry toggle, eligibility and damage basis required');
 num(p.damageFactor,'damage factor',0,1);num(p.energyFactor,'energy factor',0,1);num(p.cleaveMultiplier,'cleave multiplier');num(p.deactivateCost,'deactivation energy cost');
 if(p.cleaveBasis==='base')num(p.secondaryMitigation,'secondary mitigation',0,1);else if(p.secondaryMitigation!==null)throw new Error('No second mitigation for copied post-mitigation/effective damage');
 if(p.threat!==null){num(p.threat?.coefficient,'threat coefficient');num(p.threat?.flat,'flat threat');}return p;
}
export function createBladeFlurryRuntime(owner,primary,nearby,duration,model){
 const id='rogue:blade-flurry',active=e=>e.auras.active(owner,'buff').find(a=>a.id===id&&a.ownerId===owner);
 const second=(e,target)=>{const candidates=nearby?.[target]??[];return candidates.find(x=>x!==target&&e.unit(x).alive)??null;};
 const eligible=(ctx,x)=>x.kind==='damage'&&x.school==='physical'&&(ctx.white===true?model.includeWhite&&['mainhand','offhand'].includes(ctx.hand):model.abilityIds.includes(ctx.abilityId));
 return {active,available(e){const a=active(e);if(model.mode==='manual-toggle')return true;if(model.mode==='enable-only')return !a;const t=e.unit(primary).alive?primary:null,desired=!!t&&second(e,t)!==null;return !!a!==desired;},
 toggle(e){const a=active(e);if(a){e.auras.remove(a,'toggle-off');return;}e.auras.apply({id,name:'Blade Flurry',targetId:owner,ownerId:owner,kind:'buff',durationMs:Math.max(1,duration-e.timeline.now+1),maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'energyRegenFactor',mode:'multiplyPct',value:(model.energyFactor-1)*100}]});},
 factor(e,actor,x,ctx){return actor===owner&&active(e)&&(model.penaltyScope==='all-damage'||eligible(ctx,x))?model.damageFactor:1;},
 copy(e,actor,target,x,ctx,hit,damage){if(actor!==owner||!active(e)||!eligible(ctx,x)||!hit.landed||damage.ignored)return;const t=second(e,target);if(t===null)return;const basis=model.cleaveBasis==='effective'?damage.effective:model.cleaveBasis==='base'?hit.base*(1-model.secondaryMitigation):hit.raw;const value=basis*model.cleaveMultiplier;if(value<=0)return;e.damage({actorId:owner,targetId:t,source:'Blade Flurry (cleave)',school:'physical',value,threat:model.threat===null?null:{actorId:owner,...model.threat,multipliers:[],distribution:'each'}});}
 };
}
