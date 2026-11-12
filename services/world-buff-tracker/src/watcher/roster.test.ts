import { describe, expect, it, vi } from "vitest";
import type { WhoPlayer } from "../protocol/who.js";
import { CLASS_BUCKETS, CLASS_IDS, fetchRoster, type WhoFn } from "./roster.js";

function player(name: string, classId: number): WhoPlayer {
  return { name, guild: "", level: 60, classId, raceId: 1, areaId: 2159 };
}
/** Which classes a (possibly combined) classMask selects. */
const classesInMask = (mask: number | undefined): number[] =>
  mask == null ? [] : CLASS_IDS.filter((c) => (mask & (1 << (c - 1))) !== 0);

/**
 * A `who` that caps every response at 49 (like the server) and answers a class-filtered query from
 * `all`. A combined-bucket mask returns players of ANY class in it. `onReject` fails a query for the
 * given classes (a timeout).
 */
function slicingWho(all: WhoPlayer[], onReject?: (classes: number[]) => boolean): ReturnType<typeof vi.fn<WhoFn>> {
  return vi.fn<WhoFn>(async (q) => {
    if (q.classMask == null) return { players: all.slice(0, 49), onlineCount: all.length };
    const classes = classesInMask(q.classMask);
    if (onReject?.(classes)) throw new Error("/who timed out after 8000ms");
    const matched = all.filter((p) => classes.includes(p.classId));
    return { players: matched.slice(0, 49), onlineCount: all.length };
  });
}
const roster60 = () => Array.from({ length: 60 }, (_, i) => player(`p${i}`, CLASS_IDS[i % CLASS_IDS.length]!));

describe("fetchRoster", () => {
  it("does a single query and does not slice when under the cap", async () => {
    const players = Array.from({ length: 20 }, (_, i) => player(`p${i}`, 1));
    const who = vi.fn<WhoFn>().mockResolvedValue({ players, onlineCount: 20 });
    const r = await fetchRoster(who, 2159);
    expect(r.sliced).toBe(false);
    expect(r.complete).toBe(true);
    expect(r.failedSlices).toBe(0);
    expect(r.players).toHaveLength(20);
    expect(who).toHaveBeenCalledTimes(1);
  });

  it("slices by class-BUCKET (3 queries, not 9) and merges past the 49 cap", async () => {
    const who = slicingWho(roster60());
    const r = await fetchRoster(who, 2159);
    expect(r.sliced).toBe(true);
    expect(r.complete).toBe(true);
    expect(r.players).toHaveLength(60);
    // base + one query per bucket (3), NOT one per class (9) — the whole point of the change.
    expect(who).toHaveBeenCalledTimes(1 + CLASS_BUCKETS.length);
    expect(CLASS_BUCKETS.length).toBe(3);
  });

  it("sub-slices a bucket that itself comes back capped (an extreme zerg) into its classes", async () => {
    // 55 of one class (in bucket [1,2,3]) makes the combined bucket query hit the cap.
    const warriors = Array.from({ length: 55 }, (_, i) => player(`w${i}`, 1));
    const who = slicingWho(warriors);
    const r = await fetchRoster(who, 2159);
    expect(r.complete).toBe(false); // one class alone exceeds 49 — genuinely can't be completed
    expect(r.failedSlices).toBe(0);
    // base + bucket[1,2,3] (capped) + its 3 class sub-slices + the other 2 buckets = 1+1+3+2 = 7.
    expect(who).toHaveBeenCalledTimes(1 + 1 + 3 + 2);
  });

  it("keeps a PARTIAL roster when a bucket query times out", async () => {
    const who = slicingWho(roster60(), (classes) => classes.includes(4)); // bucket [4,5,7] fails
    const r = await fetchRoster(who, 2159);
    expect(r.failedSlices).toBe(1);
    expect(r.complete).toBe(false);
    expect(r.players.length).toBeGreaterThanOrEqual(49); // base + the buckets that answered, kept
  });

  it("counts every failed bucket", async () => {
    const who = slicingWho(roster60(), (classes) => classes.length > 0); // every bucket query times out
    const r = await fetchRoster(who, 2159);
    expect(r.failedSlices).toBe(CLASS_BUCKETS.length); // all 3 buckets failed
    expect(r.complete).toBe(false);
  });
});
