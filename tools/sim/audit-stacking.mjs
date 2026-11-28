import fs from 'node:fs';import {stackingInventory} from '../../docs/sim/core/consumables.mjs';
const r=stackingInventory();console.log('STACKING_AUDIT_BEGIN'+JSON.stringify({groups:Object.keys(r.groups).length,explicitPairs:r.explicitPairs.length,referencePairs:r.referencePairs.length,identicalPairs:r.identicalPairs.length,sharedPairs:r.sharedPairs.length,sharedBuffReferencePairs:r.sharedBuffReferencePairs.length,liveVerifiedPairs:r.liveVerifiedPairs})+'STACKING_AUDIT_END');
fs.writeFileSync('stacking-audit.json',JSON.stringify(r,null,2));
