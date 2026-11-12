import { describe, expect, it, vi } from "vitest";
import type { UnitOwner } from "../protocol/unit-owner.js";
import { ThreatWatch, describeThreat, type Threat } from "./threat-watch.js";

const INFERNAL = 0xf130_0000_5900_0abcn; // creature entry 89
const GRUNT = 0xf130_000c_9300_0042n;
const GANKER = 0x555n;
const RAIDER = 0x666n;
const WARLOCK = 0x1234n;

const at = (x: number, y = 0, z = 0) => ({ x, y, z });

function setup(
  shunned: readonly bigint[] = [GANKER],
  owners = new Map<bigint, UnitOwner>(),
  fleeShunnedPlayers = true,
) {
  const threats: Threat[] = [];
  const sightings: { guid: bigint; distance: number | null }[] = [];
  const watch = new ThreatWatch(
    {
      isShunned: (guid) => shunned.includes(guid),
      ownerOf: (guid) => owners.get(guid) ?? null,
      onThreat: vi.fn((threat: Threat) => threats.push(threat)),
      onInfernalSeen: (guid, distance) => sightings.push({ guid, distance }),
    },
    { radiusYd: 30, fleeShunnedPlayers },
  );
  return { watch, threats, sightings };
}

describe("ThreatWatch", () => {
  it("reports an Infernal within reach, naming who holds it", () => {
    const owner: UnitOwner = { relation: "controlled", guid: WARLOCK, current: true };
    const { watch, threats } = setup([], new Map([[INFERNAL, owner]]));
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(20), destination: null });
    expect(threats).toEqual([{ kind: "infernal", guid: INFERNAL, owner, distance: 20 }]);
  });

  it("lets an Infernal across the square be, and reports it once it walks within reach", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(60), destination: null });
    expect(threats).toEqual([]);
    watch.moved({ guid: INFERNAL, pos: at(0, 25), destination: null });
    expect(threats).toEqual([{ kind: "infernal", guid: INFERNAL, owner: null, distance: 25 }]);
  });

  it("reports a player on the wall of shame within reach, but not anyone else", () => {
    const { watch, threats } = setup([GANKER]);
    watch.self(at(0));
    watch.moved({ guid: RAIDER, pos: at(1), destination: null });
    watch.moved({ guid: GRUNT, pos: at(1), destination: null });
    expect(threats).toEqual([]);
    watch.moved({ guid: GANKER, pos: at(0, 0, 10), destination: null });
    expect(threats).toEqual([{ kind: "shunned-player", guid: GANKER, distance: 10 }]);
  });

  it("stays beside a player on the wall of shame when told to, but still flees their Inferno", () => {
    const { watch, threats } = setup([GANKER], new Map(), false);
    watch.self(at(0));
    watch.moved({ guid: GANKER, pos: at(2), destination: null });
    expect(threats).toEqual([]);
    watch.castStarted({ caster: GANKER, spellId: 1122, destination: at(1) });
    expect(threats).toEqual([{ kind: "inferno-cast", guid: GANKER, distance: 1 }]);
  });

  it("judges what it saw before it knew where we stand", () => {
    const { watch, threats } = setup([]);
    watch.moved({ guid: INFERNAL, pos: at(5), destination: null });
    expect(threats).toEqual([]);
    watch.self(at(0));
    expect(threats).toHaveLength(1);
  });

  it("reports only the first threat — the answer to it is to leave", () => {
    const { watch, threats } = setup([GANKER]);
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(5), destination: null });
    watch.moved({ guid: GANKER, pos: at(5), destination: null });
    expect(threats).toHaveLength(1);
  });

  it("catches an Infernal as it sets off toward us from across the square", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(80), destination: at(2) });
    expect(threats).toEqual([{ kind: "infernal", guid: INFERNAL, owner: null, distance: 2 }]);
  });

  it("catches an Infernal whose path passes by within reach", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(-80, 10), destination: at(80, 10) });
    expect(threats).toHaveLength(1);
    expect(threats[0]?.distance).toBeCloseTo(10, 5);
  });

  it("lets a path that stays across the square be", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(80, 60), destination: at(-80, 60) });
    expect(threats).toEqual([]);
  });

  it("reports an Inferno aimed within reach, naming the caster however far off they stand", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.castStarted({ caster: WARLOCK, spellId: 1122, destination: at(3) });
    expect(threats).toEqual([{ kind: "inferno-cast", guid: WARLOCK, distance: 3 }]);
  });

  it("lets an Inferno aimed across the square be, and ignores every other spell", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.castStarted({ caster: WARLOCK, spellId: 1122, destination: at(70) });
    watch.castStarted({ caster: WARLOCK, spellId: 5740, destination: at(1) }); // Rain of Fire
    watch.castStarted({ caster: WARLOCK, spellId: 1122, destination: null });
    expect(threats).toEqual([]);
  });

  it("reports each Infernal it sees once, with its distance, far off or near", () => {
    const { watch, sightings } = setup([]);
    watch.moved({ guid: INFERNAL, pos: at(5), destination: null }); // before we know where we stand
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(4), destination: null });
    const FAR_INFERNAL = 0xf130_0000_5900_0abdn;
    watch.moved({ guid: FAR_INFERNAL, pos: at(70), destination: null });
    watch.moved({ guid: GRUNT, pos: at(1), destination: null });
    expect(sightings).toEqual([
      { guid: INFERNAL, distance: null },
      { guid: FAR_INFERNAL, distance: 70 },
    ]);
  });

  it("leaves at an Infernal's first blow, whatever its position said", () => {
    const owner: UnitOwner = { relation: "controlled", guid: WARLOCK, current: false };
    const { watch, threats } = setup([], new Map([[INFERNAL, owner]]));
    watch.struckBy(GRUNT); // a guard's swing is not an Infernal's
    expect(threats).toEqual([]);
    watch.struckBy(INFERNAL);
    expect(threats).toEqual([{ kind: "infernal", guid: INFERNAL, owner, distance: 0 }]);
  });

  it("forgets a unit that left view", () => {
    const { watch, threats } = setup([]);
    watch.moved({ guid: INFERNAL, pos: at(5), destination: null });
    watch.gone(INFERNAL);
    watch.self(at(0));
    expect(threats).toEqual([]);
  });

  it("once rearmed, reports at once an Infernal still within reach, from where it was last seen", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.moved({ guid: INFERNAL, pos: at(5), destination: null });
    expect(threats).toHaveLength(1);
    watch.rearm();
    expect(threats).toHaveLength(2);
    expect(threats[1]).toMatchObject({ kind: "infernal", guid: INFERNAL, distance: 5 });
  });

  it("puts each kind of threat in words, with its distance rounded", () => {
    expect(describeThreat({ kind: "infernal", guid: INFERNAL, owner: null, distance: 11.6 })).toBe(
      "an Infernal came within 12 yd",
    );
    expect(describeThreat({ kind: "inferno-cast", guid: WARLOCK, distance: 3 })).toBe(
      "an Inferno is being cast to land within 3 yd",
    );
    expect(describeThreat({ kind: "shunned-player", guid: GANKER, distance: 20 })).toBe(
      "a player on the wall of shame came within 20 yd",
    );
  });

  it("once rearmed with nothing within reach, waits for the next threat to come", () => {
    const { watch, threats } = setup([]);
    watch.self(at(0));
    watch.struckBy(INFERNAL);
    watch.rearm(); // the Infernal that struck was never placed: nothing to judge yet
    expect(threats).toHaveLength(1);
    watch.struckBy(INFERNAL);
    expect(threats).toHaveLength(2);
  });
});
