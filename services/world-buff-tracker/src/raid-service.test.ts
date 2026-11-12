import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig, onyxiaWatch, type BotConfig, type RaidWatchConfig } from "./config.js";
import { silentLogger } from "./logger.js";
import type { RaidZoneServices, YellSink } from "./lanes.js";
import { createRaidService, type RaidService } from "./raid-service.js";
import { buildLanes, trackerOptions } from "./raid-zone-setup.js";
import type { NotifyMessage } from "./notify/notifier.js";
import type { WhoPlayer } from "./protocol/who.js";
import { WhisperPool } from "./chat/whisper-pool.js";
import { InMemorySubscriberStore } from "./subscribers/memory-store.js";
import { InMemoryUserLedger } from "./subscribers/user-ledger.js";
import { InMemoryGuildieStore } from "./subscribers/guildie-store.js";
import { InMemoryBroadcastLedger } from "./watcher/broadcast-ledger.js";
import { InMemoryBuffStore, type Faction } from "./watcher/buff-store.js";
import { BuffTracker } from "./watcher/buff-tracker.js";
import { InMemoryDurationStore } from "./watcher/duration-store.js";
import { newLairActivity } from "./watcher/drop-origin.js";
import { InMemoryLockoutStore } from "./watcher/lockout-store.js";
import { InMemoryRaidStateStore } from "./watcher/raid-state-store.js";
import { InMemorySnapshotStore } from "./watcher/snapshot-store.js";
import { BLACKWING_LAIR, ONYXIA, type RaidZone } from "./watcher/raid-zone.js";

const env = { WOW_ACCOUNT: "a", WOW_PASSWORD: "p", WOW_CHARACTER: "C" } satisfies NodeJS.ProcessEnv;

function raid(size: number, guild: string, areaId: number): WhoPlayer[] {
  return Array.from({ length: size }, (_, i) => ({ name: `${guild}${i}`, guild, level: 60, classId: 1, raceId: 1, areaId }));
}

interface Posted {
  readonly zone: RaidZone["id"];
  readonly message: NotifyMessage;
}

interface Harness {
  readonly service: RaidService;
  readonly posted: Posted[];
  readonly yells: { faction: Faction; text: string }[];
  readonly ledgers: Readonly<Record<RaidZone["id"], InMemoryBroadcastLedger>>;
  readonly whispers: { names: readonly string[]; message: string }[];
  readonly subscribers: InMemorySubscriberStore;
}

function harness(config: BotConfig, watchBwl = true): Harness {
  const posted: Posted[] = [];
  const yells: { faction: Faction; text: string }[] = [];
  const whispers: { names: readonly string[]; message: string }[] = [];
  const subscribers = new InMemorySubscriberStore();
  const ledgers = { onyxia: new InMemoryBroadcastLedger(), bwl: new InMemoryBroadcastLedger() };
  const lairActivity = { onyxia: newLairActivity(), bwl: newLairActivity() };
  const zoneServices = (zone: RaidZone, watch: RaidWatchConfig): RaidZoneServices => {
    let counter = 0;
    return {
      zone,
      watch,
      lanes: buildLanes(zone.id, config.realmType, trackerOptions(watch, config.raidGrouping, () => ++counter)),
      chronicle: null,
      broadcasts: ledgers[zone.id],
      durationStore: new InMemoryDurationStore(),
      snapshots: new InMemorySnapshotStore(),
      lairActivity: lairActivity[zone.id],
      push: async (message) => {
        posted.push({ zone: zone.id, message });
      },
    };
  };
  const bwlWatch = config.blackwingLair;
  if (!bwlWatch) throw new Error("BWL is on by default");
  const yellSink: YellSink = { yellFor: (faction) => (text) => yells.push({ faction, text }) };
  const buffTracker = new BuffTracker({
    store: new InMemoryBuffStore(),
    dedupWindowMs: 60_000,
    cooldownMs: config.buffCooldownMs,
    lairs: {
      onyxia: { activity: lairActivity.onyxia, freshWindowMs: config.raidFreshWindowMs },
      bwl: { activity: lairActivity.bwl, freshWindowMs: bwlWatch.raidFreshWindowMs },
    },
    logger: silentLogger,
  });
  const service = createRaidService(
    {
      raidZones: [
        zoneServices(ONYXIA, onyxiaWatch(config)),
        ...(watchBwl ? [zoneServices(BLACKWING_LAIR, bwlWatch)] : []),
      ],
      buffTracker,
      raidStateStore: new InMemoryRaidStateStore(),
      lockoutStore: new InMemoryLockoutStore(),
      store: subscribers,
      userLedger: new InMemoryUserLedger(),
      inviteLedger: new InMemoryUserLedger(),
      guildieStore: new InMemoryGuildieStore(),
      whisperPool: new WhisperPool(),
      yellSink,
      push: async (message) => {
        posted.push({ zone: "onyxia", message });
      },
    },
    config,
    silentLogger,
    (names, message) => whispers.push({ names, message }),
    () => null,
  );
  return { service, posted, yells, ledgers, whispers, subscribers };
}

const M = 60_000;
const ONYXIA_AREA = 2159;
const BWL_AREA = 2677;

/** Polls `zone` once a minute from `fromMin` to `toMin` (inclusive) with `players` in the lair. */
async function pollEveryMinute(
  service: RaidService,
  zone: RaidZone,
  players: readonly WhoPlayer[],
  fromMin: number,
  toMin: number,
): Promise<void> {
  for (let minute = fromMin; minute <= toMin; minute++) {
    vi.setSystemTime(T0 + minute * M);
    await service.onRoster(zone.id, { present: players, complete: true, at: Date.now() });
  }
}

const T0 = Date.UTC(2026, 10, 12, 18, 0);

describe("createRaidService — one pipeline per lair", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("yells a Blackwing Lair raid's start under BWL's name and records it in BWL's ledger only", async () => {
    const { service, yells, ledgers } = harness(loadConfig(env));
    await pollEveryMinute(service, BLACKWING_LAIR, raid(25, "Dawn", BWL_AREA), 0, 0);

    expect(yells.map((y) => y.faction).sort()).toEqual(["alliance", "horde"]);
    for (const yell of yells) {
      expect(yell.text).toContain(BLACKWING_LAIR.raidName);
      expect(yell.text).not.toContain(ONYXIA.raidName);
    }
    expect(await ledgers.bwl.last("alliance", "raid-forming")).not.toBeNull();
    expect(await ledgers.onyxia.last("alliance", "raid-forming")).toBeNull();
  });

  it("posts a Blackwing Lair clear to BWL's channel, not Onyxia's", async () => {
    const { service, posted, ledgers } = harness(loadConfig(env));
    // 70m in the lair: past BWL's 60m disband line (Onyxia's is 20m), short of its 130m heads-up.
    await pollEveryMinute(service, BLACKWING_LAIR, raid(25, "Dawn", BWL_AREA), 0, 70);
    await pollEveryMinute(service, BLACKWING_LAIR, [], 71, 80); // gone past the 5m sustained wait

    expect(posted.map((p) => p.zone)).toEqual(["bwl"]);
    expect(posted[0]?.message.title).toBe(`🏁 ${BLACKWING_LAIR.raidName} raid has ended`);
    expect(await ledgers.bwl.last("alliance", "raid-left")).not.toBeNull();
    expect(await ledgers.onyxia.last("alliance", "raid-left")).toBeNull();
  });

  it("reads a 41m Blackwing Lair raid as a disband on BWL's own 60m line", async () => {
    const { service, posted, ledgers } = harness(loadConfig(env));
    await pollEveryMinute(service, BLACKWING_LAIR, raid(25, "Dawn", BWL_AREA), 0, 40);
    await pollEveryMinute(service, BLACKWING_LAIR, [], 41, 50);

    expect(posted.filter((p) => p.message.title.includes("has ended"))).toEqual([]);
    expect(await ledgers.bwl.last("alliance", "raid-left")).toBeNull();
  });

  it("posts Onyxia's heads-up on Onyxia's channel, on Onyxia's own (shorter) timer", async () => {
    const { service, posted, ledgers } = harness(loadConfig(env));
    // 45m estimate, 20m lead: due 25m in. BWL's 150m estimate would stay quiet this long.
    await pollEveryMinute(service, ONYXIA, raid(25, "Dusk", ONYXIA_AREA), 0, 26);

    expect(posted.map((p) => p.zone)).toEqual(["onyxia"]);
    expect(posted[0]?.message.title).toContain(ONYXIA.raidName);
    expect(await ledgers.onyxia.last("alliance", "raid-ending")).not.toBeNull();
    expect(await ledgers.bwl.last("alliance", "raid-ending")).toBeNull();
  });

  it("yells every lair's raid in progress on the capital status board", async () => {
    const { service, yells } = harness(loadConfig(env));
    await pollEveryMinute(service, ONYXIA, raid(25, "Dusk", ONYXIA_AREA), 0, 0);
    await pollEveryMinute(service, BLACKWING_LAIR, raid(25, "Dawn", BWL_AREA), 0, 0);
    yells.length = 0; // drop the start yells; only the status board is under test

    await service.yellCapitalStatus();

    const alliance = yells.find((y) => y.faction === "alliance");
    expect(alliance?.text).toContain(ONYXIA.raidName);
    expect(alliance?.text).toContain(BLACKWING_LAIR.raidName);
  });

  it("whispers a Nefarian-head drop as one, to that side's subscribers", async () => {
    const { service, whispers, subscribers } = harness(loadConfig(env));
    await subscribers.add("Bob"); // subscribed to both sides by default

    await service.announceBuffDrop("alliance", "bwl", false, new Date());

    expect(whispers).toHaveLength(1);
    expect(whispers[0]?.names).toEqual(["Bob"]);
    expect(whispers[0]?.message).toContain("(Nefarian head)");
  });

  it("does not whisper a saved Nefarian head nothing led up to", async () => {
    const { service, whispers, subscribers } = harness(loadConfig(env));
    await subscribers.add("Bob");

    await service.announceBuffDrop("horde", "bwl", true, new Date());

    expect(whispers).toEqual([]);
  });

  it("skips a poll for a lair that is not watched", async () => {
    const { service, posted, yells, ledgers } = harness(loadConfig(env), false);
    await pollEveryMinute(service, BLACKWING_LAIR, raid(25, "Dawn", BWL_AREA), 0, 0);

    expect(posted).toEqual([]);
    expect(yells).toEqual([]);
    expect(await ledgers.bwl.last("alliance", "raid-forming")).toBeNull();
  });
});
