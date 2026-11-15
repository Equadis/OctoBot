import type { GuildComposition } from "./guild-label.js";

/**
 * The authoritative per-raid session record the RaidTracker publishes (and OctoMetrics stores).
 *
 * Identity honesty: `/who` carries no instance id, so a session is a roster-cohort INFERENCE.
 *   confirmed   direct evidence of the session's identity (reserved: no /who-only path emits it; a
 *               friends-list-backed roster source could)
 *   high        the only raid tracked in its lair, or a cohort whose guild composition is distinct
 *   tentative   a concurrent cohort separated only by arrival timing, or one that overlapped an
 *               ambiguous period; treated as an estimate, excluded from duration training
 *   unresolved  reported only through `LairAmbiguity` — never as a session
 */
export type SessionConfidence = "confirmed" | "high" | "tentative";

/** forming is never published as a session: the clock starts at strength. */
export type SessionStatus = "in_progress" | "leaving" | "ended";

/**
 * How a session ended:
 *   kill_confirmed  a Chronicle kill by one of its members proved the boss died
 *   departed        the roster left and stayed gone (group left the lair / disbanded) — kill NOT proven
 *   disbanded       left too soon after forming to have killed the boss (set by the pipeline)
 *   interrupted     tracking was lost (blind gap) — the end is unknown, not a clear
 */
export type SessionEndReason = "kill_confirmed" | "departed" | "disbanded" | "interrupted";

export interface RaidSessionSnapshot {
  /** The persistent raid reference number (#702), or null if numbering is off. */
  readonly id: number | null;
  /** Stable key even when unnumbered (tests / numbering off). */
  readonly key: string;
  readonly status: SessionStatus;
  readonly confidence: SessionConfidence;
  /** The raid reached strength at this time (UTC ms) — the authoritative clock start. */
  readonly formedAt: number;
  /** The last poll at which the raid's own roster was at/above the leaving floor. */
  readonly lastConfirmedAt: number;
  readonly players: number;
  readonly peak: number;
  readonly rosterSize: number;
  /** present roster members / roster size — how much of the founding group is still here. */
  readonly continuity: number;
  readonly guild: GuildComposition;
  /** Set when status is "ended". */
  readonly endedAt?: number;
  readonly endReason?: SessionEndReason;
  /** "chronicle_kill" is the only source that proves a kill; "roster_departure" does not. */
  readonly clearSource?: "chronicle_kill" | "roster_departure";
  /** Usable as duration-training data: complete evidence, no ambiguity, high confidence. */
  readonly trusted: boolean;
  /** The session resumed after a wipe read as a clear. */
  readonly resumed: boolean;
}

/** Zone activity that could not be resolved into separate sessions. Never a confirmed raid. */
export interface LairAmbiguity {
  readonly kind: "overlapping_assembly" | "truncated_view" | "staggered_arrivals";
  /** How many players are involved. */
  readonly players: number;
  readonly reason: string;
}

export interface LairSessions {
  readonly sessions: readonly RaidSessionSnapshot[];
  readonly ambiguity: LairAmbiguity | null;
  /** Players in the zone this poll, and the completeness of that reading. */
  readonly present: number;
  readonly complete: boolean;
  /** Present players not assigned to any tracked session. */
  readonly unassigned: number;
}
