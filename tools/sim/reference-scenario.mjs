// Execute a locally authored, explicit reference scenario JSON. No live validation implied.
import {readFileSync,writeFileSync} from 'node:fs';
import {prepareReferenceScenario,runReferenceScenario} from '../../docs/sim/core/combat-reference-adapter.mjs';
const [input,output]=process.argv.slice(2);if(!input){console.error('Usage: node tools/sim/reference-scenario.mjs input.json [output.json]');process.exit(2);}
try{const config=JSON.parse(readFileSync(input,'utf8')),talents=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+config.build.classId+'.json',import.meta.url)));const {seed,iterations,...scenario}=config;const result=runReferenceScenario(prepareReferenceScenario({...scenario,talents}),{seed,iterations});const text=JSON.stringify(result,null,2)+'\n';if(output)writeFileSync(output,text);else process.stdout.write(text);}catch(e){console.error('Reference scenario rejected: '+e.message);process.exitCode=1;}
