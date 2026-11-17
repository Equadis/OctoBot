import fs from 'node:fs';import {parseCombatCaptures} from './combat-captures.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node tools/sim/review-combat-captures.mjs <saved-variable.lua> <output.json>');
const report=parseCombatCaptures(fs.readFileSync(input,'utf8'));
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sessions:report.sessions.length,complete:report.sessions.filter(s=>s.complete).length,rejected:report.rejected.length,normalized:false}));
if(!report.sessions.length||report.rejected.length||report.sessions.some(s=>!s.complete))process.exitCode=1;
