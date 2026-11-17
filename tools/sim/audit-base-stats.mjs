import fs from 'node:fs';
import {baseStatInventory,BASE_STAT_SOURCE} from '../../docs/sim/core/base-stat-audit.mjs';
const report=baseStatInventory();
console.log('BASE_STAT_AUDIT_BEGIN'+JSON.stringify(report.totals)+'BASE_STAT_AUDIT_END');
fs.writeFileSync('base-stat-audit.json',JSON.stringify({source:BASE_STAT_SOURCE,...report},null,2));
