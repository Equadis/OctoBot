/**
 * Measures how long a raid actually takes to clear Onyxia — the ground truth for the
 * self-improving timer, and the trigger for the "raid ended / about to clear" alerts — by
 * tracking the RAID'S MEMBERS, not just the head count.
 *
 * What the /who count really does (measured 2026-08-31 on a live raid):
 *   - a raid holds a PLATEAU (~30) for long stretches,
 *   - it WIPES: the count crashes to 5–13 for 2–4 min, then recovers as everyone runs
 *     back (/who does NOT show them while dead / on the corpse run),
 *   - it CLEARS only when the members drop out and STAY out — nobody runs back.
 *
 * ARRIVAL COHORT (measured 2026-09-03): a raid assembles fast — median 2 min, p90 5 min — and
 * the next raid is ~30+ min behind it. So a raid IS the players who showed up together around
 * formation. On a busy server the lair never empties (one raid clears as the next forms), so an
 * absorb-everyone roster merges consecutive raids into one endless session that never clears
 * (measured: 2 clears detected in 14h of ~10). The fix: absorb a newcomer into the tracked raid
 * ONLY if they FIRST appeared within `fillWindowMs` of formation (and the roster is under
 * `rosterCap`). Someone arriving well after that is a different raid and is left for the NEXT
 * formation — so the current raid's departure is detected even while the lair stays full.
 *
 * A player's first-seen resets after an absence longer than `stintGapMs` (longer than a corpse
 * run, shorter than the gap between raids), so a wipe-returner keeps their place but someone who
 * left and comes back for a later raid counts as a fresh arrival.
 *
 * A departure is a clear only once cohort-present stays below strength for `sustainedMs` (a wipe
 * recovers well inside that). A blackout (our DC or a server outage) discards the in-progress
 * measurement rather than reading the mass drop as an instant clear.
 *
 * LOCKOUT RULE: Onyxia is a lockout boss, so a character cannot be in two distinct raids. While a
 * raid is tracked, every roster member is "locked" to it (for `lockoutMs`). A NEW raid forms only
 * from players who are NOT locked — so a cleared raid's members, lingering in the lair after the
 * kill, cannot re-trip "raid formed" as a phantom duplicate (the #96/#97 case). The lock outlives
 * the clear (it persists `lockoutMs`, not just while present) and survives a blind gap.
 *
 * FALSE CLEAR: a wipe whose run-back outlasts `sustainedMs` reads as a clear. The lockout keeps its
 * returning members from founding a new raid, so the cleared raid is kept aside: if at least
 * `clearFloor` of its own members come back while still locked to it, the raid RESUMES — same
 * number, same form time, its timer running on. A kill proven by Chronicle (`confirmNow`) is final
 * and never resumes.
 */
export interface ClearTrackerOptions {
  /** A raid is present once this many players are in the zone. */
  readonly formAt: number;
  /** Below this many of the ROSTER present, the raid is "not present" (a wipe trough or a
   *  real departure). Default: formAt. */
  readonly clearFloor?: number;
  /** Roster members must stay below `clearFloor` this long to confirm a clear (not a wipe). */
  readonly sustainedMs: number;
  /** After reaching strength, the roster must hold at/above `clearFloor` CONTINUOUSLY for this long
   *  before the formation is announced — so a group that assembles and leaves without committing does
   *  not fire a "raid forming" alert. A disconnect (blackout) or a drop below the floor and back
   *  (players left and re-entered) RESETS the count. Default 0 = announce the instant strength is
   *  reached (the original behaviour). */
  readonly formConfirmMs?: number;
  /** A newcomer joins the tracked raid only if they first appeared within this long of formation.
   *  Measured raid assembly is median 2 min / p90 5 min. Default 5 min. */
  readonly fillWindowMs?: number;
  /** The tracked roster never grows past this — a backstop against absorbing a second raid.
   *  Default 30 (about one raid's worth). */
  readonly rosterCap?: number;
  /** A player absent longer than this has their first-seen reset on return (so a returner for a
   *  later raid is a fresh arrival, not a stale early one). Longer than a corpse run, shorter than
   *  the gap between raids. Default max(8 min, 2× sustained). */
  readonly stintGapMs?: number;
  /** A player in one raid's roster cannot found or join a DIFFERENT raid for this long — the Onyxia
   *  lockout rule. Stops a cleared raid's lingering members from re-forming a phantom raid, and is how
   *  long a raid read as cleared can resume when they return. Default 2h. */
  readonly lockoutMs?: number;
  /** Assigns the next monotonic raid number when a raid forms. Omit to leave raids unnumbered. */
  readonly nextNumber?: () => number;
}

export interface ConfirmedClear {
  /** form → the departure that stuck (spans any wipes in between). */
  readonly durationMs: number;
  /** The plateau peak — the true raid size, not a wipe trough. */
  readonly peak: number;
  /** The raid's reference number, or null if numbering isn't configured. */
  readonly number: number | null;
}

/** A raid just reached strength this poll — the first moment it has a reference number. The
 *  "a raid has formed" alert fires from this (not the detector's lower forming threshold, where
 *  no number exists yet), so the alert can name the raid the same #N the clear will. */
export interface FormedRaid {
  readonly number: number | null;
  readonly peak: number;
}

/** A raid read as cleared whose own members came back while still locked to it — a wipe whose
 *  run-back outlasted the sustained wait. It carries on as the same raid (see FALSE CLEAR). */
export interface ResumedRaid {
  readonly number: number | null;
  /** Form → now: the raid's timer, running on from its original formation. */
  readonly elapsedMs: number;
  /** How long its members were gone: the start of the departure read as a clear → now. */
  readonly awayMs: number;
}

/** What one `observe` poll produced: a confirmed clear, a fresh formation, a resumed raid, or none
 *  (the usual case — a raid still in progress). A single poll produces at most one of them. */
export interface ClearObservation {
  readonly clear: ConfirmedClear | null;
  readonly formed: FormedRaid | null;
  readonly resumed: ResumedRaid | null;
}

/** A poll that crossed no lifecycle boundary. */
const NO_CHANGE: ClearObservation = { clear: null, formed: null, resumed: null };

/** A raid read as cleared, kept so it can resume if its members return (see FALSE CLEAR). */
interface ClearedRaid {
  readonly formedAt: number;
  readonly number: number | null;
  readonly roster: ReadonlySet<string>;
  readonly peak: number;
  /** When its departure began — the clear's end point. */
  readonly departedAt: number;
}

/**
 * A departure we've DETECTED (the roster fell below the clear floor) but not yet confirmed — it
 * is still inside the sustained-wait window, so it could still be a wipe. Exposed so the caller
 * can seek independent proof (a Chronicle kill log by one of this roster) and, if found, confirm
 * early via `confirmNow` instead of waiting the window out. Never produced without our own
 * detection first: Chronicle is confirmation ON TOP of the departure, never the trigger.
 */
export interface PendingDeparture {
  readonly roster: readonly string[];
  readonly number: number | null;
  readonly peak: number;
  readonly formedAt: number;
  readonly belowSince: number;
}

/** A tracked raid's full state, so it survives a restart (persisted to the DB). Only ever
 *  produced while a raid is in progress; the tracker resumes exactly where it left off. */
export interface ClearTrackerState {
  readonly formedAt: number;
  readonly number: number | null;
  readonly roster: readonly string[];
  readonly peak: number;
  readonly belowSince: number | null;
}

const DEFAULT_FILL_WINDOW_MS = 5 * 60_000;
const DEFAULT_ROSTER_CAP = 30;
const DEFAULT_LOCKOUT_MS = 2 * 60 * 60_000;

export class ClearTracker {
  readonly #formAt: number;
  readonly #clearFloor: number;
  readonly #sustainedMs: number;
  readonly #fillWindowMs: number;
  readonly #rosterCap: number;
  readonly #stintGapMs: number;
  readonly #confirmMs: number;
  readonly #lockoutMs: number;
  readonly #nextNumber?: () => number;

  #formedAt: number | null = null;
  #number: number | null = null;
  #roster = new Set<string>(); // this raid's members — the arrival cohort, capped, not everyone present
  #peak = 0;
  #belowSince: number | null = null; // when the roster's presence first fell below strength
  #confirmed = false; // the forming raid has held long enough to announce (see #confirmMs)
  #stableSince: number | null = null; // start of the current uninterrupted >= floor stretch, while forming
  // Lair-wide arrival tracking, used to decide who belongs to the current raid. Persists across
  // raids (a clear resets the raid, not this); only a blackout clears it.
  #firstSeen = new Map<string, number>();
  #lastSeen = new Map<string, number>();
  // The lockout ledger: name -> when it was last locked to a raid. A locked player cannot found or
  // join a DIFFERENT raid until `lockoutMs` after their raid last held them. Outlives the clear and a
  // blind gap (a DC doesn't un-lock anyone); pruned on expiry.
  #locked = new Map<string, number>();
  // The last raid read as cleared by the sustained wait, while it can still resume (FALSE CLEAR).
  #cleared: ClearedRaid | null = null;

  constructor(options: ClearTrackerOptions) {
    this.#formAt = options.formAt;
    this.#clearFloor = options.clearFloor ?? options.formAt;
    this.#sustainedMs = options.sustainedMs;
    this.#fillWindowMs = options.fillWindowMs ?? DEFAULT_FILL_WINDOW_MS;
    this.#rosterCap = options.rosterCap ?? DEFAULT_ROSTER_CAP;
    this.#stintGapMs = options.stintGapMs ?? Math.max(8 * 60_000, options.sustainedMs * 2);
    this.#confirmMs = options.formConfirmMs ?? 0;
    this.#lockoutMs = options.lockoutMs ?? DEFAULT_LOCKOUT_MS;
    this.#nextNumber = options.nextNumber;
  }

  /** True while a raid is being tracked (formed, not yet cleared). */
  get tracking(): boolean {
    return this.#formedAt !== null;
  }

  /** The tracked raid's members — confirmed or still forming, present or already gone. Empty when
   *  no raid is tracked. Read-only: the roster changes only through `observe`/`restore`. */
  get members(): ReadonlySet<string> {
    return this.#roster;
  }

  /** The current raid's reference number, or null if none is tracked / numbering is off. */
  get number(): number | null {
    return this.#number;
  }

  /** A snapshot of the raid in progress for persistence, or null. Only a CONFIRMED raid is persisted:
   *  a restart is itself a disconnect, so a still-forming raid restarts its confirm count after it. */
  snapshot(): ClearTrackerState | null {
    if (this.#formedAt === null || !this.#confirmed) return null;
    return {
      formedAt: this.#formedAt,
      number: this.#number,
      roster: [...this.#roster],
      peak: this.#peak,
      belowSince: this.#belowSince,
    };
  }

  /** Resume a persisted raid (after a restart), so its exit is still detected and it keeps
   *  its number/form-time. Ignored if a raid is already being tracked. */
  restore(state: ClearTrackerState): void {
    if (this.#formedAt !== null) return;
    this.#formedAt = state.formedAt;
    this.#number = state.number;
    this.#roster = new Set(state.roster);
    this.#peak = state.peak;
    this.#belowSince = state.belowSince;
    this.#confirmed = true; // only confirmed raids are ever snapshotted
  }

  /** The lockout ledger (name -> locked-at ms) as a plain object, to persist across a restart — so a
   *  redeploy doesn't clear the locks and let a just-cleared raid's members re-form a phantom. */
  lockoutSnapshot(): Record<string, number> {
    return Object.fromEntries(this.#locked);
  }

  /** Restore a persisted lockout ledger on boot, merging into whatever is held (empty on a fresh
   *  process). Expired entries are dropped on the next `observe`. */
  restoreLockout(entries: Record<string, number>): void {
    for (const [name, at] of Object.entries(entries)) this.#locked.set(name, at);
  }

  /** How long the tracked raid has been in (form → now, spanning wipes), or null if none — or if the
   *  raid is still forming (not yet confirmed), so a forming raid never appears in the status/heads-up. */
  elapsedMs(now: number): number | null {
    return this.#formedAt === null || !this.#confirmed ? null : now - this.#formedAt;
  }

  /**
   * A departure detected but not yet confirmed (roster below the floor, still inside the
   * sustained-wait window), or null. If `observe` just confirmed and reset this poll, this is
   * null — so it only ever reports a departure that is genuinely still waiting.
   */
  pending(): PendingDeparture | null {
    if (this.#formedAt === null || !this.#confirmed || this.#belowSince === null) return null;
    return {
      roster: [...this.#roster],
      number: this.#number,
      peak: this.#peak,
      formedAt: this.#formedAt,
      belowSince: this.#belowSince,
    };
  }

  /**
   * Confirm a pending departure NOW, skipping the rest of the sustained wait — for when
   * independent proof (a Chronicle kill) shows the raid really finished. Returns the same
   * ConfirmedClear the wait would have produced (duration form → departure-start) and resets.
   * Null if no departure is pending: it can never manufacture a clear on its own. The kill is
   * proven, so the raid is final — it never resumes.
   */
  confirmNow(): ConfirmedClear | null {
    if (this.#formedAt === null || !this.#confirmed || this.#belowSince === null) return null;
    const clear = this.#clearOf(this.#formedAt, this.#belowSince);
    this.#cleared = null;
    this.#reset();
    return clear;
  }

  /**
   * Feed one poll's players (names in the watched zone). Reports a fresh formation the poll a
   * raid first reaches strength (`formed`), and a ConfirmedClear the poll a sustained departure
   * is confirmed (`clear`) — never both in one poll. `blackout` discards whatever was in progress.
   *
   * `complete` is whether this /who saw everyone (false when a packed lair truncated the query and
   * some class slices timed out). On an INCOMPLETE view the cohort count is only a lower bound —
   * members whose class slice failed look absent — so a below-floor count cannot be trusted as a
   * departure, and no clear is started or confirmed until a complete view confirms it. A count that
   * is AT or ABOVE the floor is still trusted (a lower bound over the floor is over the floor).
   */
  observe(names: readonly string[], now: number, blackout: boolean, complete = true): ClearObservation {
    if (blackout) {
      // A blind gap — a server crash/shutdown or our own DC. Do NOT wipe the roster and arrival
      // memory: that would blindly re-form whatever is present into ONE raid on recovery, merging
      // two overlapping raids and handing the same raid a new number. Instead, keep the arrival
      // memory and RESUME the raid we were tracking — but ONLY if its own members are still here
      // (the users match). If they're gone, discard it silently: we were blind, so we can't tell
      // whether it cleared or just left, and must not record a false clear.
      this.#trackArrivals(names, now);
      if (this.#formedAt !== null) {
        let cohort = 0;
        for (const name of names) if (this.#roster.has(name)) cohort += 1;
        if (cohort >= this.#clearFloor) {
          if (this.#confirmed) this.#belowSince = null; // confirmed raid survived the gap — keep its clock
          else this.#stableSince = now; // a disconnect interrupts a forming raid — restart the confirm count
          return NO_CHANGE;
        }
        this.#reset(); // the raid we were tracking is gone across the gap
      }
      return NO_CHANGE;
    }

    this.#trackArrivals(names, now);
    this.#pruneLocks(now);

    if (this.#formedAt === null) {
      // The raid just read as cleared is back — it was a wipe with a long run-back. It carries on.
      const resumed = this.#tryResume(names, now);
      if (resumed) return { ...NO_CHANGE, resumed };
      // A new raid forms only from players NOT locked to a recent raid (the Onyxia lockout rule) —
      // so a just-cleared raid's members, lingering in the lair, can't re-form a phantom duplicate.
      const fresh = names.filter((name) => !this.#isLocked(name, now));
      if (fresh.length >= this.#formAt) {
        this.#formedAt = now;
        this.#roster = new Set(fresh.slice(0, this.#rosterCap));
        this.#peak = this.#roster.size;
        this.#belowSince = null;
        this.#stableSince = now;
        this.#confirmed = false;
        return this.#tryConfirm(now); // confirmMs 0 → announce immediately (the original behaviour)
      }
      return NO_CHANGE;
    }

    // Absorb NEWCOMERS into this raid only if they arrived within the fill window of formation
    // (and the roster is under the cap). Someone who first appeared long after formation is a
    // different raid — leaving them out is what lets this raid's departure register while the
    // lair stays full of the next one.
    const fillDeadline = this.#formedAt + this.#fillWindowMs;
    for (const name of names) {
      if (this.#roster.has(name) || this.#roster.size >= this.#rosterCap) continue;
      if (this.#isLocked(name, now)) continue; // locked to another raid — can't join this one
      if ((this.#firstSeen.get(name) ?? now) <= fillDeadline) this.#roster.add(name);
    }

    // How many of THIS raid's members are visible now (ambient/new arrivals don't count).
    let cohort = 0;
    for (const name of names) if (this.#roster.has(name)) cohort += 1;

    if (!this.#confirmed) {
      // FORMING: the raid reached strength but has not yet held >= floor for `confirmMs`. A drop
      // below the floor and back (players left and returned) restarts the count; a disconnect does
      // too (handled in the blackout branch). Only a genuinely stable, uninterrupted hold announces.
      if (cohort >= this.#clearFloor) {
        if (cohort > this.#peak) this.#peak = cohort;
        if (this.#belowSince !== null) {
          this.#stableSince = now; // recovered from a dip — the raid "left and came back", restart the count
          this.#belowSince = null;
        }
        return this.#tryConfirm(now);
      }
      if (!complete) return NO_CHANGE; // truncated /who — an untrusted undercount, hold
      if (this.#belowSince === null) this.#belowSince = now; // dipped below the floor while forming
      if (now - this.#belowSince >= this.#sustainedMs) this.#reset(); // gone before it ever committed — a flash
      return NO_CHANGE;
    }

    if (cohort >= this.#clearFloor) {
      // Up, or recovered from a wipe (the same members are back). Trusted even on an incomplete
      // view: the real count is >= this, so it's over the floor either way.
      if (cohort > this.#peak) this.#peak = cohort;
      this.#belowSince = null;
      this.#lockRoster(now); // keep this raid's members locked while it holds (outlives the clear)
      return NO_CHANGE;
    }

    // Below the floor — but on an INCOMPLETE view that's unreliable (members in the classes whose
    // /who slice timed out look absent), so we must not read it as a departure. Hold: don't start
    // or confirm a clear. A real departure already seen on a complete view keeps its pending clock
    // (we return without touching #belowSince), so an incomplete blip mid-departure doesn't reset it.
    if (!complete) return NO_CHANGE;

    // The roster has mostly dropped out — a wipe or a real departure.
    if (this.#belowSince === null) {
      this.#belowSince = now;
      return NO_CHANGE;
    }
    if (now - this.#belowSince >= this.#sustainedMs) {
      const clear = this.#clearOf(this.#formedAt, this.#belowSince);
      // Kept aside in case the "clear" was a wipe whose members run back after the wait.
      this.#cleared = {
        formedAt: this.#formedAt,
        number: this.#number,
        roster: this.#roster,
        peak: this.#peak,
        departedAt: this.#belowSince,
      };
      this.#reset();
      return { ...NO_CHANGE, clear };
    }
    return NO_CHANGE; // still within the window — the roster could yet run back (a wipe)
  }

  /** Announce the formation once the roster has held >= floor for `confirmMs` since `#stableSince`
   *  (immediately when that is 0). The raid's number is assigned HERE, at confirmation, so a flash
   *  that never confirms consumes no number. */
  #tryConfirm(now: number): ClearObservation {
    if (this.#stableSince === null || now - this.#stableSince < this.#confirmMs) {
      return NO_CHANGE;
    }
    this.#confirmed = true;
    this.#number = this.#nextNumber?.() ?? null;
    this.#belowSince = null;
    this.#lockRoster(now); // lock the founding roster to this raid
    return { ...NO_CHANGE, formed: { number: this.#number, peak: this.#peak } };
  }

  /** The clear of the tracked raid, formed at `formedAt` and gone since `departedAt`. */
  #clearOf(formedAt: number, departedAt: number): ConfirmedClear {
    return { durationMs: departedAt - formedAt, peak: this.#peak, number: this.#number };
  }

  /**
   * Resume the raid last read as cleared once at least `clearFloor` of its members are back and still
   * locked to it — its "clear" was a wipe whose run-back outlasted the wait. It takes up its number,
   * form time and roster again, so its timer runs on. Once none of its members is locked it is let go:
   * they are then free to found a new raid.
   */
  #tryResume(names: readonly string[], now: number): ResumedRaid | null {
    const cleared = this.#cleared;
    if (cleared === null) return null;
    if (![...cleared.roster].some((name) => this.#isLocked(name, now))) {
      this.#cleared = null;
      return null;
    }
    let back = 0;
    for (const name of names) if (cleared.roster.has(name) && this.#isLocked(name, now)) back += 1;
    if (back < this.#clearFloor) return null;
    this.#cleared = null;
    this.#formedAt = cleared.formedAt;
    this.#number = cleared.number;
    this.#roster = new Set(cleared.roster);
    this.#peak = Math.max(cleared.peak, back);
    this.#belowSince = null;
    this.#stableSince = null;
    this.#confirmed = true;
    this.#lockRoster(now);
    return { number: cleared.number, elapsedMs: now - cleared.formedAt, awayMs: now - cleared.departedAt };
  }

  /** Lock every current roster member to this raid as of `now`. A locked player can't found or join
   *  a DIFFERENT raid until `lockoutMs` later — so lingering members never seed a phantom re-form. */
  #lockRoster(now: number): void {
    for (const name of this.#roster) this.#locked.set(name, now);
  }

  /** Is this player still locked to a recent raid (and so barred from a new one)? */
  #isLocked(name: string, now: number): boolean {
    const at = this.#locked.get(name);
    return at !== undefined && now - at < this.#lockoutMs;
  }

  /** Drop locks past their window, so the ledger stays bounded and a genuinely new (post-reset) raid
   *  is eventually allowed to re-use a name. */
  #pruneLocks(now: number): void {
    for (const [name, at] of this.#locked) if (now - at >= this.#lockoutMs) this.#locked.delete(name);
  }

  /** Record when each present player was first seen (their arrival), resetting anyone who
   *  returns after an absence longer than a stint gap, and pruning players long gone. */
  #trackArrivals(names: readonly string[], now: number): void {
    for (const name of names) {
      const last = this.#lastSeen.get(name);
      if (last === undefined || now - last > this.#stintGapMs) this.#firstSeen.set(name, now);
      this.#lastSeen.set(name, now);
    }
    const present = new Set(names);
    for (const [name, last] of this.#lastSeen) {
      // Keep current roster members regardless (a hard wipe can hide them); drop long-gone others.
      if (!present.has(name) && now - last > this.#stintGapMs && !this.#roster.has(name)) {
        this.#lastSeen.delete(name);
        this.#firstSeen.delete(name);
      }
    }
  }

  #reset(): void {
    this.#formedAt = null;
    this.#number = null;
    this.#roster = new Set();
    this.#peak = 0;
    this.#belowSince = null;
    this.#confirmed = false;
    this.#stableSince = null;
  }
}
