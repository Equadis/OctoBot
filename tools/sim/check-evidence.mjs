import { readFile } from 'node:fs/promises';

const file = new URL('../../docs/sim/data/warrior-evidence.json', import.meta.url);
const evidence = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(evidence.requiredMechanics) || evidence.requiredMechanics.length === 0) {
  throw new Error('The required-mechanic evidence list must not be empty');
}
const unresolved = evidence.requiredMechanics.filter(mechanic =>
  mechanic.status !== 'confirmed' || !Array.isArray(mechanic.sources) ||
  !mechanic.sources.length || !mechanic.notes);
if (unresolved.length) {
  console.error(`Warrior ruleset release blocked: ${unresolved.length} unresolved mechanics.`);
  for (const mechanic of unresolved) console.error(`- ${mechanic.id}: ${mechanic.status}`);
  process.exitCode = 1;
} else {
  console.log('Required Warrior evidence is recorded. Class numerical/UI acceptance still required.');
}
