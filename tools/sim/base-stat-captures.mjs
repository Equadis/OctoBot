import {validRace,isManaClass} from '../../docs/sim/core/class-rules.mjs';
import {baseStatProfile} from '../../docs/sim/core/base-stat-audit.mjs';
const races={Human:'Human',Orc:'Orc',Dwarf:'Dwarf',NightElf:'Night Elf','Night Elf':'Night Elf',Scourge:'Undead',Undead:'Undead',Tauren:'Tauren',Gnome:'Gnome',Troll:'Troll',Goblin:'Goblin',HighElf:'High Elf','High Elf':'High Elf'};
function integer(s,min,max){if(!/^-?\d+$/.test(s))throw new Error('Invalid integer');const n=Number(s);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('Out-of-range capture value');return n;}
function vector(s,min,max){const parts=s.split(',');if(parts.length!==5)throw new Error('Expected five attributes');return parts.map(x=>integer(x,min,max));}
export function parseCapture(line){
 const fields=line.trim().split('|');
 if(fields.length!==12||fields[0]!=='OCTOSTAT1'||fields[11]!=='clean')throw new Error('Unknown or incomplete capture format');
 const race=races[fields[1]],classId=fields[2].toLowerCase(),level=integer(fields[3],1,60);
 if(!validRace(classId,race))throw new Error('Invalid race/class');
 const base=vector(fields[4],0,100000),effective=vector(fields[5],0,100000),positive=vector(fields[6],0,100000),negative=vector(fields[7],-100000,100000);
 const health=integer(fields[8],1,1000000),power=integer(fields[9],0,1000000),powerType=integer(fields[10],0,3);
 const expectedResource=isManaClass(classId)?0:classId==='warrior'?1:3;
 if(powerType!==expectedResource)throw new Error('Unexpected resource or shapeshift form');
 return {race,classId,level,base,effective,positive,negative,health,power,powerType,source:'anonymous client capture; pending review'};
}
export function captureReview(lines){
 const entries=new Map(),rejected=[];
 for(const [i,line] of lines.entries()){
  try{
   const r=parseCapture(line),key=r.race+':'+r.classId+':'+r.level;
   const group=entries.get(key)||new Map();const signature=JSON.stringify(r);
   group.set(signature,r);entries.set(key,group);
  }catch(e){rejected.push({record:i+1,reason:e.message});}
 }
 const candidates=[...entries.values()].map(group=>{
  const observations=[...group.values()],r=observations[0],reference=baseStatProfile(r.race,r.classId,r.level);
  return {race:r.race,classId:r.classId,level:r.level,status:observations.length>1?'conflicting-observations':'candidate-unreviewed',observations,referenceStatus:reference.status,referenceAttributes:reference.row?.slice(0,5)||null,effectiveAttributeDifference:observations.length===1&&reference.row?r.effective.map((v,i)=>v-reference.row[i]):null};
 });
 return {candidateRows:candidates.length,conflictingRows:candidates.filter(r=>r.status==='conflicting-observations').length,rejected,candidates,promotedRows:0,notes:'Captured max health/power are final client resources, not raw class base health/mana. No row is inserted into BASE_STATS. Identical captures are deduplicated, not evidence of independent confirmation.'};
}
export function extractCaptureLines(text){
 return Array.from(text.matchAll(/OCTOSTAT1\|[^"\r\n]+/g),m=>m[0].trim());
}
