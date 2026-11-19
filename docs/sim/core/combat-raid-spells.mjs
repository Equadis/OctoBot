import {spellAttackTable} from './combat-attack-tables.mjs';
import {strongestCurseModifier} from './combat-curse-reference.mjs';
const schools=['fire','frost','shadow','arcane','nature','holy'];
export function raidSpellEntries(audit,policy){if(!policy)return [];if(policy.acknowledgeUnverified!==true)throw Error('Explicit raid spell policy required');return audit.entries.filter(e=>e.active&&['curse-shadow','curse-elements'].includes(e.id)).map(e=>({id:e.id,name:e.name,modifiers:schools.flatMap(s=>{const k=s[0].toUpperCase()+s.slice(1),v=e.stats['target'+k+'DamageTakenPct'],r=e.stats['target'+k+'Res'];return [...(v>0?[{stat:'curse:'+s+':damagePct',mode:'flat',value:v}]:[]),...(r<0?[{stat:'curse:'+s+':resistanceReduction',mode:'flat',value:-r}]:[])];})}));}
export function installRaidSpells(e,entries,owner,target,durationMs){for(const x of entries)e.auras.apply({id:'raid-spell:'+x.id,name:'Raid: '+x.name,ownerId:owner,targetId:target,kind:'debuff',durationMs:durationMs+1,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:x.modifiers});}
export function dynamicResistance(outcomes,auras,school,policy){const reduction=strongestCurseModifier(auras,'curse:'+school+':resistanceReduction');if(!policy||!reduction)return outcomes;
 const miss=outcomes.find(x=>x.name==='miss'),landed=outcomes.filter(x=>x.landed),total=landed.reduce((n,x)=>n+x.probability,0),crit=landed.find(x=>x.critical&&x.resistedFraction<1);if(!miss||!total||!crit||landed.some(x=>!Number.isFinite(x.resistedFraction)))throw Error('Dynamic resistance requires explicit ordinary spell table');
 const args={missPct:miss.probability*100,criticalPct:landed.filter(x=>x.critical).reduce((n,x)=>n+x.probability,0)/total*100,criticalMultiplier:crit.multiplier/(1-crit.resistedFraction),resistancePolicy:policy.resistancePolicy,provenance:policy.provenance};
 const base=spellAttackTable({...args,resistanceModel:policy.model}).outcomes;
 if(base.length!==outcomes.length||base.some(x=>!outcomes.some(y=>x.name===y.name&&Math.abs(x.probability-y.probability)<1e-7&&Math.abs(x.multiplier-y.multiplier)<1e-7)))throw Error('Dynamic resistance baseline differs from compiled spell outcomes');
 return spellAttackTable({...args,resistanceModel:{...policy.model,rating:Math.max(0,policy.model.rating-reduction)}}).outcomes;
}
