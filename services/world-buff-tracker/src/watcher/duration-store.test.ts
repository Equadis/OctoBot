import { describe, expect, it, vi } from "vitest";
import {
  InMemoryDurationStore,
  MongoDurationStore,
  isPlausibleClear,
  medianOf,
  durationLearningPipeline,
  type DurationDb,
  type RaidDuration,
} from "./duration-store.js";

const dur = (ms: number): RaidDuration => ({ ms, ts: new Date() });
const MIN = 60_000;

describe("isPlausibleClear", () => {
  const floor = 10 * MIN;
  it("rejects a clear shorter than the floor as churn", () => {
    expect(isPlausibleClear(4 * MIN, floor)).toBe(false);
    expect(isPlausibleClear(0, floor)).toBe(false);
  });
  it("accepts a clear at or above the floor as a real raid", () => {
    expect(isPlausibleClear(10 * MIN, floor)).toBe(true);
    expect(isPlausibleClear(42 * MIN, floor)).toBe(true);
  });
});

describe("medianOf", () => {
  it("returns the middle of an odd set and the mean of the two middles for an even set", () => {
    expect(medianOf([50, 40, 60])).toBe(50);
    expect(medianOf([40, 60])).toBe(50);
    expect(medianOf([])).toBeNull();
  });
  it("is unmoved by an outlier that would drag the mean up", () => {
    expect(medianOf([40, 45, 50, 55, 600])).toBe(50); // mean would be ~158
  });
});

describe("InMemoryDurationStore", () => {
  it("returns null until minSamples are recorded, then the median", async () => {
    const store = new InMemoryDurationStore();
    for (const m of [40, 50, 60]) await store.record(dur(m));
    expect(await store.median(5)).toBeNull(); // only 3 < 5
    expect(await store.median(3)).toBe(50);
    expect(await store.count()).toBe(3);
  });
});

describe("MongoDurationStore", () => {
  function fakeDb(): DurationDb & { docs: RaidDuration[] } {
    const docs: RaidDuration[] = [];
    return {
      docs,
      insert: vi.fn(async (doc) => {
        docs.push({ ms: doc.ms, ts: doc.ts });
      }),
      recent: vi.fn(async (limit: number) =>
        [...docs].sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, limit).map((d) => ({ ms: d.ms, ts: d.ts })),
      ),
      count: vi.fn(async () => docs.length),
      close: vi.fn(async () => {}),
    };
  }

  it("records durations and computes the median once enough exist", async () => {
    const store = new MongoDurationStore(fakeDb());
    for (const m of [42, 48, 51, 55, 70]) await store.record(dur(m));
    expect(await store.median(10)).toBeNull();
    expect(await store.median(5)).toBe(51);
  });
});


it("retracts a resumed raid sample and replaces it on the next valid completion", async () => {
  const store = new InMemoryDurationStore();
  await store.record({ms:20*MIN,ts:new Date(),sessionKey:"n7",valid:true});
  await store.invalidate("n7"); expect(await store.count()).toBe(0);
  await store.record({ms:40*MIN,ts:new Date(),sessionKey:"n7",valid:true});
  expect(await store.count()).toBe(1);expect(await store.median(1)).toBe(40*MIN);
});

it("Mongo selects the newest keyed revision before filtering valid samples",()=>{
  const pipeline=durationLearningPipeline();
  const group=pipeline.findIndex(p=>"$group" in p);
  const valid=pipeline.findIndex(p=>Boolean((p.$match as {valid?:boolean}|undefined)?.valid));
  expect(group).toBeGreaterThan(0);
  expect(valid).toBeGreaterThan(group);
  expect(pipeline[group]).toMatchObject({$group:{_id:"$sessionKey",valid:{$first:"$valid"},ms:{$first:"$ms"}}});
});
