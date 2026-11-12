import { describe, expect, it, vi } from "vitest";
import { RaidAlertPolicy, type RaidAlertPolicyDeps } from "./raid-alert-policy.js";
import type { BroadcastKind, BroadcastRecord } from "./broadcast-ledger.js";
import type { Faction } from "./buff-store.js";

const MIN = 60_000;
const rec = (raidNumber: number | null, at: number): Pick<BroadcastRecord, "raidNumber" | "lastBroadcastAt"> => ({
  raidNumber,
  lastBroadcastAt: new Date(at),
});

function harness(overrides: Partial<RaidAlertPolicyDeps> = {}) {
  const ledger = new Map<string, Pick<BroadcastRecord, "raidNumber" | "lastBroadcastAt">>();
  const drops = new Map<Faction, Date>();
  const logger = { info: vi.fn() };
  const deps: RaidAlertPolicyDeps = {
    lastBroadcast: async (city, kind) => ledger.get(`${city}:${kind}`) ?? null,
    lastBuffDropAt: async (city) => drops.get(city) ?? null,
    cooldownMs: 0,
    dedupMs: 120 * MIN,
    logger,
    ...overrides,
  };
  return { policy: new RaidAlertPolicy(deps), ledger, drops, logger };
}

const req = (over: Partial<Parameters<RaidAlertPolicy["decide"]>[0]> = {}) => ({
  cities: ["alliance", "horde"] as Faction[],
  kind: "raid-left" as BroadcastKind,
  raidNumber: 55 as number | null,
  label: "lair",
  now: 10 * MIN,
  ...over,
});

describe("RaidAlertPolicy.decide", () => {
  it("alerts both cities for a raid never broadcast before", async () => {
    const { policy } = harness();
    expect(await policy.decide(req())).toEqual(["alliance", "horde"]);
  });

  it("suppresses a city already broadcast for the same raid number (per-raid dedup)", async () => {
    const { policy, ledger } = harness();
    ledger.set("alliance:raid-left", rec(55, 5 * MIN));
    expect(await policy.decide(req())).toEqual(["horde"]); // alliance already told about #55
  });

  it("re-alerts a city for a DIFFERENT raid number even within the dedup window", async () => {
    const { policy, ledger } = harness();
    // #54 cleared a minute ago (well inside dedupMs); #55 is a distinct raid — a fresh opportunity.
    ledger.set("alliance:raid-left", rec(54, 9 * MIN));
    ledger.set("horde:raid-left", rec(54, 9 * MIN));
    expect(await policy.decide(req({ raidNumber: 55 }))).toEqual(["alliance", "horde"]);
  });

  it("skips a side still within the buff cooldown, and keeps the other", async () => {
    const { policy, drops } = harness({ cooldownMs: 60 * MIN });
    drops.set("alliance", new Date(8 * MIN)); // dropped 2m ago, cooldown 60m → still cooling
    expect(await policy.decide(req())).toEqual(["horde"]);
  });

  it("keeps both sides when the cooldown is off (0), regardless of a recent drop", async () => {
    const { policy, drops } = harness({ cooldownMs: 0 });
    drops.set("alliance", new Date(9 * MIN));
    expect(await policy.decide(req())).toEqual(["alliance", "horde"]);
  });

  it("a fresh buff drop after the last broadcast reopens a null-number event (cycle fallback)", async () => {
    const { policy, ledger, drops } = harness();
    // No raid number (a below-strength forming): falls back to the per-cycle dedup.
    ledger.set("alliance:raid-forming", rec(null, 5 * MIN));
    expect(await policy.decide(req({ kind: "raid-forming", raidNumber: null }))).toEqual(["horde"]); // alliance still in-cycle
    drops.set("alliance", new Date(6 * MIN)); // a buff dropped after alliance's broadcast → new cycle
    expect(await policy.decide(req({ kind: "raid-forming", raidNumber: null }))).toEqual(["alliance", "horde"]);
  });

  it("logs a reason for every suppressed city", async () => {
    const { policy, ledger, logger } = harness({ cooldownMs: 60 * MIN });
    ledger.set("alliance:raid-left", rec(55, 5 * MIN));
    await policy.decide(req({ now: 10 * MIN }));
    expect(logger.info).toHaveBeenCalledWith("lair raid-left for alliance suppressed — already broadcast for raid #55");
  });

  it("honours a single-city lane (faction mode)", async () => {
    const { policy } = harness();
    expect(await policy.decide(req({ cities: ["horde"] }))).toEqual(["horde"]);
  });
});
