import { describe, expect, it } from "vitest";
import { unitRef } from "./guid.js";

describe("unitRef", () => {
  it("recognises a player by its empty high part", () => {
    expect(unitRef(0x0000_0000_0012_3456n)).toEqual({ kind: "player" });
  });

  it("reads a creature's entry out of its guid", () => {
    expect(unitRef(0xf130_000c_9300_0042n)).toEqual({ kind: "creature", entry: 0x0c93 });
  });

  it("reads a pet's entry the same way", () => {
    expect(unitRef(0xf140_0004_1d00_0007n)).toEqual({ kind: "pet", entry: 0x041d });
  });

  it("does not take the empty guid or another object type for a unit", () => {
    expect(unitRef(0n)).toEqual({ kind: "other" });
    expect(unitRef(0xf110_0000_0000_0001n)).toEqual({ kind: "other" });
  });
});
