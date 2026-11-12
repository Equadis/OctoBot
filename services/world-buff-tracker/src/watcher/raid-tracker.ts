import type { WhoPlayer } from "../protocol/who.js";
import {
  ClearTracker,
  type ClearTrackerState,
  type ConfirmedClear,
  type PendingDeparture,
} from "./clear-tracker.js";
import { dominantGuild, type ActiveRaid, type GroupingMode } from "./raid-events.js";
import { PresenceTracker, type PresenceChange } from "./presence.js";
import type { LairView } from "./roster-source.js";

/**
 * The one state machine for raid lifecycle over a roster — a whole lair (crossfaction) or one
 * faction's slice (faction realm). It replaces the RaidWatch/RaidTracker/ClearTracker trio behind a
 * single seam: feed it a `LairView` per poll, read back the lifecycle events it emits, and it owns
 * the census (arrivals/blackout) and the per-raid clear detection. See RAID_ARCHITECTURE.md.
 *
 * TODAY IT TRACKS ONE RAID over the whole roster (via ClearTracker), which is byte-identical to what
 * RaidWatch did — the grouping mode and concurrent-raid cohorts are wired in a following step. The
 * event stream (`RaidLifecycleEvent`) is the stable interface the rest of the pipeline consumes, so
 * adding concurrent raids changes what this emits, not how the loop reads it.
 *
 * Blackout (a long blind gap) is absorbed internally: the clear tracker resumes the raid if its own
 * members are still present or discards it otherwise, and no events fire — so a crash-and-refill is
 * never read as a raid starting or ending.
 */
export interface RaidTrackerOptions {
  readonly minRaidSize: number;
  /** How to partition concurrent raids. Unused while one raid is tracked; wired in a following step. */
  readonly grouping: GroupingMode;
  /** Retained for the options shape; the clear floor is `leftFloor`. */
  readonly clearSize: number;
  /** Members the raid must reach for the clock to start (the duration clock's start, and the poll the
   *  "formed" event fires). Defaults to minRaidSize. */
  readonly strengthSize?: number;
  /** Below this many of the roster present, the raid is "leaving" (the clear floor), held below the
   *  plateau so churn isn't read as a departure. Defaults to minRaidSize. */
  readonly leftFloor?: number;
  /** How long the roster must stay gone for a departure to count as a real clear (not a wipe). */
  readonly clearSustainedMs: number;
  /** How long the roster must hold at strength (uninterrupted) before the "formed" event fires —
   *  0 (default) fires the instant strength is reached. See ClearTracker.formConfirmMs. */
  readonly formConfirmMs?: number;
  /** A player in one raid can't found/join a different raid for this long — the Onyxia lockout rule. */
  readonly lockoutMs?: number;
  /** A newcomer joins the tracked raid only if they first appeared within this long of formation. */
  readonly fillWindowMs?: number;
  /** The tracked roster never grows past this — a backstop against absorbing a second raid. */
  readonly rosterCap?: number;
  /** Assigns the next raid reference number when a raid forms. Omit to leave raids unnumbered. */
  readonly nextRaidNumber?: () => number;
}

/**
 * What the tracker reports about a raid crossing a lifecycle boundary this poll. A pure,
 * roster-driven signal: `formed` the poll a raid reaches strength (first has a number), `cleared`
 * the poll a sustained departure is confirmed, `resumed` the poll a raid read as cleared has its
 * members back (a wipe whose run-back outlasted the wait). The "about to clear" heads-up (time vs. predicted
 * duration) and the disband/stand-down decisions (plausibility thresholds) are NOT tracker state —
 * the loop derives them from the elapsed time and the clear event.
 */
export type RaidLifecycleEvent =
  | { readonly kind: "formed"; readonly number: number | null; readonly peak: number }
  | {
      readonly kind: "cleared";
      readonly number: number | null;
      readonly peak: number;
      readonly durationMs: number;
      /** Proven by a Chronicle Onyxia kill (early-confirm), not just inferred from the /who departure. */
      readonly killConfirmed: boolean;
    }
  | {
      readonly kind: "resumed";
      readonly number: number | null;
      /** Form → now: the raid's timer, running on from its original formation. */
      readonly elapsedMs: number;
      /** How long its members were gone. */
      readonly awayMs: number;
    };

export interface RaidObservation {
  readonly events: readonly RaidLifecycleEvent[];
  /** The census for this poll (arrivals/departures/present/blackout) — for the log line. */
  readonly census: PresenceChange;
}

export class RaidTracker {
  readonly #presence = new PresenceTracker();
  readonly #clears: ClearTracker;
  /** The latest `WhoPlayer` for everyone present or on the tracked raid's roster, so the raid's
   *  guild label can be derived for the status readout (ClearTracker keeps only names). Anyone else
   *  is forgotten: the lair sees new visitors all day, and only a roster member's details are ever
   *  read. */
  readonly #seen = new Map<string, WhoPlayer>();

  constructor(options: RaidTrackerOptions) {
    this.#clears = new ClearTracker({
      // The clock/tracking starts at "strength" (>= forming); the clear floor is the "leaving" level,
      // held below the plateau. Both default to minRaidSize (the original single-point).
      formAt: options.strengthSize ?? options.minRaidSize,
      clearFloor: options.leftFloor ?? options.minRaidSize,
      sustainedMs: options.clearSustainedMs,
      formConfirmMs: options.formConfirmMs,
      fillWindowMs: options.fillWindowMs,
      rosterCap: options.rosterCap,
      lockoutMs: options.lockoutMs,
      nextNumber: options.nextRaidNumber,
    });
  }

  observe(view: LairView): RaidObservation {
    const names = view.present.map((player) => player.name);
    for (const player of view.present) this.#seen.set(player.name, player);
    const census = this.#presence.observe(names, view.at, view.complete);
    if (census.blackout) {
      // Discard or resume the in-progress measurement (ClearTracker decides from its own roster); no events.
      this.#clears.observe(names, view.at, true, view.complete);
      this.#forgetStrangers(names);
      return { events: [], census };
    }
    const obs = this.#clears.observe(names, view.at, false, view.complete);
    this.#forgetStrangers(names);
    const events: RaidLifecycleEvent[] = [];
    if (obs.formed) events.push({ kind: "formed", number: obs.formed.number, peak: obs.formed.peak });
    if (obs.resumed) events.push({ kind: "resumed", ...obs.resumed });
    if (obs.clear) {
      events.push({
        kind: "cleared",
        number: obs.clear.number,
        peak: obs.clear.peak,
        durationMs: obs.clear.durationMs,
        killConfirmed: false,
      });
    }
    return { events, census };
  }

  /** How many players' details are held — everyone present plus the tracked raid's roster. */
  get rememberedPlayers(): number {
    return this.#seen.size;
  }

  /** Drop details of anyone neither in the lair now nor on the tracked raid's roster. Runs after the
   *  roster has absorbed this poll's arrivals, so a newcomer who just joined it is kept. */
  #forgetStrangers(present: readonly string[]): void {
    const keep = new Set(present);
    for (const name of this.#seen.keys()) {
      if (!keep.has(name) && !this.#clears.members.has(name)) this.#seen.delete(name);
    }
  }

  /** The raid(s) in progress — for the status query. One while a single raid is tracked. */
  activeRaids(): ActiveRaid[] {
    const snap = this.#clears.snapshot();
    if (snap === null) return [];
    const players = snap.roster
      .map((name) => this.#seen.get(name))
      .filter((player): player is WhoPlayer => player !== undefined);
    const guild = dominantGuild(players);
    const label = guild ? `the lair (mostly <${guild.guild}>)` : "the lair";
    return [{ label, count: snap.roster.length, peak: snap.peak }];
  }

  /** How long the raid in progress has been in the lair (form → now, spanning wipes), or null. */
  raidElapsedMs(now: number): number | null {
    return this.#clears.elapsedMs(now);
  }

  /** The reference number of the raid in progress, or null if none. */
  raidNumber(): number | null {
    return this.#clears.number;
  }

  /** A departure detected but not yet confirmed (still inside the sustained wait), or null — so a
   *  Chronicle kill can confirm the clear early. */
  pendingClear(): PendingDeparture | null {
    return this.#clears.pending();
  }

  /** Confirm a pending departure now (a Chronicle kill proved it), returning the clear the wait would
   *  have produced, or null if none is pending. Never manufactures a clear. */
  confirmClearNow(): ConfirmedClear | null {
    return this.#clears.confirmNow();
  }

  /** The raid in progress as a persistable snapshot, or null — to survive a restart. */
  raidStateSnapshot(): ClearTrackerState | null {
    return this.#clears.snapshot();
  }

  /** Resume a persisted raid on startup, so a mid-raid restart still catches its exit. */
  restoreRaidState(state: ClearTrackerState): void {
    this.#clears.restore(state);
  }

  /** The lockout ledger as a plain object, to persist so the Onyxia lockout survives a restart. */
  lockoutSnapshot(): Record<string, number> {
    return this.#clears.lockoutSnapshot();
  }

  /** Restore the persisted lockout ledger on startup, so a redeploy doesn't clear the locks. */
  restoreLockout(entries: Record<string, number>): void {
    this.#clears.restoreLockout(entries);
  }
}
