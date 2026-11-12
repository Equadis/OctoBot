// Independently modelled from UI experiments, Combat Gum Alpha v3.01, 2026-11-12.
// See data/reference/combatgum-buff-observations.json. This is a planning baseline,
// not proof of OctoWoW server behaviour. Last selection wins, including imports.
const exclusive=(...ids)=>ids.flatMap((a,i)=>ids.slice(i+1).map(b=>[a,b]));
export const BUFF_CONFLICTS=Object.freeze([
 ...exclusive('mongoose','greater-agility','emerald-mongoose'),
 ['emerald-mongoose','dreamshard'],
 ...exclusive('firewater','juju-might','dreamwater'),
 ...exclusive('giants','juju-power','arcane-giant'),
 ['giants','brute-force'],['arcane-giant','greater-arcane'],['dreamwater','dreamtonic'],
 ...exclusive('chili','medley','berry','skewer','carrots','chimaerek','fishe'),
 ['merlot','rum'],['expose','sunder'],['annihilator','shartateth'],
].map(pair=>Object.freeze(pair)));
export function selectBuff(ids,id,enabled=true){
 const next=ids.filter(selected=>selected!==id&&(!enabled||!BUFF_CONFLICTS.some(pair=>pair.includes(id)&&pair.includes(selected))));
 if(enabled)next.push(id);return next;
}
export function normaliseBuffs(ids){return ids.reduce((selected,id)=>selectBuff(selected,id),[]);}
// Percentage values use percentage points; haste is combined multiplicatively.
export const BUFF_STATS=Object.freeze({
 'battle-shout':{ap:232},might:{ap:222},wild:{str:12,agi:12,sta:12},pack:{crit:3},earth:{str:96},air:{agi:96},trueshot:{ap:30,apMultiplier:1.03},tricks:{crit:4},
 mongoose:{agi:25,crit:2},'greater-agility':{agi:25},scorpok:{agi:25},firewater:{ap:35},'juju-might':{ap:40},giants:{str:25},'juju-power':{str:30},dreamshard:{sp:15,spellCrit:2},
 'emerald-mongoose':{sp:15,agi:25,crit:2,spellCrit:2},dreamwater:{sp:35,ap:35},'arcane-giant':{sp:35,str:25},'brute-force':{str:18,sta:18},
 'supreme-power':{sp:150},dreamtonic:{sp:35},'greater-arcane':{sp:35},'nature-power':{natureSp:55},firepower:{fireSp:40},
 'wizard-oil-mh':{sp:36,spellCrit:1},'wizard-oil-oh':{sp:36,spellCrit:1},
 medley:{haste:2},berry:{agi:10},skewer:{agi:20},carrots:{ap:32},chimaerek:{dodge:2,sta:30},fishe:{dodge:1,defense:4},merlot:{sta:25},rum:{sta:15},flurry:{haste:1},quickness:{haste:1.25},
 expose:{targetArmour:-2550},sunder:{targetArmour:-2250},eskhandar:{targetArmour:-1200},recklessness:{targetArmour:-640},faerie:{targetArmour:-505},'wind-serpent':{targetArmour:-400},annihilator:{targetArmour:-300},shartateth:{targetArmour:-250},ripper:{targetArmour:-163},'skill-book':{weaponSkill:5}
});
