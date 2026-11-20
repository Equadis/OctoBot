import {petAbilityCandidates} from './pet-training-audit.mjs';
const n=(v,k)=>{if(!Number.isFinite(v)||v<0)throw Error('Invalid pet '+k);return v;};
// All values are explicit observed/reference inputs; no automatic custom rates.
export function resolvePetStats(build,m,ownerStats){
 const base={health:n(m.health,'health'),attackPower:n(m.attackPower,'attack power'),spellPower:n(m.spellPower,'spell power')};
 const defensive=['armour','arcaneResistance','fireResistance','frostResistance','natureResistance','shadowResistance'];for(const k of defensive)if(m[k]!==undefined)base[k]=n(m[k],k);
 const p=m.statPolicy;if(p===undefined)return base;
 if(!p||!['included','apply'].includes(p.mode)||typeof p.provenance!=='string'||!p.provenance.trim())throw Error('Explicit pet stat policy required');
 if(p.mode==='included'){if(p.inheritance||p.training?.length)throw Error('Included pet stats cannot apply additional modifiers');return base;}
 const allowed=new Set(['health','attackPower','spellPower',...defensive]),seen=new Set();
 for(const x of p.inheritance??[]){if(!allowed.has(x.stat)||seen.has(x.stat)||!Object.hasOwn(ownerStats??{},x.ownerStat))throw Error('Invalid pet inheritance mapping');seen.add(x.stat);if(!Object.hasOwn(base,x.stat))throw Error('Explicit pet defensive baseline required');base[x.stat]+=n(ownerStats[x.ownerStat],'owner stat')*n(x.coefficient,'inheritance coefficient');}
 const candidates=petAbilityCandidates(build.classId,m.name,m.level),trained=new Set();
 for(const x of p.training??[]){const rank=candidates.find(a=>a.name===x.name&&a.passive);if(!rank||trained.has(x.name)||!Number.isSafeInteger(x.rank)||x.rank<1||rank.maxCandidateRank===null||x.rank>rank.maxCandidateRank||x.learnedConfirmed!==true)throw Error('Invalid passive pet training');trained.add(x.name);const stat=x.name==='Great Stamina'?'health':x.name==='Natural Armor'?'armour':x.name.endsWith(' Resistance')?x.name.split(' ')[0].toLowerCase()+'Resistance':null;if(!stat||x.stat!==stat||!Object.hasOwn(base,stat))throw Error('Unsupported passive training stat or missing baseline');base[stat]+=n(x.amount,'training '+stat);}
 return base;
}

// Static pet-specific equipped bonuses are separate from owner stat inheritance.
const petStats=new Set(['attackPower','healthPct','damagePct','armourPct','critPct']);
export function petEquipmentEffectKey(row){
 const condition=row.condition??{};
 if(row.scope==='Pet'&&condition.pet===true&&Object.keys(condition).length===1&&petStats.has(row.stat))return row.stat;
 if(row.scope==="Imp's Firebolt"&&row.stat==='flatDamage'&&!Object.keys(condition).length)return 'fireboltFlatDamage';
 return null;
}

export function petEquipmentModifiers(rows,policy,{usesImpFirebolt=false}={}){
 const active=rows.filter(row=>row.active).map(row=>[row,petEquipmentEffectKey(row)])
  .filter(([,key])=>key&&(key!=='fireboltFlatDamage'||usesImpFirebolt));
 const result={attackPower:0,healthPct:0,damagePct:0};
 if(!active.length)return result;
 if(!policy||!['included','apply'].includes(policy.mode)||typeof policy.provenance!=='string'||!policy.provenance.trim())throw Error('Explicit pet equipment inclusion policy required');
 if(policy.mode==='apply'){
  for(const [row,key] of active)result[key]=(result[key]??0)+n(row.amount,'equipment '+key);
 }
 return result;
}
