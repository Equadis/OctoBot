import fs from 'node:fs';
import {reconcileBaseReferences} from '../../docs/sim/core/base-reference-reconciliation.mjs';
const report=reconcileBaseReferences();
fs.writeFileSync(process.argv[2]||'base-reference-reconciliation.json',JSON.stringify(report,null,2)+'\n');
console.log('BASE_RECONCILIATION_BEGIN'+JSON.stringify(report.totals)+'BASE_RECONCILIATION_END');
