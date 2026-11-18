import fs from 'node:fs';
import {buildIntegrityQueue} from '../../docs/sim/core/data-integrity.mjs';
import {reconcileGuideSources} from '../../docs/sim/core/guide-source-reconciliation.mjs';
const report=buildIntegrityQueue();
report.guideCandidates=reconcileGuideSources(report);
fs.writeFileSync(process.argv[2]||'data-integrity-queue.json',JSON.stringify(report,null,2)+'\n');
console.log('DATA_INTEGRITY_BEGIN'+JSON.stringify({totals:report.totals,byClass:report.byClass})+'DATA_INTEGRITY_END');
