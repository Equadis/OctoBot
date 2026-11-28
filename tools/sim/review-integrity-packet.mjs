import fs from 'node:fs';
import {integrityResolution} from '../../docs/sim/core/integrity-resolution.mjs';
if(!process.argv[2])throw new Error('Usage: node tools/sim/review-integrity-packet.mjs packet.json [output.json]');
const report=integrityResolution(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
fs.writeFileSync(process.argv[3]||'integrity-resolution.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.totals));
