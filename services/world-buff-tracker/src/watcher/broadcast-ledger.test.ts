import { describe, expect, it, vi } from "vitest";
import {
  buffCooldownRemainingMs,
  InMemoryBroadcastLedger,
  MongoBroadcastLedger,
  onBuffCooldown,
  shouldBroadcast,
  shouldBroadcastRaid,
  type BroadcastDb,
  type BroadcastKind,
  type BroadcastRecord,
} from "./broadcast-ledger.js";
import type { Faction } from "./buff-store.js";

const at = (sec: number): Date => new Date(sec * 1000);
const rec = (city: Faction, kind: BroadcastKind, sec: number): BroadcastRecord => ({
  city,
  kind,
  cohortLabel: "the lair",
  peak: 40,
  lastBroadcastAt: at(sec),
});

const HOUR = 3_600_000;

describe("shouldBroadcast", () => {
  it("broadcasts when there is no prior record", () => {
    expect(shouldBroadcast(null, null, 1000, HOUR)).toBe(true);
  });

  it("suppresses a repeat within the same cycle (no fresh drop, not stale)", () => {
    const last = { lastBroadcastAt: at(1000) };
    // Half an hour later, no buff has dropped since — same pending cycle.
    expect(shouldBroadcast(last, null, 1000_000 + 1800_000, HOUR)).toBe(false);
  });

  it("suppresses across a would-be re-fire even if a buff dropped BEFORE the last broadcast", () => {
    const last = { lastBroadcastAt: at(2000) };
    const droppedEarlier = at(1000); // older than our last broadcast → not a new cycle
    expect(shouldBroadcast(last, droppedEarlier, 2000_000 + 60_000, HOUR)).toBe(false);
  });

  it("reopens once a fresh buff drops AFTER the last broadcast (a new cycle)", () => {
    const last = { lastBroadcastAt: at(1000) };
    const droppedAfter = at(1500);
    expect(shouldBroadcast(last, droppedAfter, 1500_000 + 10_000, HOUR)).toBe(true);
  });

  it("reopens once the record is older than maxCycleMs (a run whose buff we never heard)", () => {
    const last = { lastBroadcastAt: at(1000) };
    const now = 1000 * 1000 + HOUR; // exactly one window later
    expect(shouldBroadcast(last, null, now, HOUR)).toBe(true);
  });
});

describe("shouldBroadcastRaid (per-raid dedup — every distinct raid alerts both cities)", () => {
  const prior = (raidNumber: number | null, sec: number) => ({ raidNumber, lastBroadcastAt: at(sec) });
  const TWO_HOURS = 2 * HOUR;

  it("fires when there is no prior record", () => {
    expect(shouldBroadcastRaid(null, 81, null, 1000, HOUR)).toBe(true);
  });

  it("suppresses a re-emit of the SAME raid (wipe / roster churn re-firing the event)", () => {
    expect(shouldBroadcastRaid(prior(81, 1000), 81, null, 1000_000 + 60_000, HOUR)).toBe(false);
  });

  it("fires for a DISTINCT raid even within the cycle with no buff dropped since — the #81 fix", () => {
    // Raid #80's clear was 91 min ago; no buff for this city since. The OLD per-cycle dedup swallowed
    // #81's clear here (that's the bug). Per-raid dedup fires it, because #81 is a different raid.
    const last = prior(80, 3000);
    const now = 3000 * 1000 + 91 * 60_000; // 91 min later — inside the 120m cycle ceiling
    expect(shouldBroadcast(last, null, now, TWO_HOURS)).toBe(false); // old behavior: suppressed
    expect(shouldBroadcastRaid(last, 81, null, now, TWO_HOURS)).toBe(true); // new behavior: fires
  });

  it("fires for each of several back-to-back distinct raids (no cooldown)", () => {
    let last: { raidNumber: number | null; lastBroadcastAt: Date } | null = null;
    for (const n of [90, 91, 92]) {
      expect(shouldBroadcastRaid(last, n, null, 1000_000, TWO_HOURS)).toBe(true);
      last = prior(n, 1000); // record it, next distinct raid still fires
    }
  });

  it("falls back to the per-cycle dedup when the event carries no raid number (sub-strength forming)", () => {
    const last = { lastBroadcastAt: at(1000), raidNumber: null };
    expect(shouldBroadcastRaid(last, null, null, 1000_000 + 60_000, HOUR)).toBe(false); // within cycle
    expect(shouldBroadcastRaid(last, null, at(1500), 1500_000 + 10_000, HOUR)).toBe(true); // buff dropped since
  });
});

describe("onBuffCooldown", () => {
  const COOLDOWN = 30 * 60_000; // 30 min

  it("is never on cooldown when cooldownMs is 0 (no cooldown — the default)", () => {
    expect(onBuffCooldown(at(1000), 1000_000 + 60_000, 0)).toBe(false);
  });

  it("is never on cooldown when no buff has dropped yet", () => {
    expect(onBuffCooldown(null, 5_000_000, COOLDOWN)).toBe(false);
  });

  it("is on cooldown within the window after a drop, and off it once the window elapses", () => {
    const dropped = at(1000);
    expect(onBuffCooldown(dropped, 1000_000 + 10 * 60_000, COOLDOWN)).toBe(true); // 10m in, still cooling
    expect(onBuffCooldown(dropped, 1000_000 + COOLDOWN - 1, COOLDOWN)).toBe(true); // just before it elapses
    expect(onBuffCooldown(dropped, 1000_000 + COOLDOWN, COOLDOWN)).toBe(false); // exactly elapsed → off
    expect(onBuffCooldown(dropped, 1000_000 + COOLDOWN + 60_000, COOLDOWN)).toBe(false); // well after
  });
});

describe("buffCooldownRemainingMs", () => {
  const COOLDOWN = 30 * 60_000;

  it("is 0 with no cooldown, no drop, or off cooldown", () => {
    expect(buffCooldownRemainingMs(at(1000), 1000_000 + 60_000, 0)).toBe(0); // no cooldown
    expect(buffCooldownRemainingMs(null, 5_000_000, COOLDOWN)).toBe(0); // never dropped
    expect(buffCooldownRemainingMs(at(1000), 1000_000 + COOLDOWN, COOLDOWN)).toBe(0); // just elapsed
  });

  it("counts down the remaining time while on cooldown", () => {
    const dropped = at(1000);
    expect(buffCooldownRemainingMs(dropped, 1000_000 + 10 * 60_000, COOLDOWN)).toBe(20 * 60_000); // 20m left
  });
});

describe("InMemoryBroadcastLedger", () => {
  it("returns null before anything is recorded", async () => {
    const ledger = new InMemoryBroadcastLedger();
    expect(await ledger.last("alliance", "raid-forming")).toBeNull();
  });

  it("records and reads back the latest per (city, kind)", async () => {
    const ledger = new InMemoryBroadcastLedger();
    await ledger.record(rec("alliance", "raid-forming", 100));
    await ledger.record(rec("alliance", "raid-forming", 200)); // upsert-latest
    const last = await ledger.last("alliance", "raid-forming");
    expect(last?.lastBroadcastAt).toEqual(at(200));
  });

  it("keeps city and kind independent", async () => {
    const ledger = new InMemoryBroadcastLedger();
    await ledger.record(rec("alliance", "raid-forming", 100));
    expect(await ledger.last("alliance", "raid-left")).toBeNull();
    expect(await ledger.last("horde", "raid-forming")).toBeNull();
    expect((await ledger.last("alliance", "raid-forming"))?.city).toBe("alliance");
  });

  it("round-trips the raid number (so the once-per-raid heads-up dedup survives a restart)", async () => {
    const ledger = new InMemoryBroadcastLedger();
    await ledger.record({ ...rec("alliance", "raid-ending", 100), raidNumber: 51 });
    expect((await ledger.last("alliance", "raid-ending"))?.raidNumber).toBe(51);
  });
});

describe("MongoBroadcastLedger", () => {
  function fakeDb(): BroadcastDb & { docs: BroadcastRecord[] } {
    const docs: BroadcastRecord[] = [];
    return {
      docs,
      get: vi.fn(async (city: Faction, kind: BroadcastKind) =>
        docs.find((d) => d.city === city && d.kind === kind) ?? null,
      ),
      upsert: vi.fn(async (doc) => {
        const i = docs.findIndex((d) => d.city === doc.city && d.kind === doc.kind);
        if (i >= 0) docs[i] = doc;
        else docs.push(doc);
      }),
      close: vi.fn(async () => {}),
    };
  }

  it("upserts on (city, kind) so there is one row per pair", async () => {
    const db = fakeDb();
    const ledger = new MongoBroadcastLedger(db);
    await ledger.record(rec("horde", "raid-left", 100));
    await ledger.record(rec("horde", "raid-left", 300));
    expect(db.docs).toHaveLength(1);
    expect((await ledger.last("horde", "raid-left"))?.lastBroadcastAt).toEqual(at(300));
  });

  it("returns null for a pair never recorded", async () => {
    const ledger = new MongoBroadcastLedger(fakeDb());
    expect(await ledger.last("alliance", "raid-forming")).toBeNull();
  });

  it("persists and reads back the raid number through the DB", async () => {
    const ledger = new MongoBroadcastLedger(fakeDb());
    await ledger.record({ ...rec("horde", "raid-ending", 100), raidNumber: 52 });
    expect((await ledger.last("horde", "raid-ending"))?.raidNumber).toBe(52);
  });

  it("closes the underlying connection", async () => {
    const db = fakeDb();
    await new MongoBroadcastLedger(db).close();
    expect(db.close).toHaveBeenCalled();
  });
});
