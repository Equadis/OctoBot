import type { BotConfig } from "./config.js";
import { describeError } from "./errors.js";
import type { Logger } from "./logger.js";
import { AlertDelivery } from "./notify/alert-delivery.js";
import { postedAndWhispered, yelledInCapitals } from "./notify/raid-alert-reach.js";
import {
  formatBuffAlert,
  formatBuffWhisper,
  formatRaidDisbanded,
  formatRaidDisbandedWhisper,
  formatRaidEnding,
  formatRaidEndingWhisper,
  withUnsubscribeHint,
} from "./notify/format.js";
import type { NamedHeartbeatTimer } from "./watcher/heartbeat.js";
import { evaluateTimer, improvedEstimate, typicalClearText } from "./watcher/timer-eval.js";
import { splitByFaction, type FactionSplit } from "./watcher/faction.js";
import { raidEndingDue } from "./watcher/raid-ending.js";
import { summarizeDepartures } from "./watcher/presence.js";
import { noteLairPoll } from "./watcher/drop-origin.js";
import { shouldBroadcast } from "./watcher/broadcast-ledger.js";
import { clearedRaidEvent, formedRaidEvent, type RaidEvent } from "./watcher/raid-events.js";
import { RaidAlertPolicy } from "./watcher/raid-alert-policy.js";
import type { Faction } from "./watcher/buff-store.js";
import { isPlausibleClear } from "./watcher/duration-store.js";
import { confirmingKills } from "./chronicle/confirm.js";
import { cleanOnyxiaKills } from "./chronicle/parse.js";
import type { AlertWhisper, WhisperQueue } from "./chat/whisper-queue.js";
import type { LairView } from "./watcher/roster-source.js";
import type { RaidLifecycleEvent } from "./watcher/raid-tracker.js";
import type { ConfirmedClear, PendingDeparture } from "./watcher/clear-tracker.js";
import type { DetectionLane, RaidZoneServices, YellSink } from "./lanes.js";
import type { BuffTracker } from "./watcher/buff-tracker.js";
import type { RaidStateStore } from "./watcher/raid-state-store.js";
import type { LockoutStore } from "./watcher/lockout-store.js";
import type { SubscriberStore } from "./subscribers/store.js";
import type { WhisperPool } from "./chat/whisper-pool.js";
import type { RaidZone } from "./watcher/raid-zone.js";

/** How many recent clears the self-improving timer evaluates over. */
const TIMER_EVAL_WINDOW = 200;

/** Whole minutes, for the human-readable log/alert wording. */
function mins(ms: number): number {
  return Math.round(ms / 60_000);
}

/** The realm-wide settings a lair's pipeline reads; everything lair-specific is its RaidWatchConfig. */
export type RaidPipelineConfig = Pick<
  BotConfig,
  "whispersEnabled" | "whisperMaxAgeMs" | "broadcastDedupMs" | "buffCooldownMs" | "realmType"
>;

/** What a lair's pipeline shares with every other lair: the buff state, the per-lane raid stores
 *  (keyed by lane label, which names the lair), the subscribers, and the whisper and yell outlets. */
export interface RaidPipelineShared {
  readonly buffTracker: BuffTracker;
  readonly raidStateStore: RaidStateStore;
  readonly lockoutStore: LockoutStore;
  readonly store: SubscriberStore;
  readonly whisperPool: WhisperPool;
  readonly yellSink: YellSink;
  readonly broadcastWhisper: (names: readonly string[], message: string, faction: Faction | null, alert?: AlertWhisper) => void;
  readonly getWhisperQueue: () => WhisperQueue | null;
}

/** A raid in progress, as the capital status yell tells of it. */
export interface RaidInProgress {
  readonly number: number | null;
  readonly elapsedMs: number;
}

/** One lair's poll-tick pipeline and what the rest of the service reads off it. */
export interface RaidZonePipeline {
  readonly zone: RaidZone;
  /** Runs one poll's roster through observe -> decide -> deliver. */
  onRoster(view: LairView): Promise<void>;
  /** The raid in progress in this lair for a faction (from the lane covering it), or null. */
  raidFor(faction: Faction, now: number): RaidInProgress | null;
  /** How long a raid here usually takes, for a reader: "30-50m", or "~45m" before enough data. */
  typicalClear(): Promise<string>;
  /** This lair's timer state for the heartbeat line. */
  timerStats(): Promise<NamedHeartbeatTimer>;
}

/**
 * One lair's raid pipeline (RAID_ARCHITECTURE.md step 6): given a LairView it runs the observe ->
 * decide -> deliver loop — formation/clear alerts, the disband stand-down, the Chronicle
 * early-confirm and the about-to-clear heads-up — against the lair's own watch settings, alert
 * ledger, clear times and channel. Gates: per-raid dedup plus the shared buff cooldown (one buff,
 * either head); a clear outside [minClear, maxClear] is ignored, one under the disband time stands
 * down instead. Onyxia and Blackwing Lair each run one.
 */
export function createRaidZonePipeline(
  services: RaidZoneServices,
  shared: RaidPipelineShared,
  config: RaidPipelineConfig,
  logger: Logger,
): RaidZonePipeline {
  const { zone, watch, lanes, chronicle, broadcasts, durationStore, snapshots, lairActivity, push } = services;
  const { buffTracker, raidStateStore, lockoutStore, store, whisperPool, yellSink, broadcastWhisper, getWhisperQueue } = shared;
  const lastChronicleCheck = new Map<string, number>();

  // The single fan-out: this lair's Discord post + per-capital yell + per-side subscriber whisper.
  const delivery = new AlertDelivery({
    push,
    yell: (city, text) => yellSink.yellFor(city)?.(text),
    whispersEnabled: config.whispersEnabled,
    subscribers: () => store.all(),
    broadcastWhisper,
    logger,
  });

  // The ONE gate for this lair's raid alerts — per-raid dedup against its own ledger, plus the buff
  // cooldown, which is shared: either head drops the same Rallying Cry. See RAID_ARCHITECTURE.md.
  const alertPolicy = new RaidAlertPolicy({
    lastBroadcast: (city, kind) => broadcasts.last(city, kind),
    lastBuffDropAt: (city) => buffTracker.lastDropAt(city),
    cooldownMs: config.buffCooldownMs,
    dedupMs: config.broadcastDedupMs,
    logger,
  });

  const recentClears = async (): Promise<number[]> =>
    (await durationStore.recent(TIMER_EVAL_WINDOW).catch(() => [])).map((d) => d.ms);

  // The clear time a raid is predicted to take: the self-improving estimate once enough raids are
  // on record, else the configured guess. Feeds the "about to clear" heads-up.
  const predictRaidDurationMs = async (): Promise<number> =>
    improvedEstimate(await recentClears(), watch.raidLearnMinSamples) ?? watch.raidDurationEstimateMs;

  const typicalClear = async (): Promise<string> => typicalClearText(await recentClears(), watch.raidDurationEstimateMs);

  // A buff-parking alert: post to this lair's channel (pinging @alliance/@horde per open city),
  // whisper in-game subscribers of that side, and yell in each open capital — each only where its
  // kind reaches (see notify/raid-alert-reach.ts). The caller already deduped `cities`.
  const announceBuff = async (event: RaidEvent, cities: readonly Faction[], now: number): Promise<void> => {
    // The "raid starting" alert quotes how long a raid usually takes, so a reader can judge
    // whether to park now; the "raid ended" alert already carries its own duration.
    const typical = event.kind === "raid-forming" ? await typicalClear() : undefined;
    await delivery.sendCityAlert({
      label: `${zone.id} ${event.kind}`,
      cities,
      ...(postedAndWhispered(event.kind)
        ? {
            discord: formatBuffAlert(zone, event, cities, typical),
            whisperFor: (groupCities: readonly Faction[]) => formatBuffWhisper(zone, event, groupCities, typical),
          }
        : {}),
      ...(yelledInCapitals(event.kind) ? { yellFor: (city: Faction) => formatBuffWhisper(zone, event, [city], typical) } : {}),
      // Tag with the cities this park-now is about, so a buff dropping there purges it as stale.
      whisperMaxAgeMs: config.whisperMaxAgeMs,
      happenedAt: now,
    });
  };

  const raidFor = (faction: Faction, now: number): RaidInProgress | null => {
    for (const lane of lanes) {
      if (!lane.cities.includes(faction)) continue;
      const elapsedMs = lane.watch.raidElapsedMs(now);
      if (elapsedMs !== null) return { number: lane.watch.raidNumber(), elapsedMs };
    }
    return null;
  };

  // One detection lane: census, then run each raid event through the per-cycle dedup before it
  // becomes a park-in-the-city alert.
  const processLane = async (lane: DetectionLane, split: FactionSplit, complete: boolean, now: number): Promise<void> => {
    const { events, census } = lane.watch.observe({ present: lane.players(split), complete, at: now });

    // Persist the raid in progress (or clear it) so a restart resumes exactly here, and the
    // lockout ledger, so a redeploy can't let a just-cleared raid's lingerers re-form a phantom.
    void raidStateStore
      .save(lane.label, lane.watch.raidStateSnapshot())
      .catch((error) => logger.debug(`raid state save: ${describeError(error)}`));
    void lockoutStore
      .save(lane.label, lane.watch.lockoutSnapshot())
      .catch((error) => logger.debug(`lockout save: ${describeError(error)}`));

    // Followed a blind gap: the tracker already resumed-or-discarded its raid; skip this read so a
    // crash-and-refill isn't read as a raid starting or ending.
    if (census.blackout) {
      logger.warn(`${lane.label}: recovered after a ~${mins(census.gapMs)}m blind gap — re-baselined`);
      return;
    }

    if (census.arrivals.length > 0 || census.departures.length > 0) {
      const dep = summarizeDepartures(census.departures.filter((d) => d.confident));
      const depPart = dep
        ? ` -${dep.count} left (stayed ~${mins(dep.medianStayMs)}m, arrived within ${mins(dep.arrivalSpanMs)}m)`
        : "";
      const arrPart = census.arrivals.length > 0 ? ` +${census.arrivals.length} arrived` : "";
      const truncPart = complete ? "" : " [truncated: /who at cap]";
      logger.info(`census ${lane.label}: ${census.present} in zone${arrPart}${depPart}${truncPart}`);
    }

    // Gate an event against the per-cycle dedup, then announce it and record it in this lair's
    // ledger. Keyed to the cycle (persisted in Mongo), so a redeploy, a wipe or roster churn
    // re-emitting the same event doesn't re-alert. A fresh drop for the city reopens it.
    const gateAndAnnounce = async (event: RaidEvent): Promise<void> => {
      const raidNumber = event.number ?? null;
      const fresh = await alertPolicy.decide({ cities: lane.cities, kind: event.kind, raidNumber, label: lane.label, now });
      if (fresh.length === 0) return;
      await announceBuff(event, fresh, now);
      for (const city of fresh) {
        await broadcasts
          .record({
            city,
            kind: event.kind,
            cohortLabel: event.cohort.label,
            peak: event.cohort.peak,
            raidNumber,
            lastBroadcastAt: new Date(now),
          })
          .catch((error) => logger.error(`broadcast-ledger: ${describeError(error)}`));
      }
    };

    // The "about to clear" heads-up: a raid STILL in the lair has been in to within the lead of its
    // predicted clear. Fires once per raid (dedup on the raid number in the persisted ledger) and
    // skips any side still within the buff cooldown.
    const announceRaidEnding = async (raidNumber: number | null, elapsedMs: number): Promise<void> => {
      const fresh = await alertPolicy.decide({ cities: lane.cities, kind: "raid-ending", raidNumber, label: lane.label, now });
      if (fresh.length === 0) return;
      const typical = await typicalClear();
      await delivery.sendCityAlert({
        label: `${zone.id} raid-ending`,
        cities: fresh,
        ...(postedAndWhispered("raid-ending")
          ? {
              discord: formatRaidEnding(zone, raidNumber, fresh, elapsedMs, typical),
              whisperFor: (groupCities: readonly Faction[]) =>
                formatRaidEndingWhisper(zone, raidNumber, groupCities, elapsedMs, typical),
            }
          : {}),
        ...(yelledInCapitals("raid-ending")
          ? { yellFor: (city: Faction) => formatRaidEndingWhisper(zone, raidNumber, [city], elapsedMs, typical) }
          : {}),
        whisperMaxAgeMs: config.whisperMaxAgeMs,
        happenedAt: now,
      });
      for (const city of fresh) {
        await broadcasts
          .record({ city, kind: "raid-ending", cohortLabel: "a raid", peak: 0, raidNumber, lastBroadcastAt: new Date(now) })
          .catch((error) => logger.error(`broadcast-ledger: ${describeError(error)}`));
      }
    };

    // The tracker's roster-driven lifecycle events: "formed" at strength (first numbered), a
    // sustained "cleared", or "resumed" (a wipe whose run-back outlasted the wait — nothing to say).
    let cleared: Extract<RaidLifecycleEvent, { kind: "cleared" }> | null = null;
    for (const event of events) {
      if (event.kind === "formed") await gateAndAnnounce(formedRaidEvent(event.peak, event.number));
      else if (event.kind === "resumed") {
        logger.info(
          `${lane.label}: raid #${event.number ?? "?"} resumed — its members are back after ~${mins(event.awayMs)}m, ` +
            `so its clear was a wipe; the timer runs on at ~${mins(event.elapsedMs)}m`,
        );
      } else cleared = event;
    }

    // A raid that formed and got a "get ready to park" alert, but left too soon to have killed its
    // boss, is a DISBAND — no park-now, no duration sample, and a stand-down for the cities told to
    // park this cycle. Purges the queued park whispers so nobody waits for a buff that isn't coming.
    const handleDisband = async (clear: ConfirmedClear): Promise<void> => {
      logger.info(
        `${lane.label}: ${zone.raidName} raid #${clear.number ?? "?"} disbanded: left after ~${mins(clear.durationMs)}m ` +
          `(< ${mins(watch.raidDisbandMs)}m) — not a real clear, not recorded`,
      );
      const notified: Faction[] = [];
      for (const city of lane.cities) {
        const buffDropAt = await buffTracker.lastDropAt(city);
        // Told of this raid this cycle, on Discord and by whisper where the stand-down goes, by an
        // alert sent there before it gave up — a start that was only yelled told neither.
        for (const kind of (["raid-forming", "raid-ending"] as const).filter(postedAndWhispered)) {
          const told = await broadcasts.last(city, kind);
          if (!shouldBroadcast(told, buffDropAt, now, config.broadcastDedupMs)) {
            notified.push(city);
            break;
          }
        }
      }
      if (notified.length === 0) return; // no alert went out this cycle — nobody was told to park
      const line = formatRaidDisbandedWhisper(zone, clear.number, clear.durationMs);
      for (const city of notified) {
        whisperPool.dropForFaction(city);
        getWhisperQueue()?.dropForFaction(city);
        if (yelledInCapitals("raid-disbanded")) yellSink.yellFor(city)?.(line);
      }
      if (!postedAndWhispered("raid-disbanded")) return;
      void push(formatRaidDisbanded(zone, clear.number, clear.durationMs), notified);
      if (config.whispersEnabled) {
        try {
          const subs = (await store.all()).filter((s) => notified.some((c) => s.factions.includes(c)));
          if (subs.length > 0) {
            broadcastWhisper(subs.map((s) => s.name), withUnsubscribeHint(line), notified[0] ?? null, {
              cities: notified,
              maxAgeMs: config.whisperMaxAgeMs,
              since: now,
            });
          }
        } catch (error) {
          logger.error(`subscribers: ${describeError(error)}`);
        }
      }
    };

    // A real, COMPLETED clear — the sustained wait, or a Chronicle early-confirm — drives the
    // park-now alert, the recap, and the duration sample. The plausibility floor/ceiling guard both.
    const handleConfirmedClear = async (clear: ConfirmedClear, killConfirmed: boolean): Promise<void> => {
      const ms = clear.durationMs;
      if (!isPlausibleClear(ms, watch.raidMinClearMs)) {
        logger.info(
          `${lane.label}: raid clear ignored: ~${mins(ms)}m is below the ${mins(watch.raidMinClearMs)}m floor — churn, not a real clear`,
        );
        return;
      }
      if (ms > watch.raidMaxClearMs) {
        logger.info(`${lane.label}: raid clear ignored: ~${mins(ms)}m exceeds the ${mins(watch.raidMaxClearMs)}m ceiling — likely a merge`);
        return;
      }
      // Too short to be a real clear (unless Chronicle proved the kill) → a disband.
      if (!killConfirmed && ms < watch.raidDisbandMs) {
        await handleDisband(clear);
        return;
      }
      // One "raid has ended" alert per cycle (deduped) — the recap AND the park CTA in one post.
      await gateAndAnnounce(clearedRaidEvent(clear.peak, killConfirmed, clear.number, ms));
      void (async () => {
        await durationStore.record({ ms, ts: new Date(now) });
        const [learned, samples] = await Promise.all([durationStore.median(watch.raidLearnMinSamples), durationStore.count()]);
        logger.info(
          `${zone.raidName} raid clear recorded: ~${mins(ms)}m (peak ${clear.peak}, ${samples} samples; ` +
            (learned
              ? `learned median ${mins(learned)}m now driving the about-to-clear heads-up`
              : `need ${watch.raidLearnMinSamples} to switch off the ${mins(watch.raidDurationEstimateMs)}m estimate`) +
            ")",
        );
      })().catch((error) => logger.debug(`duration: ${describeError(error)}`));
    };

    // During a departure WE detected, seek a Chronicle kill by one of this raid's roster to confirm
    // the clear early. Throttled to ~once a minute; records every fresh clean kill it sees so
    // `chroniclekills` keeps the history. Can never manufacture a clear: confirmClearNow only fires
    // on a pending departure.
    const tryChronicleConfirm = async (pending: PendingDeparture): Promise<ConfirmedClear | null> => {
      if (!chronicle) return null;
      const last = lastChronicleCheck.get(lane.label) ?? 0;
      if (now - last < 55_000) return null; // ~once a minute even if /who polls faster
      lastChronicleCheck.set(lane.label, now);
      let kills;
      try {
        kills = cleanOnyxiaKills(await chronicle.client.fetchRecentOnyxia(), chronicle.realm);
      } catch (error) {
        logger.debug(`chronicle: fetch failed (${describeError(error)})`);
        return null;
      }
      const known = await chronicle.store.knownLogIds(kills.map((k) => k.logId));
      const fresh = kills.filter((k) => !known.has(k.logId));
      if (fresh.length === 0) return null;
      const from = pending.formedAt - chronicle.matchWindowMs;
      const to = now + chronicle.matchWindowMs;
      const confirming = confirmingKills(fresh, pending.roster, from, to);
      const confirmingIds = new Set(confirming.map((k) => k.logId));
      const processedAt = new Date(now);
      for (const kill of fresh) {
        await chronicle.store
          .record({
            logId: kill.logId,
            realm: kill.realm,
            uploader: kill.uploader,
            at: kill.at,
            playerCount: kill.playerCount,
            matched: confirmingIds.has(kill.logId),
            processedAt,
          })
          .catch((error) => logger.debug(`chronicle store: ${describeError(error)}`));
      }
      return confirming.length > 0 ? lane.watch.confirmClearNow() : null;
    };

    if (cleared) {
      await handleConfirmedClear({ durationMs: cleared.durationMs, peak: cleared.peak, number: cleared.number }, false);
    } else if (chronicle) {
      const pending = lane.watch.pendingClear();
      if (pending) {
        const early = await tryChronicleConfirm(pending);
        if (early) {
          logger.info(
            `${lane.label}: Chronicle-confirmed clear #${early.number ?? "?"} (peak ${early.peak}) — skipping the ${mins(watch.raidClearSustainedMs)}m wait`,
          );
          await handleConfirmedClear(early, true);
        }
      }
    }

    // About-to-clear heads-up — LAST, and only for a raid genuinely still in the lair: not one that
    // just cleared above, nor one whose roster is already leaving. Deduped once per raid.
    const endingElapsedMs = lane.watch.raidElapsedMs(now);
    if (endingElapsedMs !== null && !lane.watch.pendingClear()) {
      const predictedMs = await predictRaidDurationMs();
      if (raidEndingDue(endingElapsedMs, predictedMs, watch.raidEndingLeadMs)) {
        await announceRaidEnding(lane.watch.raidNumber(), endingElapsedMs);
      }
    }
  };

  const onRoster = async (view: LairView): Promise<void> => {
    const now = Date.now();
    const inZone = view.present; // players in the watch area; the source already filtered + logged it
    const complete = view.complete;

    // Persist the raw observation for offline replay/stats.
    void snapshots
      .record({ ts: new Date(now), present: inZone.length, complete, names: inZone.map((p) => p.name) })
      .catch((error) => logger.debug(`snapshot: ${describeError(error)}`));

    // Feed this lair's signal so a later drop of its boss's head can tell a fresh kill (a raid was
    // here) from a saved-head turn-in (an empty lair), and spot a blind gap it must not guess across.
    noteLairPoll(lairActivity, inZone.length, now);

    const split = splitByFaction(inZone);
    // In faction mode unmapped races belong to no lane; log them so a custom Turtle/Octo race id
    // can be added to the map. (Crossfaction's lair lane includes them.)
    if (config.realmType === "faction" && split.unknown.length > 0) {
      const races = [...new Set(split.unknown.map((player) => player.raceId))].join(", ");
      logger.info(`${split.unknown.length} in ${zone.areaName} with unmapped race ids [${races}] — not attributed`);
    }
    for (const lane of lanes) {
      await processLane(lane, split, complete, now);
    }
  };

  const timerStats = async (): Promise<NamedHeartbeatTimer> => {
    const [series, learnedMedianMs] = await Promise.all([
      recentClears(),
      durationStore.median(watch.raidLearnMinSamples),
    ]);
    // Self-evaluate the learned timer: how well would its expanding-window median have predicted
    // each past clear? Logged so the overnight monitor shows whether it's good.
    const evaln = evaluateTimer(series, watch.raidLearnMinSamples);
    return {
      name: zone.raidName,
      samples: evaln.samples,
      learnedMedianMs,
      improvedMs: evaln.improvedEstimateMs,
      estimateMs: watch.raidDurationEstimateMs,
      minSamples: watch.raidLearnMinSamples,
      accuracy:
        evaln.evaluated > 0 && evaln.maeMs !== null && evaln.biasMs !== null
          ? { evaluated: evaln.evaluated, maeMs: evaln.maeMs, biasMs: evaln.biasMs }
          : null,
    };
  };

  return { zone, onRoster, raidFor, typicalClear, timerStats };
}
