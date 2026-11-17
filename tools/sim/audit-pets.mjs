import fs from 'node:fs';import {petInventory,petProfile} from '../../docs/sim/core/pet-audit.mjs';import {newBuild} from '../../docs/sim/core/builds.mjs';
const report=petInventory();
report.profiles=Object.entries(report.catalogue).flatMap(([cls,pets])=>Object.keys(pets).map(pet=>{const b=newBuild(cls);b.classOptions.pet=pet;return {classId:cls,...petProfile(b,{talents:[]})};}));
console.log('PET_AUDIT_BEGIN'+JSON.stringify({configuredTypes:report.configuredTypes,verifiedBaseTables:report.verifiedBaseTables,liveValidatedTypes:report.liveValidatedTypes})+'PET_AUDIT_END');fs.writeFileSync('pet-audit.json',JSON.stringify(report,null,2));
