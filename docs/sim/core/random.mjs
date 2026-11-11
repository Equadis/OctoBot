/** Mulberry32, isolated per iteration. Never replace global Math.random. */
export function random(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Seed must be an unsigned 32-bit integer');
  }
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Independent iteration streams make results invariant to worker partitioning. */
export function iterationSeed(seed, index) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff ||
      !Number.isSafeInteger(index) || index < 0 || index > 0xffffffff) {
    throw new RangeError('Seed and iteration index must be unsigned 32-bit integers');
  }
  let value = (seed ^ index) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}
