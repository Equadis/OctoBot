import {physicalAttackTable} from './combat-attack-tables.mjs';
import {physicalArmourReduction} from './combat-math.mjs';
const finite=(v,n,min=0,max=Infinity)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error('Explicit '+n+' required');return v;};
export function rangedWeaponModel(snap,policy,modifiers={},criticalBonusFactor=1){
 const w=snap.ranged,m=policy.rangedModel;if(!w)throw new Error('Compatible ranged weapon and metadata required');
 if(!m||!['actual-swing','normalised'].includes(m.weaponPolicy))throw new Error('Explicit ranged weapon policy required');
 const ap=finite(m.attackPower??w.observedAP,'observed ranged AP'),speed=m.weaponPolicy==='normalised'?finite(m.normalisedSpeed,'normalised ranged speed',.01):w.baseSpeedSeconds,ammo=finite(w.ammoDps,'compatible ammunition DPS'),ammoSpeed=m.ammoUsesActualSpeed===true?w.baseSpeedSeconds:m.ammoUsesActualSpeed===false?speed:(()=>{throw new Error('Explicit ammo speed policy required');})();
 const delta=ap/14*speed+ammo*ammoSpeed+w.scopeDamage;
 const stats={rangedMin:w.rawMin+delta,rangedMax:w.rawMax+delta};
 const miss=Math.max(0,Math.min(100,finite(m.missPct,'observed ranged miss',0,100)-(modifiers.hit||0))),crit=Math.max(0,Math.min(100,finite(m.critPct,'observed ranged crit',0,100)+(modifiers.crit||0)));
 const outcomes=physicalAttackTable({type:'ranged',missPct:miss,avoidance:{dodgePct:0,parryPct:0,blockPct:finite(m.blockPct,'ranged block',0,100)},glancePct:0,glanceMultiplier:1,critPct:crit,critSuppressionPct:finite(m.critSuppressionPct,'ranged crit suppression',0,100),critMultiplier:1+(finite(m.criticalMultiplier,'ranged critical multiplier',1)-1)*criticalBonusFactor,blockValue:finite(m.blockValue,'ranged block value'),order:m.order,position:'ranged',provenance:policy.provenance}).outcomes;
 return {stats,outcomes,mitigation:physicalArmourReduction({attackerLevel:snap.level,armour:w.targetArmour}),intervalMs:Math.round(w.intervalSeconds*1000),ammoCost:finite(m.ammoPerShot,'ammo per shot',0)};
}
