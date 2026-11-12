import { describe, expect, it, vi } from "vitest";
import { AlertDelivery, type AlertDeliveryDeps } from "./alert-delivery.js";
import type { NotifyMessage } from "./notifier.js";
import type { Faction } from "../watcher/buff-store.js";
import type { Subscriber } from "../subscribers/store.js";
import type { AlertWhisper } from "../chat/whisper-queue.js";

const msg = (body: string): NotifyMessage => ({ kind: "info", title: "t", body });
const sub = (name: string, factions: Faction[]): Subscriber => ({
  name,
  factions,
  factionSource: "explicit" as Subscriber["factionSource"],
  subscribedAt: new Date(0),
});

function harness(overrides: Partial<AlertDeliveryDeps> = {}) {
  const calls = {
    push: [] as { message: NotifyMessage; factions?: readonly Faction[] }[],
    yell: [] as { city: Faction; text: string }[],
    whisper: [] as { names: readonly string[]; message: string; faction: Faction | null; alert?: AlertWhisper }[],
  };
  const deps: AlertDeliveryDeps = {
    push: async (message, factions) => void calls.push.push({ message, factions }),
    yell: (city, text) => calls.yell.push({ city, text }),
    whispersEnabled: true,
    subscribers: async () => [sub("Ally", ["alliance"]), sub("Hordie", ["horde"]), sub("Both", ["alliance", "horde"])],
    broadcastWhisper: (names, message, faction, alert) => calls.whisper.push({ names, message, faction, alert }),
    logger: { info: vi.fn(), error: vi.fn() },
    ...overrides,
  };
  return { delivery: new AlertDelivery(deps), calls, deps };
}

describe("AlertDelivery.sendCityAlert", () => {
  it("posts to Discord, yells each city, and whispers the subscribers", async () => {
    const { delivery, calls } = harness();
    await delivery.sendCityAlert({
      label: "raid-forming",
      discord: msg("a raid is forming"),
      cities: ["alliance", "horde"],
      yellFor: (c) => `yell-${c}`,
      whisperFor: (cs) => `wh-${[...cs].join("+")}`,
    });
    expect(calls.push).toHaveLength(1);
    expect(calls.push[0]?.factions).toEqual(["alliance", "horde"]); // role-pings both sides
    expect(calls.yell.map((y) => y.text).sort()).toEqual(["yell-alliance", "yell-horde"]); // per-capital
    // Every subscriber is whispered (across the groups), each via their own side's line.
    const whispered = calls.whisper.flatMap((w) => [...w.names]).sort();
    expect(whispered).toEqual(["Ally", "Both", "Hordie"]);
  });

  it("leaves the capitals quiet for an alert with nothing to yell, still posting and whispering", async () => {
    const { delivery, calls } = harness();
    await delivery.sendCityAlert({
      label: "raid-forming",
      discord: msg("a raid is forming"),
      cities: ["alliance", "horde"],
      whisperFor: (cs) => `wh-${[...cs].join("+")}`,
    });
    expect(calls.push).toHaveLength(1);
    expect(calls.yell).toEqual([]);
    expect(calls.whisper.flatMap((w) => [...w.names]).sort()).toEqual(["Ally", "Both", "Hordie"]);
  });

  it("only yells an alert with no Discord post and no whisper", async () => {
    const subscribers = vi.fn(async (): Promise<readonly Subscriber[]> => [sub("Hordie", ["horde"])]);
    const { delivery, calls } = harness({ subscribers });
    await delivery.sendCityAlert({
      label: "raid-forming",
      cities: ["alliance", "horde"],
      yellFor: (c) => `yell-${c}`,
    });
    expect(calls.push).toEqual([]);
    expect(calls.yell.map((y) => y.text).sort()).toEqual(["yell-alliance", "yell-horde"]);
    expect(calls.whisper).toEqual([]);
    expect(subscribers).not.toHaveBeenCalled(); // nothing to whisper, so no subscriber fetch
  });

  it("posts to Discord but does not yell or whisper when whispers are disabled", async () => {
    const { delivery, calls } = harness({ whispersEnabled: false });
    await delivery.sendCityAlert({
      label: "raid-forming",
      discord: msg("x"),
      cities: ["alliance"],
      yellFor: () => "y",
      whisperFor: () => "w",
    });
    expect(calls.push).toHaveLength(1); // the channel post always happens
    expect(calls.yell).toHaveLength(0);
    expect(calls.whisper).toHaveLength(0);
  });

  it("still posts and yells, and does not throw, when the subscriber store fails", async () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const { delivery, calls } = harness({
      logger,
      subscribers: async () => {
        throw new Error("mongo down");
      },
    });
    await expect(
      delivery.sendCityAlert({ label: "raid-left", discord: msg("cleared"), cities: ["horde"], yellFor: () => "y", whisperFor: () => "w" }),
    ).resolves.toBeUndefined();
    expect(calls.push).toHaveLength(1);
    expect(calls.yell).toHaveLength(1); // yells fire before the subscriber fetch
    expect(calls.whisper).toHaveLength(0); // no whisper on a failed fetch
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("AlertDelivery unsubscribe hint", () => {
  it("ends every subscriber whisper with how to unsubscribe, but never a yell", async () => {
    const { delivery, calls } = harness();
    await delivery.sendCityAlert({
      label: "raid-left",
      discord: msg("cleared"),
      cities: ["horde"],
      yellFor: () => "Onyxia raid cleared.",
      whisperFor: () => "Onyxia raid cleared.",
    });
    expect(calls.yell.map((y) => y.text)).toEqual(["Onyxia raid cleared."]);
    for (const w of calls.whisper) expect(w.message).toBe(`Onyxia raid cleared. Whisper "stop" to unsubscribe.`);
  });

  it("ends a one-side whisper with it too", async () => {
    const { delivery, calls } = harness();
    await delivery.sendFactionWhisper("horde", "The Rallying Cry just dropped in Orgrimmar!");
    expect(calls.whisper[0]?.message).toBe(`The Rallying Cry just dropped in Orgrimmar! Whisper "stop" to unsubscribe.`);
  });
});

describe("AlertDelivery event time", () => {
  it("dates a city alert's whispers from when its event happened", async () => {
    const { delivery, calls } = harness();
    await delivery.sendCityAlert({
      label: "raid-left",
      discord: msg("cleared"),
      cities: ["horde"],
      whisperFor: () => "cleared",
      whisperMaxAgeMs: 5 * 60_000,
      happenedAt: 1_000,
    });
    expect(calls.whisper.map((w) => w.alert)).toEqual([{ cities: ["horde"], maxAgeMs: 5 * 60_000, since: 1_000 }]);
  });

  it("dates a one-side whisper from when its event happened", async () => {
    const { delivery, calls } = harness();
    await delivery.sendFactionWhisper("horde", "dropped", { maxAgeMs: 5 * 60_000, since: 2_000 });
    expect(calls.whisper[0]?.alert).toEqual({ maxAgeMs: 5 * 60_000, since: 2_000 });
  });
});

describe("AlertDelivery.sendFactionWhisper", () => {
  it("whispers only that side's subscribers", async () => {
    const { delivery, calls } = harness();
    await delivery.sendFactionWhisper("horde", "buff up in Orgrimmar", { maxAgeMs: 5 * 60_000 });
    expect(calls.push).toHaveLength(0); // a drop's channel post is the caller's job, not here
    const names = calls.whisper.flatMap((w) => [...w.names]).sort();
    expect(names).toEqual(["Both", "Hordie"]); // the alliance-only sub is excluded
  });

  it("is a no-op when whispers are disabled", async () => {
    const { delivery, calls } = harness({ whispersEnabled: false });
    await delivery.sendFactionWhisper("horde", "x");
    expect(calls.whisper).toHaveLength(0);
  });
});
