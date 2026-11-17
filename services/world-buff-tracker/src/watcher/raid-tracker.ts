import type { WhoPlayer } from "../protocol/who.js";
import {
  ClearTracker,
  type ClearTrackerState,
  type ConfirmedClear,
  type PendingDeparture,
} from "./clear-tracker.js";
import { dominantGuild, type ActiveRaid, type GroupingMode } from "./raid-events.js";
import { PresenceTracker, type PresenceChange } from "./presence.js";
import { DEFAULT_GUILD_RULES, GuildLabelStabilizer, classifyGuilds, type GuildRules } from "./guild-label.js";
import type {
  LairAmbiguity,
  LairSessions,
  RaidSessionSnapshot,
  SessionConfidence,
  SessionEndReason,
} from "./raid-session.js";
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
  /** How many raids may be tracked at once in this roster. 1 (default) is the original single-roster
   *  behaviour; 2+ lets a group that assembled AFTER the tracked raid's fill window, while that raid is
   *  still at strength, be tracked as its own (tentative) session. */
  readonly maxConcurrentRaids?: number;
  /** Guild/PUG classification thresholds. */
  readonly guildRules?: GuildRules;
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
  | { readonly kind: "formed"; readonly number: number | null; readonly peak: number; readonly slot?: number }
  | {
      readonly kind: "cleared";
      readonly number: number | null;
      readonly peak: number;
      readonly durationMs: number;
      /** Proven by a Chronicle Onyxia kill (early-confirm), not just inferred from the /who departure. */
      readonly killConfirmed: boolean;
      readonly slot?: number;
    }
  | {
      readonly kind: "resumed";
      readonly number: number | null;
      /** Form → now: the raid's timer, running on from its original formation. */
      readonly elapsedMs: number;
      /** How long its members were gone. */
      readonly awayMs: number;
      readonly slot?: number;
    };

export interface RaidObservation {
  readonly events: readonly RaidLifecycleEvent[];
  /** The census for this poll (arrivals/departures/present/blackout) — for the log line. */
  readonly census: PresenceChange;
}

/** One tracked raid's machinery. Slot 0 is the original whole-roster tracker; others are concurrent cohorts. */
interface Slot {
  readonly index: number;
  readonly clears: ClearTracker;
  readonly labeler: GuildLabelStabilizer;
  live: LiveSession | null;
  /** The roster as it stood before this poll — what a secondary slot's members were when it ended. */
  lastRoster: ReadonlySet<string>;
}

interface LiveSession {
  readonly key: string;
  readonly id: number | null;
  readonly formedAt: number;
  peak: number;
  lastConfirmedAt: number;
  players: number;
  confidence: SessionConfidence;
  resumed: boolean;
  /** Evidence quality was compromised during its life (an ambiguous overlap was observed). */
  tainted: boolean;
  guild: ReturnType<typeof classifyGuilds>;
}

interface EndedSession extends LiveSession {
  readonly endedAt: number;
  readonly confirmedAt: number;
  endReason: SessionEndReason;
  clearSource: "chronicle_kill" | "roster_departure";
}

const ENDED_RETENTION_MS = 2 * 60 * 60_000;
const ENDED_MAX = 20;

export class RaidTracker {
  readonly #options: RaidTrackerOptions;
  readonly #presence = new PresenceTracker();
  readonly #rules: GuildRules;
  readonly #formAt: number;
  readonly #floor: number;
  readonly #fillWindowMs: number;
  readonly #stintGapMs: number;
  readonly #maxConcurrent: number;
  readonly #slots: Slot[] = [];
  readonly #ended: EndedSession[] = [];
  /** The latest `WhoPlayer` for everyone present or on any tracked raid's roster, so a raid's guild
   *  composition can be derived (ClearTracker keeps only names). Anyone else is forgotten. */
  readonly #seen = new Map<string, WhoPlayer>();
  /** Lair-wide arrivals, used only to judge whether unassigned players arrived together. */
  readonly #firstSeen = new Map<string, number>();
  readonly #lastSeen = new Map<string, number>();
  #ambiguity: LairAmbiguity | null = null;
  #present = 0;
  #presentNames = new Set<string>();
  #complete = true;

  constructor(options: RaidTrackerOptions) {
    this.#options = options;
    this.#rules = options.guildRules ?? DEFAULT_GUILD_RULES;
    this.#formAt = options.strengthSize ?? options.minRaidSize;
    this.#floor = options.leftFloor ?? options.minRaidSize;
    this.#fillWindowMs = options.fillWindowMs ?? 5 * 60_000;
    this.#stintGapMs = Math.max(8 * 60_000, options.clearSustainedMs * 2);
    this.#maxConcurrent = Math.max(1, Math.floor(options.maxConcurrentRaids ?? 1));
    this.#slots.push(this.#newSlot(0));
  }

  #newSlot(index: number): Slot {
    const o = this.#options;
    return {
      index,
      // The clock/tracking starts at "strength" (>= forming); the clear floor is the "leaving" level,
      // held below the plateau. Both default to minRaidSize (the original single-point).
      clears: new ClearTracker({
        formAt: this.#formAt,
        clearFloor: this.#floor,
        sustainedMs: o.clearSustainedMs,
        formConfirmMs: o.formConfirmMs,
        fillWindowMs: o.fillWindowMs,
        rosterCap: o.rosterCap,
        lockoutMs: o.lockoutMs,
        nextNumber: o.nextRaidNumber,
      }),
      labeler: new GuildLabelStabilizer(this.#rules),
      live: null,
      lastRoster: new Set(),
    };
  }

  observe(view: LairView): RaidObservation {
    const names = view.present.map((player) => player.name);
    for (const player of view.present) this.#seen.set(player.name, player);
    const census = this.#presence.observe(names, view.at, view.complete);
    this.#presentNames = new Set(names);
    this.#present = this.#presentNames.size;
    this.#complete = view.complete;
    this.#trackArrivals(names, view.at);

    if (census.blackout) {
      // Discard or resume the in-progress measurement (ClearTracker decides from its own roster); no events.
      for (const slot of [...this.#slots]) {
        slot.lastRoster = new Set(slot.clears.members);
        slot.clears.observe(this.#namesFor(slot, names, view.at), view.at, true, view.complete);
        this.#settle(slot, null, names, view);
      }
      this.#ambiguity = null;
      this.#forgetStrangers(names);
      return { events: [], census };
    }

    const events: RaidLifecycleEvent[] = [];
    for (const slot of [...this.#slots]) {
      slot.lastRoster = new Set(slot.clears.members);
      const obs = slot.clears.observe(this.#namesFor(slot, names, view.at), view.at, false, view.complete);
      const tag = slot.index > 0 ? { slot: slot.index } : {};
      if (obs.formed) events.push({ kind: "formed", number: obs.formed.number, peak: obs.formed.peak, ...tag });
      if (obs.resumed) events.push({ kind: "resumed", ...obs.resumed, ...tag });
      if (obs.clear) {
        events.push({
          kind: "cleared",
          number: obs.clear.number,
          peak: obs.clear.peak,
          durationMs: obs.clear.durationMs,
          killConfirmed: false,
          ...tag,
        });
      }
      this.#settle(slot, obs, names, view);
    }
    this.#detectConcurrent(names, view);
    for (const slot of this.#slots) this.#refreshGuild(slot);
    this.#forgetStrangers(names);
    return { events, census };
  }

  /** Names a slot should see this poll. Slot 0 sees everyone not claimed by another raid (identical to
   *  the original single roster when only one slot exists). A secondary sees its own members plus
   *  unclaimed players who had arrived by the end of its fill window — never later strangers. */
  #namesFor(slot: Slot, names: readonly string[], now: number): string[] {
    const claimedByOthers = (name: string): boolean =>
      this.#slots.some((other) => other !== slot && other.clears.members.has(name));
    if (slot.index === 0) return names.filter((name) => !claimedByOthers(name));
    const formedAt = slot.clears.formedAt ?? now;
    const deadline = formedAt + this.#fillWindowMs;
    return names.filter(
      (name) => slot.clears.members.has(name) || (!claimedByOthers(name) && (this.#firstSeen.get(name) ?? now) <= deadline),
    );
  }

  /** Reconcile a slot's session record with its tracker after a poll. */
  #settle(
    slot: Slot,
    obs: { clear: { durationMs: number } | null; resumed: unknown } | null,
    names: readonly string[],
    view: LairView,
  ): void {
    const c = slot.clears;
    const at = view.at;
    if (obs?.clear && slot.live) {
      this.#end(slot, "departed", slot.live.formedAt + obs.clear.durationMs, "roster_departure", at);
    } else if (obs?.resumed && slot.live === null) {
      const back = this.#ended.findIndex((e) => (c.number !== null ? e.id === c.number : e.formedAt === c.formedAt));
      if (back >= 0) {
        const [revived] = this.#ended.splice(back, 1);
        if (revived) {
          const { endedAt: _e, confirmedAt: _a, endReason: _r, clearSource: _c, ...live } = revived;
          slot.live = { ...live, resumed: true };
        }
      }
    }
    if (slot.live !== null && !c.tracking) {
      // Tracker reset without a clear: a blind gap lost the raid. Its end is unknown — not a clear.
      this.#end(slot, "interrupted", at, "roster_departure");
    }
    if (slot.live === null && c.confirmed && c.formedAt !== null) {
      const state = c.snapshot();
      slot.live = {
        key: c.number !== null ? `n${c.number}` : `u${c.formedAt}-${slot.index}`,
        id: c.number,
        formedAt: c.formedAt,
        peak: state?.peak ?? this.#formAt,
        lastConfirmedAt: at,
        players: 0,
        confidence: slot.index === 0 ? "high" : "tentative",
        resumed: false,
        tainted: false,
        guild: classifyGuilds([], this.#rules),
      };
    }
    if (slot.live !== null && c.tracking) {
      let cohort = 0;
      for (const name of names) if (c.members.has(name)) cohort += 1;
      slot.live.players = cohort;
      if (cohort > slot.live.peak) slot.live.peak = cohort;
      if (cohort >= this.#floor) slot.live.lastConfirmedAt = at;
    }
    // A secondary with nothing live and nothing tracked is spent: free the slot and keep its former
    // members from founding a phantom raid elsewhere.
    if (slot.index > 0 && slot.live === null && !c.tracking) {
      for (const other of this.#slots) if (other !== slot) other.clears.lockExternal(slot.lastRoster, at);
      this.#slots.splice(this.#slots.indexOf(slot), 1);
    }
  }

  #end(slot: Slot, reason: SessionEndReason, endedAt: number, source: "chronicle_kill" | "roster_departure", confirmedAt = endedAt): void {
    const live = slot.live;
    if (live === null) return;
    slot.live = null;
    this.#ended.push({ ...live, endedAt, confirmedAt, endReason: reason, clearSource: source });
    this.#ended.sort((a, b) => b.endedAt - a.endedAt);
    while (this.#ended.length > ENDED_MAX) this.#ended.pop();
    for (let i = this.#ended.length - 1; i >= 0; i -= 1) {
      const item = this.#ended[i];
      if (item && endedAt - item.endedAt > ENDED_RETENTION_MS) this.#ended.splice(i, 1);
    }
  }

  /**
   * Is there a second group in the lair that arrived apart from the tracked raid? Only when another
   * raid is at strength right now, the view is complete, the unassigned group reaches strength on its
   * own, arrived together, and arrived AFTER the tracked raid's fill window. Anything else that looks
   * like a second group is reported as ambiguity — never as a confirmed raid.
   */
  #detectConcurrent(names: readonly string[], view: LairView): void {
    this.#ambiguity = null;
    const at = view.at;
    const strong = this.#slots.filter((slot) => {
      if (!slot.clears.confirmed) return false;
      let cohort = 0;
      for (const name of names) if (slot.clears.members.has(name)) cohort += 1;
      return cohort >= this.#floor;
    });
    if (strong.length === 0) return;
    const residual = names.filter(
      (name) =>
        !this.#slots.some((slot) => slot.clears.members.has(name)) &&
        !this.#slots.some((slot) => slot.clears.isLockedAt(name, at)),
    );
    if (residual.length < this.#formAt) return;
    if (!view.complete) {
      this.#ambiguity = { kind: "truncated_view", players: residual.length, reason: "/who list truncated; extra players cannot be assigned" };
      return;
    }
    const byArrival = residual
      .map((name) => ({ name, at: this.#firstSeen.get(name) ?? at }))
      .sort((a, b) => a.at - b.at);
    let best: typeof byArrival = [];
    for (let i = 0, j = 0; i < byArrival.length; i += 1) {
      while (j < byArrival.length && (byArrival[j]?.at ?? 0) - (byArrival[i]?.at ?? 0) <= this.#fillWindowMs) j += 1;
      if (j - i > best.length) best = byArrival.slice(i, j);
    }
    if (best.length < this.#formAt) {
      this.#ambiguity = { kind: "staggered_arrivals", players: residual.length, reason: "extra players arrived too spread out to form a group" };
      return;
    }
    const clusterStart = best[0]?.at ?? at;
    const overlaps = strong.some((slot) => clusterStart <= (slot.clears.formedAt ?? at) + this.#fillWindowMs);
    if (overlaps) {
      this.#ambiguity = { kind: "overlapping_assembly", players: best.length, reason: "a second group assembled while the first was forming; /who cannot separate them" };
      for (const slot of this.#slots) if (slot.live) slot.live.tainted = true;
      return;
    }
    if (this.#slots.length >= this.#maxConcurrent) {
      this.#ambiguity = { kind: "staggered_arrivals", players: best.length, reason: "concurrent raid limit reached" };
      return;
    }
    const slot = this.#newSlot(Math.max(...this.#slots.map((s) => s.index)) + 1);
    this.#slots.push(slot);
    slot.clears.observe(best.map((entry) => entry.name), at, false, true);
    this.#settle(slot, null, names, view);
  }

  /** Update a slot's guild composition and confidence from its own roster only. */
  #refreshGuild(slot: Slot): void {
    const live = slot.live;
    if (live === null) return;
    const roster = [...slot.clears.members].map((name) => ({ name, guild: this.#seen.get(name)?.guild }));
    live.guild = slot.labeler.update(classifyGuilds(roster, this.#rules));
    if (slot.index > 0) {
      // Upgrade a timing-only cohort to high confidence only when two distinct guild raids coexist.
      const primary = this.#slots[0]?.live;
      const distinct =
        primary !== null &&
        primary !== undefined &&
        primary.guild.kind === "guild" &&
        live.guild.kind === "guild" &&
        primary.guild.label !== live.guild.label;
      live.confidence = distinct && !live.tainted ? "high" : "tentative";
    } else {
      live.confidence = "high";
    }
  }

  /** How many players' details are held — everyone present plus the tracked raids' rosters. */
  get rememberedPlayers(): number {
    return this.#seen.size;
  }

  /** Record when each present player was first seen; reset after an absence longer than a stint gap. */
  #trackArrivals(names: readonly string[], now: number): void {
    for (const name of names) {
      const last = this.#lastSeen.get(name);
      if (last === undefined || now - last > this.#stintGapMs) this.#firstSeen.set(name, now);
      this.#lastSeen.set(name, now);
    }
    const present = new Set(names);
    for (const [name, last] of this.#lastSeen) {
      if (!present.has(name) && now - last > this.#stintGapMs && !this.#slots.some((slot) => slot.clears.members.has(name))) {
        this.#lastSeen.delete(name);
        this.#firstSeen.delete(name);
      }
    }
  }

  /** Drop details of anyone neither in the lair now nor on a tracked raid's roster. */
  #forgetStrangers(present: readonly string[]): void {
    const keep = new Set(present);
    for (const name of this.#seen.keys()) {
      if (!keep.has(name) && !this.#slots.some((slot) => slot.clears.members.has(name))) this.#seen.delete(name);
    }
  }

  #confirmedSlots(): Slot[] {
    return this.#slots
      .filter((slot) => slot.clears.confirmed)
      .sort((a, b) => (a.clears.formedAt ?? 0) - (b.clears.formedAt ?? 0));
  }

  /** The raid(s) in progress — for the status query. One while a single raid is tracked. */
  activeRaids(): ActiveRaid[] {
    const raids: ActiveRaid[] = [];
    for (const slot of this.#slots) {
      const snap = slot.clears.snapshot();
      if (snap === null) continue;
      if (slot.index > 0) {
        raids.push({ label: `raid${snap.number === null ? "" : ` #${snap.number}`}`, count: snap.roster.length, peak: snap.peak });
        continue;
      }
      const players = snap.roster
        .map((name) => this.#seen.get(name))
        .filter((player): player is WhoPlayer => player !== undefined);
      const guild = dominantGuild(players);
      const label = guild ? `the lair (mostly <${guild.guild}>)` : "the lair";
      raids.push({ label, count: snap.roster.length, peak: snap.peak });
    }
    return raids;
  }

  /** How long the longest-running raid in progress has been in the lair (form → now, spanning wipes), or null. */
  raidElapsedMs(now: number): number | null {
    const first = this.#confirmedSlots()[0];
    return first ? first.clears.elapsedMs(now) : null;
  }

  /** The reference number of the longest-running raid in progress, or null if none. */
  raidNumber(): number | null {
    return this.#confirmedSlots()[0]?.clears.number ?? null;
  }

  /** A departure detected but not yet confirmed (still inside the sustained wait), or null — so a
   *  Chronicle kill can confirm the clear early. */
  pendingClear(): PendingDeparture | null {
    for (const slot of this.#slots) {
      const pending = slot.clears.pending();
      if (pending) return pending;
    }
    return null;
  }

  /** Confirm a pending departure now (a Chronicle kill proved it), returning the clear the wait would
   *  have produced, or null if none is pending. Never manufactures a clear. */
  confirmClearNow(now = Date.now()): ConfirmedClear | null {
    for (const slot of this.#slots) {
      if (slot.clears.pending() === null) continue;
      const formedAt = slot.clears.formedAt;
      const clear = slot.clears.confirmNow();
      if (clear && formedAt !== null) this.#end(slot, "kill_confirmed", formedAt + clear.durationMs, "chronicle_kill", Math.max(now, formedAt + clear.durationMs));
      return clear;
    }
    return null;
  }

  /** The pipeline judged a just-ended raid a disband (left too soon to have killed the boss). */
  annotateEnd(number: number | null, reason: SessionEndReason): void {
    const ended = this.#ended.find((e) => e.id === number);
    if (ended) ended.endReason = reason;
  }

  /**
   * Every raid session this tracker knows: those in progress and the recently ended. Aggregate
   * guild data only — never character names.
   */
  sessions(): LairSessions {
    const toSnap = (s: LiveSession, rosterSize: number, ended?: EndedSession): RaidSessionSnapshot => {
      const size = Math.max(rosterSize, 1);
      const trusted =
        ended !== undefined &&
        (ended.endReason === "kill_confirmed" || ended.endReason === "departed") &&
        s.confidence === "high" &&
        !s.tainted;
      return {
        id: s.id,
        key: s.key,
        status: ended !== undefined ? "ended" : "in_progress",
        confidence: s.confidence,
        formedAt: s.formedAt,
        lastConfirmedAt: s.lastConfirmedAt,
        players: s.players,
        peak: s.peak,
        rosterSize,
        continuity: Math.min(1, s.players / size),
        guild: s.guild,
        trusted,
        resumed: s.resumed,
        ...(ended !== undefined ? { endedAt: ended.endedAt, confirmedAt: ended.confirmedAt, endReason: ended.endReason, clearSource: ended.clearSource } : {}),
      };
    };
    const live: RaidSessionSnapshot[] = [];
    for (const slot of this.#confirmedSlots()) {
      if (slot.live === null) continue;
      const snap = toSnap(slot.live, slot.clears.members.size);
      live.push(slot.clears.belowSince !== null ? { ...snap, status: "leaving" } : snap);
    }
    const ended = this.#ended.map((e) => toSnap(e, e.guild.rosterSize, e));
    const assigned = new Set<string>();
    for (const slot of this.#slots) for (const name of slot.clears.members) if (this.#presentNames.has(name)) assigned.add(name);
    return {
      sessions: [...live, ...ended],
      ambiguity: this.#ambiguity,
      present: this.#present,
      complete: this.#complete,
      unassigned: Math.max(0, this.#present - assigned.size),
    };
  }

  /** The primary raid in progress as a persistable snapshot, or null — to survive a restart. */
  raidStateSnapshot(): ClearTrackerState | null {
    return this.#slots.find((slot) => slot.index === 0)?.clears.snapshot() ?? null;
  }

  /** Concurrent (non-primary) raids in progress, to persist under their own keys. */
  extraRaidStates(): { slot: number; state: ClearTrackerState }[] {
    const out: { slot: number; state: ClearTrackerState }[] = [];
    for (const slot of this.#slots) {
      if (slot.index === 0) continue;
      const state = slot.clears.snapshot();
      if (state) out.push({ slot: slot.index, state });
    }
    return out;
  }

  /** Resume a persisted raid on startup, so a mid-raid restart still catches its exit. */
  restoreRaidState(state: ClearTrackerState, slotIndex = 0): void {
    let slot = this.#slots.find((s) => s.index === slotIndex);
    if (!slot) {
      if (this.#slots.length >= this.#maxConcurrent) return;
      slot = this.#newSlot(slotIndex);
      this.#slots.push(slot);
    }
    slot.clears.restore(state);
  }

  /** The lockout ledger as a plain object, to persist so the Onyxia lockout survives a restart. */
  lockoutSnapshot(): Record<string, number> {
    const merged: Record<string, number> = {};
    for (const slot of this.#slots) {
      for (const [name, at] of Object.entries(slot.clears.lockoutSnapshot())) merged[name] = Math.max(merged[name] ?? 0, at);
    }
    return merged;
  }

  /** Restore the persisted lockout ledger on startup, so a redeploy doesn't clear the locks. */
  restoreLockout(entries: Record<string, number>): void {
    for (const slot of this.#slots) slot.clears.restoreLockout(entries);
  }
}
