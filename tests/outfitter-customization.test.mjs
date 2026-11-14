import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitiseLook,visibleOptions,selectedChoice,lookPairs,stepLook,choiceLabel} from '../docs/outfitter/customization.mjs';
import {emptyOutfit,normalise,encode,decode,exportTmog,importTmog} from '../docs/outfitter/state.mjs';

const customization={Options:[
  {Id:11,Name:'Hair Style',OrderIndex:3,Choices:[{Id:17185,OrderIndex:1},{Id:17184,OrderIndex:0},{Id:17186,OrderIndex:2,Name:'Braids'}]},
  {Id:9,Name:'Skin Color',OrderIndex:1,Choices:[{Id:5,OrderIndex:0},{Id:6,OrderIndex:1}]},
  {Id:99,Name:'Empty',OrderIndex:0,Choices:[]},
]};

test('only options that have choices are offered, in the library order, with choices in order',()=>{
  const options=visibleOptions(customization);
  assert.deepEqual(options.map(o=>o.name),['Skin Color','Hair Style']);
  assert.deepEqual(options[1].choices.map(c=>c.id),[17184,17185,17186]);
  assert.deepEqual(visibleOptions(null),[]);
});

test('unset options use the first choice; a saved choice that no longer exists falls back safely',()=>{
  const options=visibleOptions(customization);
  assert.deepEqual(lookPairs(options,{}),[{optionId:9,choiceId:5},{optionId:11,choiceId:17184}]);
  assert.deepEqual(lookPairs(options,{11:17186,9:123456}),[{optionId:9,choiceId:5},{optionId:11,choiceId:17186}]);
  assert.equal(selectedChoice(options[0],{9:6}).id,6);
});

test('stepping wraps at both ends, labels show position and name, other options are untouched',()=>{
  const options=visibleOptions(customization);
  let look=stepLook(options,{},11,-1);assert.equal(look[11],17186); // wraps backwards
  look=stepLook(options,look,11,1);assert.equal(look[11],17184);    // wraps forwards
  look=stepLook(options,{9:6},11,1);assert.equal(look[9],6);
  assert.equal(choiceLabel(options[1],{11:17186}),'Braids · 3 / 3');
  assert.equal(choiceLabel(options[0],{}),'1 / 2');
  assert.deepEqual(stepLook(options,{9:6},777,1),{9:6}); // unknown option is ignored
});

test('stored appearances are sanitised and cannot carry anything but id pairs',()=>{
  assert.deepEqual(sanitiseLook({11:17185,'x':3,12:'a',13:-4,14:1.5,15:null}),{11:17185});
  assert.deepEqual(sanitiseLook([1,2]),{});
  assert.deepEqual(sanitiseLook(undefined),{});
  const many=Object.fromEntries(Array.from({length:40},(_,i)=>[i+1,i+1]));
  assert.equal(Object.keys(sanitiseLook(many)).length,16);
});

test('appearance travels with saved and shared outfits; older outfits and Tmog codes are unaffected',()=>{
  assert.deepEqual(emptyOutfit().look,{});
  const outfit={...emptyOutfit(),race:4,gender:1,gear:{1:16908},look:{8:111,9:222}};
  assert.deepEqual(decode(encode(outfit)).look,{8:111,9:222});
  assert.deepEqual(normalise({race:2,gender:0,gear:{}}).look,{}); // an outfit saved before appearance existed
  assert.equal(exportTmog(outfit),'T.O.L.1:16908;');              // Tmog codes only carry equipment
  assert.deepEqual(importTmog('T.O.L.1:16908;').look,{});
});
