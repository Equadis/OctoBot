// Only AP and spell/healing power changes can currently be propagated through
// existing dynamic formula readers. Reject every other snapshot difference.
export function swapStatModifiers(before,after,policy=null){
 const a=structuredClone(before),b=structuredClone(after),mods=[];
 const delta=(stat,x,y)=>{if(x===y)return;if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Unavailable swap stat: '+stat);mods.push({stat,mode:'flat',value:y-x});};
 for(const k of ['attackPower','healingPower']){delta(k,a[k],b[k]);delete a[k];delete b[k];}
 for(const k of Object.keys(a.schools??{}))delta(k,a.schools[k],b.schools?.[k]);
 if(policy?.allowCritHit===true){if(policy.acknowledgeUnverified!==true)throw Error('Explicit swap crit/hit acknowledgement required');if(a.spell&&b.spell){delta('spellHitDeltaPct',b.spell.missPct,a.spell.missPct);delta('spellCritDeltaPct',a.spell.critPct,b.spell.critPct);for(const k of ['missPct','critPct']){delete a.spell[k];delete b.spell[k];}}delta('meleeHitDeltaPct',a.melee.hitPct,b.melee.hitPct);delete a.melee.hitPct;delete b.melee.hitPct;const critA=a.melee.mainhand.critPct,critB=b.melee.mainhand.critPct;for(const hand of ['mainhand','offhand']){const x=a.melee[hand],y=b.melee[hand];if(x.critPct!==y.critPct&&Math.abs((y.critPct-x.critPct)-(critB-critA))>1e-7)throw Error('Unsupported unequal hand critical delta');if(hand==='offhand'&&x.hitPct!==y.hitPct&&Math.abs((y.hitPct-x.hitPct)-(after.melee.hitPct-before.melee.hitPct))>1e-7)throw Error('Unsupported unequal hand hit delta');for(const k of ['hitPct','critPct']){delete x[k];delete y[k];}}delta('meleeCritDeltaPct',critA,critB);}
 if(policy?.allowRangedHitCrit===true){if(policy.acknowledgeUnverified!==true)throw Error('Explicit ranged swap acknowledgement required');if(a.ranged&&b.ranged){for(const [key,stat] of [['observedAP','rangedAP'],['hitBonusPct','rangedHitDeltaPct'],['critBonusPct','rangedCritDeltaPct']]){delta(stat,a.ranged[key],b.ranged[key]);delete a.ranged[key];delete b.ranged[key];}}}
 delete a.schools;delete b.schools;delete a.spellPower;delete b.spellPower;
 for(const hand of ['mainhand','offhand']){
  const x=a.melee[hand],y=b.melee[hand];
  if(Number.isFinite(x.min)&&Number.isFinite(y.min)){
   const d=(after.attackPower-before.attackPower)*x.baseSpeedSeconds*x.handMultiplier/14;
   if(Math.abs(y.min-x.min-d)>1e-7||Math.abs(y.max-x.max-d)>1e-7)throw Error('Unsupported swap weapon damage change');
   for(const k of ['min','max','damage']){delete x[k];delete y[k];}
  }
 }
 if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Unsupported swap combat-stat change');
 return mods;
}
