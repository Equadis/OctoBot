import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BUFF_GROUPS,BUFF_OPTIONS,ROTATION_PRESETS,defaultControls,validateControls} from '../../docs/sim/core/configuration.mjs';
import {newBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
const data=JSON.parse(await readFile(new URL('../../docs/sim/data/talents/warrior.json',import.meta.url)));

test('buff selections, rotation priorities and conditions survive saved/shared builds',()=>{
 const preset=ROTATION_PRESETS.find(p=>p.id==='fury-dual');
 const build={...newBuild(),controls:{...defaultControls(),buffIds:['battle-shout','kings','sunder'],rotationPreset:preset.id,rotationRows:structuredClone(preset.rows),keyInterval:150,variabilityMs:20}};
 assert.deepEqual(decodeBuild(encodeBuild(build),data),build);
 assert.equal(new Set(BUFF_OPTIONS.map(b=>b.id)).size,BUFF_OPTIONS.length);
 assert.deepEqual(BUFF_GROUPS.map(g=>g.name),['Raid Buffs','Consumables','Other Consumables','SP Consumables','Food Buffs','Drink Buffs','Short Duration Consumables','Target Debuffs','Other']);
});

test('configuration rejects malformed rows, unknown buffs, invalid timing and unsafe values',()=>{
 for(const patch of [{buffIds:['unrecognised']},{rotationPreset:'rogue'},{rotationRows:[{ability:'Unknown',conditions:[]}]},{rotationRows:[{ability:'Execute',conditions:[{metric:'rage',operator:'>=',value:NaN,aura:''}]}]},{keyInterval:0},{variabilityMs:-1},{rotationRows:Array(31).fill({ability:'Execute',conditions:[]})}])assert.throws(()=>validateControls({...defaultControls(),...patch}));
 assert.deepEqual(validateControls({...defaultControls(),buffIds:['kings','kings']}).buffIds,['kings']);
});

test('every official talent has a complete rank-specific effect description',()=>{
 for(const talent of data.talents){assert.equal(talent.descriptions.length,talent.maxRanks);assert.ok(talent.descriptions.every(text=>text.length>10&&!text.includes('$L')));}
 const strike=data.talents.find(t=>t.name==='Improved Heroic Strike');
 assert.match(strike.descriptions[0],/1 rage/);assert.match(strike.descriptions[2],/3 rage/);
});
