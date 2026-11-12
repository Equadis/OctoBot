/**
 * Classifies a buff drop by whether a raid was in the lair when it landed — using only the /who
 * census the watcher already takes, no game access and no new data.
 *
 * A fresh Onyxia kill requires a raid physically present in the lair for minutes (trash + the
 * fight), and the watcher polls ~every 60s, so a real kill cannot slip between polls. Therefore a
 * drop over an EMPTY lair cannot be a fresh kill — it is a saved head, turned in from an earlier
 * kill. The separation is measured and stark: real kills show 17-48 in the lair (small ones down to
 * ~10), saved heads 0-1, so the floor below is unambiguous.
 *
 * Three outcomes, and the bias is deliberate (never over-claim):
 *   - `fresh`   a raid was in the lair within the window -> the drop belongs to it; the park-now
 *               alert already served as the heads-up, so the drop message stays as-is.
 *   - `saved`   the lair had full census coverage and no raid in the window -> a head from an
 *               earlier kill; the drop message says so, and takes no credit.
 *   - `unknown` we were blind (watcher not polling, or a blackout inside the window) -> a raid could
 *               have come and gone unseen, so claim nothing either way.
 *
 * Pure and clock-injected, so the bands are unit-tested without a network.
 */
export type DropOrigin = "fresh" | "saved" | "unknown";

/** The lair-poll signal the watcher maintains and the drop handler reads — mutated in place. */
export interface LairActivity {
  /** Last poll where the lair was at raid strength (a raid was physically present). */
  lastStrengthAt: number | null;
  /** Last poll at all — if stale, the watcher is not seeing the lair and we are blind. */
  lastPollAt: number | null;
  /** When the most recent blind gap (blackout) ended — a raid may have been missed during it. */
  lastBlackoutEndAt: number | null;
}

export function newLairActivity(): LairActivity {
  return { lastStrengthAt: null, lastPollAt: null, lastBlackoutEndAt: null };
}

/** A kill-capable raid has been seen at >= this many in the lair. Measured: real kills 10-48,
 *  saved-head lairs 0-1, so any floor in 2..16 separates them; 10 also catches the small kills. */
export const LAIR_RAID_FLOOR = 10;
/** A poll gap beyond this means we were blind across it (mirrors the presence tracker's blackout). */
export const POLL_GAP_BLIND_MS = 180_000;
/** If the watcher's last poll is older than this at drop time, its census is stale -> treat as blind. */
export const STALE_POLL_MS = 4 * 60_000;

/** Record one lair poll into the shared signal. Call it every /who poll with the count in-zone. */
export function noteLairPoll(activity: LairActivity, present: number, now: number): void {
  if (activity.lastPollAt !== null && now - activity.lastPollAt > POLL_GAP_BLIND_MS) {
    activity.lastBlackoutEndAt = now; // a blind gap just ended at this poll
  }
  activity.lastPollAt = now;
  if (present >= LAIR_RAID_FLOOR) activity.lastStrengthAt = now;
}

export interface DropOriginOptions {
  /** A raid seen within this long before the drop makes it a fresh, attributable kill. */
  readonly freshWindowMs: number;
}

/** Classify a drop at `dropAt` against the lair signal. Pure — order matters: blind beats fresh. */
export function classifyDropOrigin(
  dropAt: number,
  activity: LairActivity,
  options: DropOriginOptions,
): DropOrigin {
  // No census yet, or the watcher's last poll is stale -> we cannot see the lair -> blind.
  if (activity.lastPollAt === null || dropAt - activity.lastPollAt > STALE_POLL_MS) return "unknown";
  // A blind gap ended inside the window -> a raid could have come and gone unseen -> can't be sure.
  if (activity.lastBlackoutEndAt !== null && dropAt - activity.lastBlackoutEndAt < options.freshWindowMs) {
    return "unknown";
  }
  // A raid was in the lair within the window -> fresh (attributable to it).
  if (activity.lastStrengthAt !== null && dropAt - activity.lastStrengthAt <= options.freshWindowMs) {
    return "fresh";
  }
  // Full coverage, no raid in the window -> a head turned in from an earlier kill.
  return "saved";
}
