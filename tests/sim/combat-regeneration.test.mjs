import test from 'node:test';import assert from 'node:assert/strict';
import {regenerationAmount,validateRegenPolicy} from '../../docs/sim/core/combat-regeneration.mjs';
const r={resource:'mana',amount:20,fiveSecondRule:{windowMs:5000,insideAmount:5}};
test('explicit regen is reduced only within the configured spend window',()=>{assert.equal(regenerationAmount(r,0,null),20);assert.equal(regenerationAmount(r,0,0),5);assert.equal(regenerationAmount(r,4999,0),5);assert.equal(regenerationAmount(r,5000,0),20);assert.equal(regenerationAmount(r,8000,7000),5);assert.equal(regenerationAmount({resource:'energy',amount:20},0,0),20);assert.throws(()=>validateRegenPolicy({...r,resource:'energy'}));});
