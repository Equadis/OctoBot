import { describeError } from "../errors.js";
import type { Logger } from "../logger.js";
import { buffCooldownRemainingMs } from "./broadcast-ledger.js";
import { headOf, type BuffDrop, type BuffStore, type Faction } from "./buff-store.js";
import { classifyDropOrigin, type DropOrigin, type LairActivity } from "./drop-origin.js";
import type { BuffYell } from "./buff-yell.js";
import type { RaidZoneId } from "./raid-zone.js";
import { RecentBuffs } from "./recent-buffs.js";

/**
 * The buff-drop domain in one place: a heard Rallying Cry yell is deduped (two same-city listeners
 * hear it), classified fresh/saved/unknown from the lair census, and persisted; and the per-faction
 * last-drop / cooldown state the alert policy and status query read. See RAID_ARCHITECTURE.md.
 *
 * `record` returns the drop to ANNOUNCE (or null on a duplicate) — sending it (Discord + whisper) is
 * the caller's job, keeping delivery out of the domain. The lair-activity signal is shared with the
 * watcher, which stamps it every /who (`noteLairPoll`); this reads it to tell a fresh kill (a raid was
 * present) from a saved head (empty lair).
 *
 * The buff has TWO sources — Onyxia's head and Nefarian's — so each drop is classified against the lair
 * its head came from (a Nefarian head over an empty Onyxia lair is a fresh BWL kill, not a saved head),
 * and deduped per side AND head. The cooldown / last-drop state stays per side across both heads: it is
 * one buff, and either head landing it is the same new cycle.
 *
 * NOTE: clear-DURATION recording (the self-improving timer) is deliberately NOT here — it is raid-timer
 * data that feeds the about-to-clear prediction, not buff state, so folding it in would spread this
 * module into the clear handler. Only the drop domain lives here.
 */
/** One head's lair: the poll signal its watcher writes (via noteLairPoll), and how long after a raid
 *  was last seen there a drop still counts as that raid's fresh kill. */
export interface HeadLair {
  readonly activity: LairActivity;
  readonly freshWindowMs: number;
}

export interface BuffTrackerDeps {
  readonly store: BuffStore;
  /** A second same-city listener's echo of the same yell within this window is ignored. */
  readonly dedupWindowMs: number;
  /** Server Rallying Cry cooldown (0 = none) — for the expectation gate, never for a detected drop. */
  readonly cooldownMs: number;
  /** Each head's lair, keyed by the head — a drop is classified against its own head's lair. */
  readonly lairs: Readonly<Record<RaidZoneId, HeadLair>>;
  readonly logger: Pick<Logger, "info" | "error">;
}

/** A drop worth announcing: when it landed and whether it was a fresh kill / saved head / unknown. */
export interface RecordedDrop {
  readonly appliedAt: Date;
  readonly head: RaidZoneId;
  readonly origin: DropOrigin;
}

/** Per-faction cooldown readout for the status command (matches the command router's BuffCooldown). */
export interface BuffCooldownState {
  readonly faction: Faction;
  readonly sinceLastDropMs: number | null;
  readonly cooldownRemainingMs: number;
  /** Whose head the last drop came from; undefined when none was seen. */
  readonly lastHead?: RaidZoneId;
}

export class BuffTracker {
  readonly #store: BuffStore;
  readonly #recent: RecentBuffs;
  readonly #cooldownMs: number;
  readonly #lairs: Readonly<Record<RaidZoneId, HeadLair>>;
  readonly #logger: Pick<Logger, "info" | "error">;

  constructor(deps: BuffTrackerDeps) {
    this.#store = deps.store;
    this.#recent = new RecentBuffs(deps.dedupWindowMs);
    this.#cooldownMs = deps.cooldownMs;
    this.#lairs = deps.lairs;
    this.#logger = deps.logger;
  }

  /**
   * A listener heard a Rallying Cry yell (`yell`: which side, whose head) at `now`. Ignores a
   * duplicate a second same-city listener heard moments ago (returns null), else classifies the drop's
   * origin against its head's lair, persists it (best-effort), and returns it for the caller to announce.
   */
  record(yell: BuffYell, meta: { sourceName: string; text: string; detectedBy: string }, now: number): RecordedDrop | null {
    const { faction, head } = yell;
    if (!this.#recent.fresh(`${faction}:${head}`, now)) {
      this.#logger.info(
        `buff drop: ${faction} ${head} head already recorded moments ago — ignoring duplicate heard by ${meta.detectedBy}`,
      );
      return null;
    }
    const appliedAt = new Date(now);
    const lair = this.#lairs[head];
    const origin = classifyDropOrigin(now, lair.activity, { freshWindowMs: lair.freshWindowMs });
    this.#logger.info(
      `buff drop: ${faction} buff is up from the ${head} head (${origin}) — ${meta.detectedBy} heard "${meta.text}" from ${meta.sourceName}`,
    );
    void this.#store
      .record({ faction, appliedAt, head })
      .catch((error) => this.#logger.error(`buff-store: ${describeError(error)}`));
    return { appliedAt, head, origin };
  }

  /** This side's latest Rallying Cry drop (from either head), or null if none was ever seen. */
  lastDrop(faction: Faction): Promise<BuffDrop | null> {
    return this.#store.current(faction);
  }

  /** When this side's Rallying Cry last dropped, or null — the alert policy's cooldown/cycle input. */
  async lastDropAt(faction: Faction): Promise<Date | null> {
    return (await this.#store.current(faction))?.appliedAt ?? null;
  }

  /** The cooldown readout for a side: time since the last drop and the remaining cooldown (0 if off). */
  async cooldownState(faction: Faction, now: number): Promise<BuffCooldownState> {
    const current = await this.#store.current(faction);
    const at = current?.appliedAt ?? null;
    return {
      faction,
      sinceLastDropMs: at ? now - at.getTime() : null,
      cooldownRemainingMs: buffCooldownRemainingMs(at, now, this.#cooldownMs),
      ...(current ? { lastHead: headOf(current) } : {}),
    };
  }

  /** The last `limit` drops for a faction, chronological — for measuring the real drop interval. */
  history(faction: Faction, limit: number): Promise<BuffDrop[]> {
    return this.#store.history(faction, limit);
  }
}
