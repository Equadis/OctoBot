import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhisperPool } from "./whisper-pool.js";
import { WhisperQueue } from "./whisper-queue.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("WhisperPool", () => {
  it("splits targets evenly across members, the alert's faction first", () => {
    const a: string[] = [];
    const b: string[] = [];
    const pool = new WhisperPool();
    pool.register("Buffsw", "alliance", new WhisperQueue((t) => a.push(t), 1000));
    pool.register("Buffog", "horde", new WhisperQueue((t) => b.push(t), 1000));

    const used = pool.fanOut(["1", "2", "3", "4"], "park now", "alliance");
    expect(used).toBe(2);
    vi.advanceTimersByTime(5000);
    // alliance member sorted first → gets targets 0,2; the other gets 1,3.
    expect(a).toEqual(["1", "3"]);
    expect(b).toEqual(["2", "4"]);
  });

  it("uses the whole pool even when no faction is given", () => {
    const a: string[] = [];
    const b: string[] = [];
    const pool = new WhisperPool();
    pool.register("X", null, new WhisperQueue((t) => a.push(t), 1000));
    pool.register("Y", null, new WhisperQueue((t) => b.push(t), 1000));
    pool.fanOut(["1", "2", "3"], "m");
    vi.advanceTimersByTime(5000);
    expect(a.length + b.length).toBe(3);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });

  it("dropForFaction purges stale park alerts across every member", () => {
    const a: string[] = [];
    const b: string[] = [];
    const pool = new WhisperPool();
    pool.register("X", null, new WhisperQueue((t) => a.push(t), 1000));
    pool.register("Y", null, new WhisperQueue((t) => b.push(t), 1000));
    // A park alert for alliance, fanned across both members (targets 0..3).
    pool.fanOut(["1", "2", "3", "4"], "park SW", "alliance", { cities: ["alliance"] });
    const dropped = pool.dropForFaction("alliance"); // alliance buff dropped
    expect(dropped).toBeGreaterThan(0); // pending ones across both members purged
    vi.advanceTimersByTime(5000);
    // Only the first each member sent immediately survive; the rest were dropped.
    expect(a.length + b.length).toBeLessThan(4);
  });

  it("returns 0 (caller falls back) when the pool is empty, and drops a member on unregister", () => {
    const pool = new WhisperPool();
    expect(pool.fanOut(["1"], "m")).toBe(0);
    pool.register("X", null, new WhisperQueue(() => {}, 1000));
    expect(pool.size).toBe(1);
    pool.unregister("X");
    expect(pool.size).toBe(0);
    expect(pool.fanOut(["1"], "m")).toBe(0);
  });
});
