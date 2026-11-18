import {petAbilityCandidates} from './pet-training-audit.mjs';
const n=(v,k)=>{if(!Number.isFinite(v)||v<0)throw Error('Invalid pet '+k);return v;};
// All values are explicit observed/reference inputs; no automatic custom rates.
export function resolvePetStats(build,m,ownerStats){
 const base={health:n(m.health,'health'),attackPower:n(m.attackPower,'AP'),spellPower:n(m.spellPower,'SP')};
 const p=m.statPolicy;if(p===undefined)return base;
 if(!p||!['included','apply'].includes(p.mode)||typeof p.provenance!=='string'||!p.provenance.trim())throw Error('Explicit pet stat policy required');
 if(p.mode==='included'){if(p.inheritance||p.training?.length)throw Error('Included pet stats cannot apply additional modifiers');return base;}
 const allowed=new Set(['health','attackPower','spellPower']),seen=new Set();
 for(const x of p.inheritance??[]){if(!allowed.has(x.stat)||seen.has(x.stat)||!Object.hasOwn(ownerStats??{},x.ownerStat))throw Error('Invalid pet inheritance mapping');seen.add(x.stat);base[x.stat]+=n(ownerStats[x.ownerStat],'owner stat')*n(x.coefficient,'inheritance coefficient');}
 const candidates=petAbilityCandidates(build.classId,m.name,m.level),trained=new Set();
 for(const x of p.training??[]){const rank=candidates.find(a=>a.name===x.name&&a.passive);if(!rank||trained.has(x.name)||!Number.isSafeInteger(x.rank)||x.rank<1||rank.maxCandidateRank===null||x.rank>rank.maxCandidateRank||x.learnedConfirmed!==true)throw Error('Invalid passive pet training');trained.add(x.name);if(x.name!=='Great Stamina'||x.stat!=='health')throw Error('Unsupported passive training stat');base.health+=n(x.amount,'training health');}
 return base;
}
