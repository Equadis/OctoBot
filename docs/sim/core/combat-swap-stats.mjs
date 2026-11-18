// Only AP and spell/healing power changes can currently be propagated through
// existing dynamic formula readers. Reject every other snapshot difference.
export function swapStatModifiers(before,after){
 const a=structuredClone(before),b=structuredClone(after),mods=[];
 const delta=(stat,x,y)=>{if(x===y)return;if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Unavailable swap stat: '+stat);mods.push({stat,mode:'flat',value:y-x});};
 for(const k of ['attackPower','healingPower']){delta(k,a[k],b[k]);delete a[k];delete b[k];}
 for(const k of Object.keys(a.schools??{}))delta(k,a.schools[k],b.schools?.[k]);
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
