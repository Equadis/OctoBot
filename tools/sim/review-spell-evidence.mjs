import fs from 'node:fs';
import {reviewSpellEvidence} from '../../docs/sim/core/spell-evidence-review.mjs';
if(!process.argv[2])throw new Error('Usage: node tools/sim/review-spell-evidence.mjs observations.json [report.json]');
const report=reviewSpellEvidence(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
fs.writeFileSync(process.argv[3]||'spell-evidence-review.json',JSON.stringify(report,null,2)+'\n');
