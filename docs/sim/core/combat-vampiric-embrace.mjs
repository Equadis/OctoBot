// Imported talent values; explicit damage basis and recipients.
export function compileVampiricEmbrace(build,p){
 const rank=Number(build.talents?.['215']??0);
 if(Number(build.talents?.['214']??0)!==1||!Number.isSafeInteger(rank)||rank<0||rank>2)throw new Error('Vampiric Embrace requires its talent and valid Vampiric Touch rank');
 return validateVampiricEmbrace({...p,healFraction:[.20,.22,.25][rank],manaFraction:[0,.01,.02][rank]});
}
export function validateVampiricEmbrace(p){
 if(!p||!['effective','post-mitigation'].includes(p.basis)||!Array.isArray(p.recipients)||p.recipients.length<1||p.recipients.length>5||new Set(p.recipients).size!==p.recipients.length||p.recipients.some(x=>typeof x!=='string'||!x)||!p.manaRecipients||typeof p.manaRecipients!=='object'||Array.isArray(p.manaRecipients)||Object.keys(p.manaRecipients).some(x=>!p.recipients.includes(x))||Object.values(p.manaRecipients).some(x=>typeof x!=='string'||!x)||new Set(Object.values(p.manaRecipients)).size!==Object.keys(p.manaRecipients).length||!([.20,.22,.25].includes(p.healFraction)&&[0,.01,.02][[.20,.22,.25].indexOf(p.healFraction)]===p.manaFraction)||!(p.healThreat===null||Number.isFinite(p.healThreat)&&p.healThreat>=0)||!Array.isArray(p.outcomes)||!p.outcomes.length)throw new Error('Explicit Vampiric Embrace recipients, unique mana pools, damage basis, threat and application outcomes required');
 return p;
}
export function validateVampiricParty(p,owner,allies,pools){
 validateVampiricEmbrace(p);
 for(const id of p.recipients)if(id!==owner&&!allies.includes(id))throw new Error('Vampiric Embrace recipient must be an explicit party member');
 for(const [id,resource] of Object.entries(p.manaRecipients))if(resource!==(id===owner?'mana':'partyMana:'+id)||!Object.hasOwn(pools,resource))throw new Error('Vampiric Embrace requires a separate mana pool for each recipient');
}
export function vampiricReturns(e,{actor,target,damage,school,kind,abilityId},model,owner,enemies){
 if(!model||actor!==owner||school!=='shadow'||!['damage','periodic-damage'].includes(kind)||!abilityId?.startsWith('priest:')||damage.ignored||!e.unit(owner).alive||!e.auras.active(target,'debuff').some(a=>a.id==='priest:vampiric-embrace'&&a.ownerId===owner))return;
 const amount=model.basis==='effective'?damage.effective:damage.raw;
 if(!Number.isFinite(amount)||amount<=0)return;
 const enemyIds=enemies.filter(id=>e.unit(id).alive);if(!enemyIds.length)return;
 for(const id of model.recipients){
  if(!e.unit(id).alive)continue;
  const threat=model.healThreat===null?null:{actorId:owner,enemyIds,coefficient:model.healThreat,flat:0,multipliers:[],distribution:'split'};
  e.heal({actorId:owner,targetId:id,source:'Vampiric Embrace',value:amount*model.healFraction,threat});
  const resource=model.manaRecipients[id],delta=amount*model.manaFraction;
  if(resource&&delta>0){const before=e.resources.snapshot()[resource].current,q=e.resources.change([{resource,delta}]);if(!q.ok)throw new Error('Vampiric Touch mana return failed');const actual=e.resources.snapshot()[resource].current-before;e.recordMechanic('resource-change',{actorId:owner,targetId:id,source:'Vampiric Touch',resource,delta:actual,overflow:delta-actual});}
 }
}
