// Resource rules shared by the planner UI and (when it exists) the combat engine, so they can never disagree.
// Maximum energy comes from the OctoWoW talent data, not from Retail or Classic tables: rogue Vigor (id 143 in data/talents/rogue.json)
// lists +5 maximum energy at rank 1 and +10 at rank 2 in its rankParameters, giving 100, 105 or 110.
export const BASE_ENERGY=100;
export const ENERGY_CLASSES=Object.freeze(['rogue','druid']);

/** Bonus maximum energy from Vigor for the given talent ranks ({talentId: rank}). */
export function vigorEnergy(talentData,talents){
 const vigor=talentData?.talents?.find(talent=>talent.name==='Vigor'&&Array.isArray(talent.rankParameters?.[0]));
 if(!vigor)return 0;
 const rank=Math.min(Math.max(0,Math.trunc(Number(talents?.[vigor.id])||0)),vigor.maxRanks);
 return rank>0?Number(vigor.rankParameters[0][rank-1])||0:0;
}
/** The single authoritative maximum energy. Zero for classes that do not use energy. */
export function maxEnergy(classId,talentData,talents){
 if(!ENERGY_CLASSES.includes(classId))return 0;
 return BASE_ENERGY+(classId==='rogue'?vigorEnergy(talentData,talents):0);
}
/** A configured starting energy is never above the cap (and never negative). */
export const clampEnergy=(value,cap)=>Math.min(Math.max(0,Math.trunc(Number(value)||0)),cap);
/**
 * Starting energy after a change to the cap. A build that started at full energy stays at full; a lower value is kept (clamped if the cap fell).
 */
export function reconcileStartingEnergy(start,previousCap,nextCap){
 return start>=previousCap?nextCap:Math.min(start,nextCap);
}
/** Energy at the start of a fight for a validated build. */
export const initialEnergy=(classOptions,cap)=>clampEnergy(classOptions?.startingEnergy??cap,cap);
/** Gains (regeneration ticks, Vigor procs, Thistle Tea, Adrenaline Rush) stop at the cap; the overflow is reported as wasted. */
export function addEnergy(current,amount,cap){
 const total=Math.max(0,current+Math.max(0,amount));
 return {value:Math.min(cap,total),wasted:Math.max(0,total-cap)};
}
/** Spending returns null when there is not enough energy. */
export function spendEnergy(current,cost){return cost>current?null:current-cost;}
/** One regeneration tick (20 energy every 2 seconds in OctoWoW). */
export const ENERGY_TICK=20;
export const energyTick=(current,cap)=>addEnergy(current,ENERGY_TICK,cap);
