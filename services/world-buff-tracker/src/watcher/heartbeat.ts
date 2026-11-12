/**
 * A compact one-line monitoring summary the watcher logs periodically, so the
 * numbers that otherwise live only in MongoDB — raid-duration samples, the learned
 * median clear-time vs the estimate actually in use, the subscriber count, and the
 * per-faction buff state — are visible in the deploy logs without any database
 * access. Pure formatting so it is unit-tested; the watcher gathers the stats and
 * calls this once per heartbeat.
 */

export interface HeartbeatBuff {
  readonly faction: string;
  /** Milliseconds since the last recorded drop, or null when none has ever been seen. */
  readonly sinceLastDropMs: number | null;
}

/** How well the learned timer has predicted past clears — the self-evaluation segment. */
export interface HeartbeatAccuracy {
  /** How many past clears were scored. */
  readonly evaluated: number;
  /** Mean absolute prediction error (ms). */
  readonly maeMs: number;
  /** Mean signed error (ms): positive = raids ran longer than predicted (alert fires early). */
  readonly biasMs: number;
}

/** One lair's self-improving raid timer: its samples, the learned median vs the estimate in use,
 *  and how well it has predicted past clears. */
export interface HeartbeatTimer {
  readonly samples: number;
  /** The learned median clear-time once >= minSamples are on record, else null. */
  readonly learnedMedianMs: number | null;
  /** The bias-corrected estimate actually used by the live timer, else null. Shown next to the
   *  median when the correction moved it, so the log says what the timer is really predicting. */
  readonly improvedMs?: number | null;
  readonly estimateMs: number;
  readonly minSamples: number;
  /** Timer self-evaluation, appended when at least one past clear has been scored. */
  readonly accuracy?: HeartbeatAccuracy | null;
}

/** Another lair's timer, logged after Onyxia's under its own name ("BWL timer ..."). */
export interface NamedHeartbeatTimer extends HeartbeatTimer {
  readonly name: string;
}

/** The heartbeat's stats; its own timer fields are Onyxia's ("raid timer"), the original lair. */
export interface HeartbeatStats extends HeartbeatTimer {
  readonly subscribers: number;
  /** Distinct people who have EVER subscribed (survives unsubscribing). Omitted = not shown. */
  readonly totalUsers?: number;
  /** Distinct people ever guild-invited (lifetime). Omitted = not shown. */
  readonly totalInvites?: number;
  /** Bot-invited players currently in the guild (active). Shown beside the invite total. */
  readonly activeGuildies?: number;
  readonly buffs: readonly HeartbeatBuff[];
  /** Every other watched lair's timer (Blackwing Lair's), each after Onyxia's. */
  readonly otherTimers?: readonly NamedHeartbeatTimer[];
}

const mins = (ms: number): number => Math.round(ms / 60_000);
const signedMins = (ms: number): string => `${ms >= 0 ? "+" : "-"}${Math.abs(mins(ms))}m`;

/** One log line: `monitor: 12 subs; raid timer learned median 43m (18 samples); accuracy MAE 6m bias +2m over 15; buffs alliance last drop 74m ago, horde no drop yet`. */
export function formatHeartbeat(stats: HeartbeatStats): string {
  const others = (stats.otherTimers ?? []).map((timer) => `; ${timer.name} timer ${timerText(timer)}`).join("");
  const buffs =
    stats.buffs.length === 0
      ? "none tracked"
      : stats.buffs
          .map((b) => `${b.faction} ${b.sinceLastDropMs === null ? "no drop yet" : `last drop ${mins(b.sinceLastDropMs)}m ago`}`)
          .join(", ");
  const subs =
    stats.totalUsers != null
      ? `${stats.subscribers} subs (${stats.totalUsers} all-time)`
      : `${stats.subscribers} subs`;
  const invites =
    stats.totalInvites != null
      ? `; ${stats.totalInvites} invites all-time${stats.activeGuildies != null ? ` (${stats.activeGuildies} in guild)` : ""}`
      : "";
  return `monitor: ${subs}${invites}; raid timer ${timerText(stats)}${others}; buffs ${buffs}`;
}

/** A timer's state, then its accuracy: "learned median 43m (18 samples); accuracy MAE 6m bias +2m over 15". */
function timerText(timer: HeartbeatTimer): string {
  // When the bias correction actually moved the estimate, show both: the raw median and the
  // number the timer now uses. When it didn't (or isn't available), just the median.
  const corrected =
    timer.improvedMs != null && timer.learnedMedianMs !== null && timer.improvedMs !== timer.learnedMedianMs
      ? ` -> uses ${mins(timer.improvedMs)}m`
      : "";
  const state =
    timer.learnedMedianMs !== null
      ? `learned median ${mins(timer.learnedMedianMs)}m${corrected} (${timer.samples} samples)`
      : `${mins(timer.estimateMs)}m estimate (${timer.samples}/${timer.minSamples} to learn)`;
  const accuracy =
    timer.accuracy && timer.accuracy.evaluated > 0
      ? `; accuracy MAE ${mins(timer.accuracy.maeMs)}m bias ${signedMins(timer.accuracy.biasMs)} over ${timer.accuracy.evaluated}`
      : "";
  return `${state}${accuracy}`;
}
