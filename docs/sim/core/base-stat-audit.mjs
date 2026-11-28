import {BASE_STATS} from './base-stats.mjs?v=20261112-stats1';
import {CLASS_RACES} from './class-rules.mjs?v=20261128-merge1';

// CMaNGOS is an explicitly labelled reference, not OctoWoW live evidence.
export const BASE_STAT_SOURCE='https://github.com/cmangos/mangos-classic/blob/master/sql/base/mangos.sql';
const flagged=new Map([
 ['Human:warrior:19','Identical to level 18 in source import; growth unverified.'],
 ['Undead:mage:1','Intellect and Spirit distribution conflicts with adjacent source rows; requires in-game capture.'],
 ['Undead:mage:2','Intellect drops compared with level 1; both source rows require verification.'],
 ['Orc:rogue:19','Primary stats identical to level 18 while the other rogue races grow; present unchanged in CMaNGOS Classic and MaNGOS Zero; growth unverified.'],
 ['Orc:rogue:20','Primary stats identical to levels 18 and 19 while the other rogue races grow; present unchanged in CMaNGOS Classic and MaNGOS Zero; growth unverified.']
]);
// Two vanilla cores disagree on these class-table rows; neither is OctoWoW, so both values are kept visible.
const sourceConflicts=new Map([
 ['Night Elf:druid:1','Base mana differs between sources: CMaNGOS Classic 17, MaNGOS Zero 50. Kept the imported value; requires in-game capture.'],
 ['Tauren:druid:1','Base mana differs between sources: CMaNGOS Classic 17, MaNGOS Zero 50. Kept the imported value; requires in-game capture.']
]);
export function baseStatProfile(race,classId,level){
 const key=String(race)+':'+classId;
 if(!CLASS_RACES[classId]?.includes(race)||!Number.isInteger(level)||level<1||level>60)return {race,classId,level,status:'invalid',row:null,source:null,issues:['Invalid race/class/level.']};
 const row=BASE_STATS[key]?.[level-1],issue=flagged.get(key+':'+level),conflict=sourceConflicts.get(key+':'+level);
 if(!row)return {race,classId,level,status:'missing',row:null,source:null,issues:['No imported race/class/level data; no alternative race substituted.']};
 if(row.length!==7||row.some(v=>!Number.isSafeInteger(v)||v<0))return {race,classId,level,status:'invalid-source',row:null,source:BASE_STAT_SOURCE,issues:['Malformed source row.']};
 return {race,classId,level,status:issue?'reference-anomaly':conflict?'reference-conflict':'reference-only',row:[...row],source:BASE_STAT_SOURCE,issues:issue?[issue]:conflict?[conflict]:[],includedRacialAttributes:race==='Gnome'?['int']:race==='Human'?['spi']:[]};
}
// The imported naked Gnome Intellect and Human Spirit appear to include
// the racial modifier already. Preserve the reference naked value. Scaling
// only external flat gains is a reference assumption; rounding and ordering
// with other multipliers are not verified on the server.
export function racialAttributeEstimate(total,base,multiplier,included=false){
 if(total===null||base===null||!Number.isFinite(total)||!Number.isFinite(base))return null;
 if(!Number.isFinite(multiplier)||multiplier<=0)throw new Error('Invalid racial multiplier.');
 return included?base+Math.floor((total-base)*multiplier+1e-9):Math.floor(total*multiplier+1e-9);
}
export function baseStatInventory(){
 const combinations=Object.entries(CLASS_RACES).flatMap(([classId,races])=>races.map(race=>{
 const levels=Array.from({length:60},(_,i)=>baseStatProfile(race,classId,i+1));
 return {race,classId,referenceRows:levels.filter(x=>x.row).length,missingLevels:levels.filter(x=>!x.row).map(x=>x.level),anomalies:levels.filter(x=>x.status==='reference-anomaly').map(x=>({level:x.level,issues:x.issues})),conflicts:levels.filter(x=>x.status==='reference-conflict').map(x=>({level:x.level,issues:x.issues}))};
 }));
 return {combinations,totals:{combinations:combinations.length,referenceCombinations:combinations.filter(x=>x.referenceRows===60).length,missingCombinations:combinations.filter(x=>x.referenceRows===0).length,referenceRows:combinations.reduce((n,x)=>n+x.referenceRows,0),missingRows:combinations.reduce((n,x)=>n+x.missingLevels.length,0),anomalies:combinations.reduce((n,x)=>n+x.anomalies.length,0),sourceConflicts:combinations.reduce((n,x)=>n+x.conflicts.length,0),liveVerifiedRows:0}};
}
