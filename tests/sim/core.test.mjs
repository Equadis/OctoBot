import test from 'node:test';
import assert from 'node:assert/strict';
import { EventQueue } from '../../docs/sim/core/events.mjs';
import { random, iterationSeed } from '../../docs/sim/core/random.mjs';

test('event ordering remains chronological, stable, and priority-aware', () => {
  const queue = new EventQueue();
  queue.schedule(10, 'swing');
  queue.schedule(10, 'aura-expiry', null, -1);
  queue.schedule(5, 'resource-tick');
  queue.schedule(10, 'decision');
  assert.deepEqual(Array.from({ length: 4 }, () => queue.next().type),
    ['resource-tick', 'aura-expiry', 'swing', 'decision']);
  assert.equal(queue.next(), null);
  assert.equal(queue.size, 0);
});

test('heap agrees with a stable sort for 10,000 out-of-order events', () => {
  const rng = random(17), queue = new EventQueue(), events = [];
  for (let sequence = 0; sequence < 10000; sequence++) {
    const event = { time: Math.floor(rng() * 1000), priority: Math.floor(rng() * 3), sequence };
    events.push(event);
    queue.schedule(event.time, 'test', sequence, event.priority);
  }
  events.sort((a, b) => a.time - b.time || a.priority - b.priority || a.sequence - b.sequence);
  assert.deepEqual(events.map(event => event.sequence), events.map(() => queue.next().payload));
});

test('handlers can schedule at the current time but cannot travel backwards', () => {
  const queue = new EventQueue();
  queue.schedule(9, 'initial');
  queue.next();
  queue.schedule(9, 'follow-up');
  assert.throws(() => queue.schedule(8, 'invalid'), RangeError);
  assert.equal(queue.next().time, 9);
  for (const time of [NaN, Infinity, -1, 0.5]) assert.throws(() => queue.schedule(time, 'invalid'));
  queue.clear();
  queue.schedule(0, 'new-encounter');
  assert.equal(queue.next().time, 0);
});

test('seed zero works and the generator has a pinned reproducible sequence', () => {
  const rng = random(0);
  assert.deepEqual(Array.from({ length: 3 }, rng),
    [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197]);
  for (const seed of [-1, 0.5, NaN, Infinity, 0x100000000]) assert.throws(() => random(seed));
});

test('1,000 iteration streams are independent of worker partition and execution order', () => {
  const sample = index => Array.from({ length: 4 }, random(iterationSeed(123, index)));
  const sequential = Array.from({ length: 1000 }, (_, index) => sample(index));
  const partitioned = [];
  for (let worker = 3; worker >= 0; worker--) {
    for (let index = worker; index < 1000; index += 4) partitioned[index] = sample(index);
  }
  assert.deepEqual(partitioned, sequential);
  assert.equal(new Set(sequential.map(row => row[0])).size, 1000);
});
