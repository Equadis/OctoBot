import { describe, expect, it } from "vitest";
import type { UnitOwnerChange } from "./update-object.js";
import { UnitOwnerTable } from "./unit-owner.js";

const WARLOCK = 0x1234n;
const PRIEST = 0x5678n;
const HUNTER = 0x9abcn;
const INFERNAL = 0xf130_0000_5900_0abcn;
const WOLF = 0xf140_0000_2d00_0001n;
const GRUNT = 0xf130_000c_9300_0042n;

/** The words a 64-bit owner field is sent as, low word first. */
function owner(field: number, guid: bigint): [number, number][] {
  return [
    [field, Number(guid & 0xffff_ffffn)],
    [field + 1, Number(guid >> 32n)],
  ];
}

const create = (guid: bigint, words: [number, number][] = []): UnitOwnerChange => ({
  kind: "create",
  guid,
  words: new Map(words),
});
const values = (guid: bigint, words: [number, number][]): UnitOwnerChange => ({
  kind: "values",
  guid,
  words: new Map(words),
});

describe("UnitOwnerTable", () => {
  it("knows who holds a unit from the moment it comes into view", () => {
    const table = new UnitOwnerTable();
    table.apply(create(INFERNAL, owner(10, WARLOCK)));
    expect(table.ownerOf(INFERNAL)).toEqual({ relation: "controlled", guid: WARLOCK, current: true });
  });

  it("names a pet's summoner and a guardian's creator", () => {
    const table = new UnitOwnerTable();
    table.apply(create(WOLF, owner(12, HUNTER)));
    table.apply(create(INFERNAL, owner(14, WARLOCK)));
    expect(table.ownerOf(WOLF)).toEqual({ relation: "summoned", guid: HUNTER, current: true });
    expect(table.ownerOf(INFERNAL)).toEqual({ relation: "created", guid: WARLOCK, current: true });
  });

  it("puts a charm ahead of whoever summoned the unit", () => {
    const table = new UnitOwnerTable();
    table.apply(create(WOLF, [...owner(12, HUNTER), ...owner(10, PRIEST)]));
    expect(table.ownerOf(WOLF)).toEqual({ relation: "controlled", guid: PRIEST, current: true });
  });

  it("remembers the owner of a unit that has broken free", () => {
    const table = new UnitOwnerTable();
    table.apply(create(INFERNAL, owner(10, WARLOCK)));
    table.apply(values(INFERNAL, owner(10, 0n)));
    expect(table.ownerOf(INFERNAL)).toEqual({ relation: "controlled", guid: WARLOCK, current: false });
  });

  it("prefers an owner the unit still has over one it has lost", () => {
    const table = new UnitOwnerTable();
    table.apply(create(INFERNAL, [...owner(10, PRIEST), ...owner(14, WARLOCK)]));
    table.apply(values(INFERNAL, owner(10, 0n)));
    expect(table.ownerOf(INFERNAL)).toEqual({ relation: "created", guid: WARLOCK, current: true });
  });

  it("keeps the word a values update left alone", () => {
    const table = new UnitOwnerTable();
    table.apply(create(INFERNAL, owner(14, WOLF))); // an owner whose high word is not zero
    table.apply(values(INFERNAL, [[14, Number(WOLF & 0xffff_ffffn)]])); // low word resent alone
    expect(table.ownerOf(INFERNAL)?.guid).toBe(WOLF);
  });

  it("clears the current owner when the unit is created afresh without one", () => {
    const table = new UnitOwnerTable();
    table.apply(create(INFERNAL, owner(10, WARLOCK)));
    table.apply(create(INFERNAL));
    expect(table.ownerOf(INFERNAL)).toEqual({ relation: "controlled", guid: WARLOCK, current: false });
  });

  it("keeps nothing for a unit that never had an owner", () => {
    const table = new UnitOwnerTable();
    table.apply(create(GRUNT));
    table.apply(values(GRUNT, owner(10, 0n)));
    expect(table.ownerOf(GRUNT)).toBeNull();
  });

  it("learns an owner from a values update on a unit it was not keeping", () => {
    const table = new UnitOwnerTable();
    table.apply(create(GRUNT));
    table.apply(values(GRUNT, owner(10, PRIEST))); // mind controlled
    expect(table.ownerOf(GRUNT)).toEqual({ relation: "controlled", guid: PRIEST, current: true });
  });

  it("forgets a unit that left view or was destroyed", () => {
    const table = new UnitOwnerTable();
    table.apply(create(INFERNAL, owner(10, WARLOCK)));
    table.apply(create(WOLF, owner(12, HUNTER)));
    table.apply({ kind: "out-of-range", guid: INFERNAL });
    table.forget(WOLF);
    expect(table.ownerOf(INFERNAL)).toBeNull();
    expect(table.ownerOf(WOLF)).toBeNull();
  });

  it("drops the oldest unit once full", () => {
    const table = new UnitOwnerTable({ maxUnits: 2 });
    table.apply(create(INFERNAL, owner(10, WARLOCK)));
    table.apply(create(WOLF, owner(12, HUNTER)));
    table.apply(create(GRUNT, owner(10, PRIEST)));
    expect(table.ownerOf(INFERNAL)).toBeNull();
    expect(table.ownerOf(WOLF)?.guid).toBe(HUNTER);
    expect(table.ownerOf(GRUNT)?.guid).toBe(PRIEST);
  });
});
