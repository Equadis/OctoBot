import fs from 'node:fs';
import {reviewBaseEvidence} from '../../docs/sim/core/evidence-review.mjs';
if(!process.argv[2])throw new Error('Usage: node tools/sim/review-base-evidence.mjs observations.json [report.json]');
const report=reviewBaseEvidence(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
fs.writeFileSync(process.argv[3]||'base-evidence-review.json',JSON.stringify(report,null,2)+'\n');
