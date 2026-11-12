import type { WhoPlayer } from "../protocol/who.js";

/**
 * The raid-event vocabulary shared by the tracker, the alert policy and the message formatters: the
 * `RaidEvent` a park/clear alert is rendered from, the two constructors that build one from the
 * RaidTracker's lifecycle signals, the `ActiveRaid` status shape, and a small roster helper.
 *
 * `RaidEvent` is the ALERT event (what a formatter reads), distinct from the tracker's internal
 * `RaidLifecycleEvent`; `index.ts` bridges one to the other via `formedRaidEvent`/`clearedRaidEvent`.
 * (The guild/pickup cohort DETECTOR that used to live here was retired in RAID_ARCHITECTURE.md step 4:
 * the whole-roster ClearTracker is authoritative — its per-cohort transitions were too flaky to drive
 * alerts — and concurrent-raid separation is deferred to a friends-list RosterSource, which yields
 * pre-separated rosters. So only the vocabulary remains.)
 */

/** Grouping mode reserved for a future cohort-partitioning source; unused by today's whole-roster tracker. */
export type GroupingMode = "auto" | "guild" | "lair";

/** Sentinel cohort key kept out of the guild namespace (guild names can't start ' '). */
const LAIR_KEY = " lair";

export interface RaidCohortSnapshot {
  /** Stable grouping key (the guild name, or an internal sentinel). */
  readonly key: string;
  /** Human label for messages, e.g. "<Nightfall>", "a pickup group", "the lair". */
  readonly label: string;
  /** Members in the cohort right now (0 when it has just left). */
  readonly count: number;
  /** The most members seen in this cohort while it was tracked. */
  readonly peak: number;
  /** Current roster by name — the array used to distinguish and follow a group. */
  readonly members: readonly string[];
}

export type RaidEvent =
  | {
      readonly kind: "raid-forming";
      readonly cohort: RaidCohortSnapshot;
      readonly initial: boolean;
      /** The raid's reference number when the alert fires at strength (via `formedRaidEvent`);
       *  absent for a detector-emitted forming at the lower minRaidSize, which has no number. */
      readonly number?: number | null;
    }
  | {
      readonly kind: "raid-left";
      readonly cohort: RaidCohortSnapshot;
      /** The raid's reference number, when the clear carries one (via `clearedRaidEvent`). */
      readonly number?: number | null;
      /** How long the raid lasted (form → clear), when known — for the recap and duration learning. */
      readonly durationMs?: number;
      /** The clear was proven by a Chronicle Onyxia kill (not just inferred from the /who
       *  departure), so the alert can say so. */
      readonly killConfirmed?: boolean;
    };

export interface ActiveRaid {
  readonly label: string;
  readonly count: number;
  readonly peak: number;
}

/**
 * A synthetic "raid-left" event for a clear confirmed by the ClearTracker, so the cleared
 * alert runs through the same dedup + announce path as a detector event. The ClearTracker is
 * lair-granular and boss-blind, so the label is generic — the alert's wording uses only the
 * number, duration and cities, never the label. `number` and `durationMs` feed the recap.
 */
export function clearedRaidEvent(
  peak: number,
  killConfirmed = false,
  number: number | null = null,
  durationMs?: number,
): RaidEvent {
  return {
    kind: "raid-left",
    cohort: { key: LAIR_KEY, label: "a raid", count: 0, peak, members: [] },
    number,
    durationMs,
    killConfirmed,
  };
}

/**
 * A synthetic "raid-forming" event for a raid the ClearTracker just took to strength, carrying
 * its reference number — so the "a raid has formed" alert runs through the same buff-gate +
 * dedup + announce path, and can name the raid the same #N the clear will. Same generic label
 * as `clearedRaidEvent` for the same reason (the forming wording uses only the number + cities).
 */
export function formedRaidEvent(peak: number, number: number | null): RaidEvent {
  return { kind: "raid-forming", cohort: { key: LAIR_KEY, label: "a raid", count: peak, peak, members: [] }, initial: false, number };
}

/** The guild most players belong to, and how many — for a readable summary. */
export function dominantGuild(
  players: readonly Pick<WhoPlayer, "guild">[],
): { guild: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const player of players) {
    if (player.guild.length === 0) continue;
    counts.set(player.guild, (counts.get(player.guild) ?? 0) + 1);
  }
  let best: { guild: string; count: number } | null = null;
  for (const [guild, count] of counts) {
    if (best === null || count > best.count) best = { guild, count };
  }
  return best;
}
