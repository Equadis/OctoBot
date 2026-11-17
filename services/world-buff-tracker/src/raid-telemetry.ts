import type { Logger } from "./logger.js";
import type { LairSessions, RaidSessionSnapshot } from "./watcher/raid-session.js";
import type { RaidZoneId } from "./watcher/raid-zone.js";

/**
 * Structured raid telemetry for OctoMetrics: the tracker's authoritative sessions, pushed to the
 * Cloudflare Worker (`POST /api/ingest`) so the website renders the SAME raid ids, formation times
 * and guild labels the in-game whisper reports.
 *
 * Two versioned event types (schema 1):
 *   raid_sessions       the full current state of one lair (every live session + recent ended ones).
 *                       Idempotent: a later snapshot supersedes an earlier one; `seq` orders them.
 *   raid_session_ended  one per ended session, sent once (retried until acknowledged), carrying the
 *                       final duration and a `trusted` flag — the training data for clear estimates.
 *
 * Privacy: character names never leave the process. Only aggregate guild counts are published.
 * Off unless METRICS_PUSH_TOKEN is set (and WOW_RAID_TELEMETRY is not "false").
 */
export const RAID_TELEMETRY_SCHEMA = 1;
export const RAID_TELEMETRY_ROLE = "rt";

const HEARTBEAT_MS = 120_000;
const ENDED_IN_SNAPSHOT_MS = 3 * 60 * 60_000;
const ENDED_IN_SNAPSHOT_MAX = 5;
const MAX_GUILDS = 5;
const SENT_ENDED_MEMORY = 200;

export interface LaneSessions {
  readonly label: string;
  readonly sessions: LairSessions;
}

export interface LairThresholds {
  /** Players for a raid to reach strength (the clock start). */
  readonly formAt: number;
  /** Below this many of the roster present, a raid is leaving. */
  readonly floor: number;
}

export type TelemetrySend = (body: Record<string, unknown>) => Promise<boolean>;

const iso = (ms: number): string => new Date(ms).toISOString();

/** The wire form of one session. No names, only aggregate guild shares. */
export function sessionWire(s: RaidSessionSnapshot): Record<string, unknown> {
  return {
    id: s.id,
    key: s.key,
    status: s.status,
    confidence: s.confidence,
    formedAt: iso(s.formedAt),
    lastConfirmedAt: iso(s.lastConfirmedAt),
    players: s.players,
    peak: s.peak,
    rosterSize: s.rosterSize,
    continuity: Math.round(s.continuity * 100) / 100,
    guild: {
      kind: s.guild.kind,
      label: s.guild.label,
      rosterSize: s.guild.rosterSize,
      known: s.guild.known,
      unguilded: s.guild.unguilded,
      guilds: s.guild.guilds.slice(0, MAX_GUILDS).map((g) => ({ name: g.name, count: g.count })),
    },
    ...(s.endedAt !== undefined ? { endedAt: iso(s.endedAt) } : {}),
    ...(s.confirmedAt !== undefined ? { confirmedAt: iso(s.confirmedAt) } : {}),
    ...(s.endReason !== undefined ? { endReason: s.endReason } : {}),
    ...(s.clearSource !== undefined ? { clearSource: s.clearSource } : {}),
    trusted: s.trusted,
    resumed: s.resumed,
    ...(s.resumedAt !== undefined ? { resumedAt: iso(s.resumedAt) } : {}),
  };
}

/** Merge a lair's lanes (one on a crossfaction realm) into one lair view. */
function mergeLanes(lanes: readonly LaneSessions[]): LairSessions {
  const sessions = lanes.flatMap((lane) => lane.sessions.sessions);
  const present = lanes.reduce((sum, lane) => sum + lane.sessions.present, 0);
  const first = lanes[0]?.sessions;
  return {
    sessions,
    ambiguity: lanes.map((lane) => lane.sessions.ambiguity).find((a) => a !== null) ?? null,
    present: lanes.length === 1 ? (first?.present ?? 0) : present,
    complete: lanes.every((lane) => lane.sessions.complete),
    unassigned: lanes.reduce((sum, lane) => sum + lane.sessions.unassigned, 0),
  };
}

export class RaidTelemetry {
  readonly #send: TelemetrySend;
  readonly #realm: string;
  readonly #account: string;
  readonly #logger: Logger;
  readonly #now: () => number;
  readonly #lastSig = new Map<RaidZoneId, string>();
  readonly #lastAt = new Map<RaidZoneId, number>();
  readonly #inFlight = new Set<RaidZoneId>();
  readonly #sentEnded = new Set<string>();
  #seq = 0;
  #warnedAt = 0;

  constructor(options: { send: TelemetrySend; realm: string; account: string; logger: Logger; now?: () => number }) {
    this.#send = options.send;
    this.#realm = options.realm;
    this.#account = options.account;
    this.#logger = options.logger;
    this.#now = options.now ?? Date.now;
  }

  /**
   * Report a lair's current sessions. Sends when the session set changed, else at the heartbeat
   * interval. Never throws and never blocks the poll loop; a failed send is retried on the next poll.
   */
  report(zone: RaidZoneId, lanes: readonly LaneSessions[], thresholds: LairThresholds, observation?: { present: number; complete: boolean; at: number }): void {
    if (lanes.length === 0) return;
    const now = this.#now();
    const merged = mergeLanes(lanes);
    const lair = observation ? { ...merged, present: observation.present, complete: observation.complete, unassigned: merged.unassigned + Math.max(0, observation.present - merged.present) } : merged;
    // Live sessions must not be truncated by earlier lanes' historical rows.
    const live = lair.sessions.filter(s => s.status !== "ended").slice(0, 12);
    const recent = lair.sessions.filter(s => s.status === "ended" && (s.confirmedAt ?? s.endedAt ?? 0) >= now - ENDED_IN_SNAPSHOT_MS)
      .sort((a,b) => (b.confirmedAt ?? b.endedAt ?? 0) - (a.confirmedAt ?? a.endedAt ?? 0))
      .slice(0, Math.min(ENDED_IN_SNAPSHOT_MAX, 12-live.length));
    const sig = JSON.stringify([
      [...live, ...recent].map((s) => [s.key, s.status, s.confidence, s.guild.label, s.endReason ?? null, s.players, s.resumed, s.resumedAt, s.confirmedAt]),
      lair.present, lair.complete, lair.unassigned,
      lair.ambiguity?.kind ?? null,
    ]);
    const due = sig !== this.#lastSig.get(zone) || now - (this.#lastAt.get(zone) ?? 0) >= HEARTBEAT_MS;
    if (this.#inFlight.has(zone)) return;
    if (!due) { void this.#reportEnded(zone, lair, now); return; }
    this.#seq = Math.max(this.#seq + 1, now);
    const body = {
      type: "raid_sessions",
      schema: RAID_TELEMETRY_SCHEMA,
      realm: this.#realm,
      account: this.#account,
      role: RAID_TELEMETRY_ROLE,
      time: iso(now),
      eventId: `${this.#realm}|${zone}|${this.#seq}`,
      seq: this.#seq,
      zone,
      thresholds: { formAt: thresholds.formAt, floor: thresholds.floor },
      lair: {
        present: lair.present,
        ...(observation ? { observedAt: iso(observation.at) } : {}),
        complete: lair.complete,
        unassigned: lair.unassigned,
        ambiguity: lair.ambiguity,
      },
      sessions: [...live, ...recent].map(sessionWire),
    };
    this.#inFlight.add(zone);
    void this.#send(body)
      .then((ok) => {
        if (ok) {
          this.#lastSig.set(zone, sig);
          this.#lastAt.set(zone, now);
          // Standalone history is published only AFTER the atomic lifecycle snapshot is acknowledged.
          void this.#reportEnded(zone, lair, now);
        }
      })
      .catch((error) => this.#warn(error))
      .finally(() => this.#inFlight.delete(zone));
  }

  /** One `raid_session_ended` per newly ended session, retried until the Worker acknowledges it. */
  async #reportEnded(zone: RaidZoneId, lair: LairSessions, now: number): Promise<void> {
    for (const s of lair.sessions) {
      if (s.status !== "ended" || s.endedAt === undefined) continue;
      const id = `${this.#realm}|${zone}|${s.key}|${s.endedAt}|${s.confirmedAt ?? 0}|${s.endReason}`;
      if (this.#sentEnded.has(id)) continue;
      this.#sentEnded.add(id); // claim first so overlapping reports never double-send
      try {
        const ok = await this.#send({
          type: "raid_session_ended",
          schema: RAID_TELEMETRY_SCHEMA,
          realm: this.#realm,
          account: this.#account,
          role: RAID_TELEMETRY_ROLE,
          time: iso(now),
          eventId: id,
          zone,
          durationMs: s.endedAt - s.formedAt,
          session: sessionWire(s),
        });
        if (!ok) this.#sentEnded.delete(id);
      } catch (error) {
        this.#sentEnded.delete(id);
        this.#warn(error);
      }
    }
    while (this.#sentEnded.size > SENT_ENDED_MEMORY) {
      const oldest = this.#sentEnded.values().next().value;
      if (oldest === undefined) break;
      this.#sentEnded.delete(oldest);
    }
  }

  #warn(error: unknown): void {
    const now = this.#now();
    if (now - this.#warnedAt < 5 * 60_000) return;
    this.#warnedAt = now;
    this.#logger.warn(`raid telemetry send failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Build the publisher from the environment, or null when telemetry is not configured. */
export function createRaidTelemetryFromEnv(
  env: Readonly<Record<string, string | undefined>>,
  realm: string,
  logger: Logger,
): RaidTelemetry | null {
  const token = env.METRICS_PUSH_TOKEN?.trim();
  if (!token || env.WOW_RAID_TELEMETRY?.trim().toLowerCase() === "false") return null;
  const url = new URL(env.METRICS_PUSH_URL?.trim() || "https://octometrics.eqvoice.workers.dev/api/ingest");
  if (url.protocol !== "https:" || url.pathname !== "/api/ingest" || url.username || url.password) {
    throw new Error("METRICS_PUSH_URL must be a secure /api/ingest endpoint");
  }
  const account = "bufftracker"; // a fixed source label: the game account name is never published
  const send: TelemetrySend = async (body) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    // 4xx other than a stale/duplicate ack is a bug in our payload: surface it, don't retry forever.
    if (response.status === 409) return true; // already stored / superseded
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  };
  logger.info("raid telemetry enabled: pushing authoritative raid sessions to OctoMetrics");
  return new RaidTelemetry({ send, realm, account, logger });
}
