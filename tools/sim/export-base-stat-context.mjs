// Prints the repo's own view of the base-stat audit as JSON, for tools/sim/verify-base-stats.py.
import {baseStatInventory} from '../../docs/sim/core/base-stat-audit.mjs';
import {buildIntegrityQueue} from '../../docs/sim/core/data-integrity.mjs';
const inv=baseStatInventory(),q=buildIntegrityQueue();
const byClass=Object.fromEntries(q.byClass.map(c=>[c.classId,c.conflictingAbilities]));
console.log(JSON.stringify({
 allCombinations:inv.combinations.map(c=>c.race+':'+c.classId).sort(),
 flaggedAnomalies:inv.combinations.flatMap(c=>c.anomalies.map(a=>[c.race,c.classId,a.level])),
 outOfScope:[
  `The "76 conflicting source-data records" in the handoff are ${q.totals.conflictingAbilities} abilities with source-conflicting spell-rank data (${q.totals.conflictingRankRows} rank rows), not base stats. By class: ${Object.entries(byClass).map(([c,n])=>c+' '+n).join(', ')}. They need controlled spell measurements and are untouched here.`,
  'Known Mage and Priest level-60 health and mana differences between CMaNGOS and WoWSims Turtle are recorded as todo tests in tests/sim/reference-parity.test.mjs; neither source is OctoWoW.',
  'Third-party Combat Gum figures for Goblin and High Elf Rogue (77/132/75 and 77/135/73) appear in tests/sim/reference-parity.test.mjs; they are unverified and were not imported.'
 ]
},null,1));
