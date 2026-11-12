import type { BotConfig } from "./config.js";
import { describeError } from "./errors.js";
import type { Logger } from "./logger.js";
import type { FaireAnswer } from "./darkmoon/observation.js";
import { AlertDelivery } from "./notify/alert-delivery.js";
import { isDropWhispered } from "./notify/raid-alert-reach.js";
import {
  formatBuffDroppedWhisper,
  formatCapitalStatusYell,
  type CapitalStatusRaid,
} from "./notify/format.js";
import { formatHeartbeat } from "./watcher/heartbeat.js";
import { FACTIONS, type Faction } from "./watcher/buff-store.js";
import type { AlertWhisper, WhisperQueue } from "./chat/whisper-queue.js";
import type { LairView } from "./watcher/roster-source.js";
import type { RaidZoneServices, YellSink } from "./lanes.js";
import type { BuffTracker } from "./watcher/buff-tracker.js";
import type { RaidStateStore } from "./watcher/raid-state-store.js";
import type { LockoutStore } from "./watcher/lockout-store.js";
import type { SubscriberStore } from "./subscribers/store.js";
import type { UserLedger } from "./subscribers/user-ledger.js";
import type { GuildieStore } from "./subscribers/guildie-store.js";
import type { WhisperPool } from "./chat/whisper-pool.js";
import type { NotifyMessage } from "./notify/notifier.js";
import { capitalStatusFaire } from "./darkmoon/format.js";
import { RAID_ZONES, type RaidZoneId } from "./watcher/raid-zone.js";
import { createRaidZonePipeline, type RaidZonePipeline } from "./raid-zone-pipeline.js";

/**
 * Exactly what the raid service needs from the connection — a narrow view of index.ts's
 * ConnectionServices (which is structurally assignable to this). Declared here, from the source
 * modules, so the service never imports the entry point for a type.
 */
export interface RaidServiceDeps {
  /** Every watched lair — Onyxia's first, then Blackwing Lair's when it is on. */
  readonly raidZones: readonly RaidZoneServices[];
  readonly buffTracker: BuffTracker;
  readonly raidStateStore: RaidStateStore;
  readonly lockoutStore: LockoutStore;
  readonly store: SubscriberStore;
  readonly userLedger: UserLedger;
  readonly inviteLedger: UserLedger;
  readonly guildieStore: GuildieStore;
  readonly whisperPool: WhisperPool;
  readonly yellSink: YellSink;
  /** Where the Darkmoon Faire was last seen, for the capital yell. Undefined = not tracked, and
   *  the yell simply omits the line. */
  readonly faireAnswer?: (now: number) => FaireAnswer;
  /** The default (Onyxia) channel — what the per-faction whispers' delivery is built on. */
  readonly push: (message: NotifyMessage, factions?: readonly Faction[]) => Promise<void>;
}

/** What index.ts drives: each lair's poll, the listener-heard drops, and the capital status yell. */
export interface RaidService {
  /** Runs one poll of `zone`'s lair; a lair that is not watched is logged and skipped. */
  onRoster(zone: RaidZoneId, view: LairView): Promise<void>;
  /** A Rallying Cry heard in `faction`'s capital, from `head`'s boss: purge the park-now whispers
   *  and tell that side's subscribers (unless it was a saved head nothing led up to). */
  announceBuffDrop(faction: Faction, head: RaidZoneId, savedHead: boolean, appliedAt: Date): Promise<void>;
  yellCapitalStatus(): Promise<void>;
}

/** How often the heartbeat stat line is logged. */
const HEARTBEAT_MS = 15 * 60_000;

/**
 * The raid service: one pipeline per watched lair (raid-zone-pipeline.ts — alerts, disbands,
 * early-confirm, heads-up, each against its own ledger and timer), plus what all lairs share — the
 * buff-drop whisper (one buff, either head), the capital status yell listing every raid in progress, and the 15-minute heartbeat log carrying each lair's timer.
 * index.ts wires the poll loops, the buffDropSink and the yell timer to the handles it returns.
 */
export function createRaidService(
  services: RaidServiceDeps,
  config: BotConfig,
  logger: Logger,
  broadcastWhisper: (names: readonly string[], message: string, faction: Faction | null, alert?: AlertWhisper) => void,
  getWhisperQueue: () => WhisperQueue | null,
): RaidService {
  const { raidZones, buffTracker, store, userLedger, inviteLedger, guildieStore, whisperPool, yellSink, faireAnswer, push } = services;
  let lastHeartbeatAt = 0;

  const pipelines = new Map<RaidZoneId, RaidZonePipeline>();
  for (const zone of raidZones) {
    pipelines.set(
      zone.zone.id,
      createRaidZonePipeline(
        zone,
        { ...services, broadcastWhisper, getWhisperQueue },
        config,
        logger,
      ),
    );
  }

  // The drop whisper never posts to Discord: the drop is posted by the listener that heard it, to
  // its head's channel.
  const delivery = new AlertDelivery({
    push,
    yell: (city, text) => yellSink.yellFor(city)?.(text),
    whispersEnabled: config.whispersEnabled,
    subscribers: () => store.all(),
    broadcastWhisper,
    logger,
  });

  const announceBuffDrop = (faction: Faction, head: RaidZoneId, savedHead: boolean, appliedAt: Date): Promise<void> => {
    // The buff is UP now, so any still-queued "park now to catch it" whispers for this side are
    // stale — whichever lair they were about: one buff, and it just dropped.
    const dropped = whisperPool.dropForFaction(faction) + (getWhisperQueue()?.dropForFaction(faction) ?? 0);
    if (dropped > 0) logger.info(`dropped ${dropped} stale park-now whisper(s) for ${faction} — buff is up`);
    if (!isDropWhispered(savedHead)) {
      logger.info(`buff drop: ${faction} was a saved ${RAID_ZONES[head].boss} head — not whispered, nothing led up to it`);
      return Promise.resolve();
    }
    // A drop whisper delivered minutes late (throttle backlog) is the Owlofelune case — expire it.
    return delivery.sendFactionWhisper(faction, formatBuffDroppedWhisper(faction, RAID_ZONES[head]), {
      maxAgeMs: config.whisperMaxAgeMs,
      since: appliedAt.getTime(),
    });
  };

  // Every ~10 min, yell a buff-status board in each capital: every raid in progress (with its
  // lair's typical clear) and where the faire is, plus a subscribe/discord CTA — or nothing.
  const yellCapitalStatus = async (): Promise<void> => {
    if (!config.whispersEnabled) return;
    const now = Date.now();
    const typical = new Map<RaidZoneId, string>();
    for (const pipeline of pipelines.values()) typical.set(pipeline.zone.id, await pipeline.typicalClear());
    // A recent look is shouted as fact, an older one with its age; nothing within a week, nothing.
    const answer = faireAnswer?.(now);
    const faire = answer ? capitalStatusFaire(answer, now) : null;
    for (const faction of FACTIONS) {
      const yell = yellSink.yellFor(faction);
      if (!yell) continue; // no listener parked in this capital right now
      const raids: CapitalStatusRaid[] = [];
      for (const pipeline of pipelines.values()) {
        const raid = pipeline.raidFor(faction, now);
        if (raid) raids.push({ zone: pipeline.zone, ...raid, typicalClear: typical.get(pipeline.zone.id) });
      }
      const status = formatCapitalStatusYell(faction, raids, faire);
      if (status) yell(status);
    }
  };

  const logHeartbeat = async (now: number): Promise<void> => {
    const [timers, subscribers, totalUsers, totalInvites, activeGuildies, buffs] = await Promise.all([
      Promise.all([...pipelines.values()].map((pipeline) => pipeline.timerStats())),
      store.all().then((all) => all.length),
      userLedger.count().catch(() => 0),
      inviteLedger.count().catch(() => 0),
      guildieStore.count().catch(() => 0),
      Promise.all(
        FACTIONS.map(async (faction) => {
          const dropAt = await buffTracker.lastDropAt(faction);
          return { faction, sinceLastDropMs: dropAt ? now - dropAt.getTime() : null };
        }),
      ),
    ]);
    const [first, ...others] = timers;
    if (!first) return;
    logger.info(
      formatHeartbeat({ ...first, subscribers, totalUsers, totalInvites, activeGuildies, buffs, otherTimers: others }),
    );
  };

  const onRoster = async (zone: RaidZoneId, view: LairView): Promise<void> => {
    const pipeline = pipelines.get(zone);
    if (!pipeline) {
      logger.debug(`roster for ${RAID_ZONES[zone].areaName}, which is not watched — skipped`);
      return;
    }
    // Surface the MongoDB-only stats into the logs on a slow cadence, whichever lair's poll comes.
    const now = Date.now();
    if (now - lastHeartbeatAt >= HEARTBEAT_MS) {
      lastHeartbeatAt = now;
      void logHeartbeat(now).catch((error) => logger.debug(`monitor: ${describeError(error)}`));
    }
    await pipeline.onRoster(view);
  };

  return { onRoster, announceBuffDrop, yellCapitalStatus };
}
