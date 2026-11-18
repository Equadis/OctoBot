import fs from 'node:fs';
import {buildIntegrityQueue} from '../../docs/sim/core/data-integrity.mjs';
const report=buildIntegrityQueue();
fs.writeFileSync(process.argv[2]||'data-integrity-queue.json',JSON.stringify(report,null,2)+'\n');
console.log('DATA_INTEGRITY_BEGIN'+JSON.stringify({totals:report.totals,byClass:report.byClass})+'DATA_INTEGRITY_END');
