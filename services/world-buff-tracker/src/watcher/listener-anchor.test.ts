import { describe, expect, it } from "vitest";
import type { WorldPoint } from "../protocol/update-object.js";
import { anchorFrom, hasMoved, nearestDoodads } from "./listener-anchor.js";

const P = (x: number, y: number, z = 0): WorldPoint => ({ x, y, z });

describe("nearestDoodads", () => {
  it("keeps the n doodads closest to the parked spot", () => {
    const parked = P(0, 0);
    const doodads = [P(100, 0), P(5, 0), P(50, 0), P(3, 0), P(200, 0)];
    expect(nearestDoodads(parked, doodads, 3)).toEqual([P(3, 0), P(5, 0), P(50, 0)]);
  });
  it("returns all of them when there are fewer than n", () => {
    expect(nearestDoodads(P(0, 0), [P(1, 0), P(2, 0)], 3)).toHaveLength(2);
  });
});

describe("anchorFrom", () => {
  it("captures the parked position and the 3 nearest doodads by default", () => {
    const anchor = anchorFrom(P(0, 0), [P(1, 0), P(2, 0), P(3, 0), P(99, 0)]);
    expect(anchor.parked).toEqual(P(0, 0));
    expect(anchor.doodads).toEqual([P(1, 0), P(2, 0), P(3, 0)]);
  });
});

describe("hasMoved", () => {
  const anchor = anchorFrom(P(0, 0), [P(2, 0), P(-2, 0), P(0, 2)]); // parked among 3 close doodads
  const THRESHOLD = 40;

  it("is false while the character is still among its doodads", () => {
    expect(hasMoved(P(1, 1), anchor, THRESHOLD)).toBe(false); // right where it was parked
    expect(hasMoved(P(10, 10), anchor, THRESHOLD)).toBe(false); // a little jitter, still near
  });

  it("is true once it is beyond the threshold from every doodad (moved / graveyard)", () => {
    expect(hasMoved(P(500, 500), anchor, THRESHOLD)).toBe(true);
  });

  it("stays false if it's still close to even one doodad", () => {
    // 100 yd from two doodads but sitting right on the third — not moved off the spot.
    const spread = anchorFrom(P(0, 0), [P(0, 0), P(200, 0), P(-200, 0)]);
    expect(hasMoved(P(1, 0), spread, THRESHOLD)).toBe(false);
  });

  it("never fires without a reference (empty anchor)", () => {
    expect(hasMoved(P(999, 999), { parked: P(0, 0), doodads: [] }, THRESHOLD)).toBe(false);
  });
});
