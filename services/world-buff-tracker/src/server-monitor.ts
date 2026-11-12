/**
 * Aggregates the up/down state of the bot's several realm connections (the watcher plus each
 * listener) into ONE realm-outage signal for the COMMUNITY channel — distinct from the
 * per-connection ops alerts `notifyAdmin` already sends.
 *
 * The realm is only "down" when EVERY supervised connection is sustained-down at once: all three
 * characters sit on the same realm behind the same host, so a lone flaky character is not a realm
 * outage, but all of them dropping together is the strongest evidence the bot has that the realm
 * is unreachable.
 *
 * Recovery is CONFIRMED, not announced on the first flicker: when a connection re-establishes the
 * realm is "answering again" but not yet declared back — the caller starts a stability window and
 * calls `confirmRecovery()` at the end. If the realm drops fully again before then, the pending
 * recovery is void (`isFullyDown()` tells the caller to cancel its timer) and the outage stays open
 * with no repeat "down" post; a flappy recovery yields exactly one "down" and one "back up".
 *
 * Fed the already-latched transitions from each connection's `DownTracker` (which returns true only
 * after a SUSTAINED failure, not a blip), so this inherits the "not a transient blip" threshold for
 * free. Pure and clock-injected, so the quorum logic is unit-tested without a network or a clock.
 *
 * The announced/ongoing state is PERSISTED (`snapshot`/`restore`): a restart mid-outage resumes with
 * `announced` true, so it does NOT re-post "down" for an outage a prior process already announced —
 * it just posts "back up" once when the realm recovers. Without this, every redeploy during an outage
 * re-announced it, bombarding the channel (the flappy-realm + frequent-deploy case this was added for).
 */
export interface ServerMonitorState {
  /** An outage has been posted and not yet confirmed-recovered. */
  readonly announced: boolean;
  /** When the outage began (for the recovery post's duration), or null. */
  readonly downSince: number | null;
}

export class ServerMonitor {
  readonly #ids: ReadonlySet<string>;
  readonly #down = new Set<string>();
  #announced = false; // an outage has been posted and not yet confirmed-recovered
  #recovering = false; // the realm is answering again, awaiting the stability window
  #downSince: number | null = null;

  /** `ids` is every connection supervised — typically the watcher plus each listener character. */
  constructor(ids: readonly string[]) {
    this.#ids = new Set(ids);
  }

  /** The persistable outage state, to survive a restart. `#recovering`/`#down` are NOT persisted:
   *  a fresh process is (re)connecting, so it rebuilds those from the live connections. */
  snapshot(): ServerMonitorState {
    return { announced: this.#announced, downSince: this.#downSince };
  }

  /** Resume a persisted outage on startup, so a mid-outage restart doesn't re-announce "down". */
  restore(state: ServerMonitorState): void {
    this.#announced = state.announced;
    this.#downSince = state.downSince;
    this.#recovering = false;
    this.#down.clear();
  }

  /**
   * A connection crossed into sustained-down. Returns true iff this is the transition that makes the
   * WHOLE realm down and we have not announced it — i.e. announce the outage now. A full-down also
   * VOIDS any pending recovery (the realm flapped back down), so a stability window in progress must
   * be cancelled — see `isFullyDown()`.
   */
  connectionDown(id: string, now: number): boolean {
    if (!this.#ids.has(id)) return false;
    this.#down.add(id);
    if (this.#down.size >= this.#ids.size) {
      this.#recovering = false; // fully down again — any tentative recovery is void
      if (!this.#announced) {
        this.#announced = true;
        this.#downSince = now;
        return true;
      }
    }
    return false;
  }

  /**
   * A connection came back. Returns the outage duration in ms (>= 0) iff this STARTS a recovery
   * window (an announced outage that is not already recovering) — the caller then waits for the
   * realm to stay up and calls `confirmRecovery()`. Does NOT end the outage yet; later reconnects
   * during the same window return null.
   */
  connectionUp(id: string, now: number): number | null {
    if (!this.#ids.has(id)) return null;
    this.#down.delete(id);
    if (!this.#announced || this.#recovering) return null;
    this.#recovering = true;
    return this.#downSince === null ? 0 : Math.max(0, now - this.#downSince);
  }

  /**
   * The stability window elapsed. Returns true iff the realm is still recovering (did not flap fully
   * down in the window) — i.e. announce "back up" now — and closes the outage. False means a re-down
   * cancelled it (the caller should not post).
   */
  confirmRecovery(): boolean {
    if (this.#announced && this.#recovering) {
      this.#announced = false;
      this.#recovering = false;
      this.#downSince = null;
      return true;
    }
    return false;
  }

  /** True while an outage has been announced and not yet confirmed-recovered — for status/tests. */
  get outageActive(): boolean {
    return this.#announced;
  }

  /** True iff every supervised connection is currently down — the caller cancels a pending recovery
   *  timer when this becomes true (the realm flapped back down mid-window). */
  isFullyDown(): boolean {
    return this.#down.size >= this.#ids.size;
  }
}
