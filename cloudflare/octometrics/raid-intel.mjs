/**
 * Onyxia / Nefarian raid intelligence for the OctoMetrics Worker.
 *
 * Pure functions only (no I/O) so they can be unit-tested. They work from events the
 * deployed collector already stores in D1:
 *   - `world_buff_drop`  : a capital-city yell. The yell text names the head that was handed in.
 *   - `raid_who`         : /who headcount for Onyxia's Lair (role "sw") and Blackwing Lair (role "org"),
 *                          with `activityChange` = "activity_started" | "activity_ended" transitions.
 *
 * Principles
 *   - A drop is CONFIRMED only by a capital yell. A clear estimate is always an ESTIMATE.
 *   - OctoWoW has no head-drop cooldown, and none is modelled here. No buff-duration timer either.
 *   - Method ported from services/world-buff-tracker (duration-store.ts): the median of observed
 *     form -> clear durations, with plausibility bounds. Samples are headcount "activity sessions",
 *     which are noisier than that tracker's roster cohorts, so confidence is graded accordingly.
 */

export const RAIDS = Object.freeze({
  onyxia: Object.freeze({ head: 'onyxia', name: "Onyxia", role: 'sw', zoneName: "Onyxia's Lair", minClearMs: 10 * 60_000, maxClearMs: 6 * 3_600_000 }),
  nefarian: Object.freeze({ head: 'nefarian', name: 'Nefarian', role: 'org', zoneName: 'Blackwing Lair', minClearMs: 30 * 60_000, maxClearMs: 10 * 3_600_000 }),
});

/** Fewest plausible sessions before any estimate is shown. */
export const MIN_SAMPLES = 5;

// Yell phrases (from the deployed collector's buff matcher). Each one belongs to exactly one head and faction.
const HEAD_YELLS = Object.freeze([
  { faction: 'alliance', head: 'onyxia', needle: 'Onyxia, hangs from the arches' },
  { faction: 'alliance', head: 'nefarian', needle: 'the Lord of Blackrock is slain! Nefarian has been subdued' },
  { faction: 'horde', head: 'onyxia', needle: 'The brood mother, Onyxia, has been slain' },
  { faction: 'horde', head: 'nefarian', needle: 'NEFARIAN IS SLAIN! People of Orgrimmar' },
]);

/** Which head a capital yell announces, or null when the text is missing or unrecognised. */
export function headFromYell(text) {
  if (typeof text !== 'string') return null;
  return HEAD_YELLS.find(entry => text.includes(entry.needle))?.head ?? null;
}

/**
 * Pair start/end transitions (oldest first) into completed activity sessions.
 * An end with no open start (for example after a collector restart) is ignored rather than guessed.
 */
export function pairSessions(events) {
  const sessions = [];
  let open = null;
  for (const event of events) {
    const payload = event.payload || {};
    const observed = Date.parse(event.observed_at);
    if (payload.activityChange === 'activity_started') {
      const start = Date.parse(payload.activityStart);
      open = Number.isFinite(start) ? start : observed;
    } else if (payload.activityChange === 'activity_ended' && open !== null) {
      const end = Date.parse(payload.activityEnd);
      const endAt = Number.isFinite(end) ? end : observed;
      if (endAt > open) sessions.push({ startAt: open, endAt, durationMs: endAt - open });
      open = null;
    }
  }
  return sessions;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

const LEVELS = ['none', 'low', 'medium', 'high'];

/** Sample count sets the grade; a wide spread between raids lowers it one step (never below "low"). */
export function confidenceFor(samples, medianMs, p25Ms, p75Ms) {
  if (samples < MIN_SAMPLES) return 'none';
  let level = samples >= 15 ? 3 : samples >= 10 ? 2 : 1;
  if (medianMs > 0 && (p75Ms - p25Ms) / medianMs > 0.75) level = Math.max(1, level - 1);
  return LEVELS[level];
}

/** Learned clear duration for one raid from its completed sessions. Implausible sessions are dropped. */
export function learnDurations(sessions, raid) {
  const plausible = sessions.map(s => s.durationMs).filter(ms => ms >= raid.minClearMs && ms <= raid.maxClearMs).sort((a, b) => a - b);
  const samples = plausible.length;
  const medianMs = quantile(plausible, 0.5);
  const p25Ms = quantile(plausible, 0.25), p75Ms = quantile(plausible, 0.75);
  return {
    samples, rejected: sessions.length - samples, medianMs, p25Ms, p75Ms,
    confidence: samples ? confidenceFor(samples, medianMs, p25Ms, p75Ms) : 'none',
  };
}

/**
 * Estimated clear for a raid that is in progress right now.
 * status: idle (no live raid) | learning (too few past raids) | estimated | due | overdue.
 * `confirmed` is always false: an estimate is never a guaranteed head drop.
 */
export function estimateClear({ active, startedAt, now, learned }) {
  const base = { confirmed: false, basis: 'median of past observed raid sessions', samples: learned?.samples ?? 0, minSamples: MIN_SAMPLES, confidence: learned?.confidence ?? 'none' };
  if (!active || !Number.isFinite(startedAt)) return { ...base, status: 'idle' };
  if (!learned || learned.samples < MIN_SAMPLES) return { ...base, status: 'learning' };
  const estimatedAt = startedAt + learned.medianMs;
  const earliestAt = startedAt + learned.p25Ms, latestAt = startedAt + learned.p75Ms;
  const status = now <= estimatedAt ? 'estimated' : now <= latestAt ? 'due' : 'overdue';
  return {
    ...base, status,
    estimatedAt: new Date(estimatedAt).toISOString(),
    earliestAt: new Date(earliestAt).toISOString(),
    latestAt: new Date(latestAt).toISOString(),
    medianMs: Math.round(learned.medianMs),
  };
}

/**
 * Last confirmed drops by head and faction from stored world_buff_drop events (newest first).
 * Events whose yell is missing or unrecognised are reported with head null, never guessed.
 */
export function summariseDrops(events) {
  const byHead = { onyxia: { alliance: null, horde: null }, nefarian: { alliance: null, horde: null }, unknown: { alliance: null, horde: null } };
  for (const event of events) {
    const payload = event.payload || {};
    const faction = payload.faction === 'alliance' || payload.faction === 'horde' ? payload.faction : null;
    if (!faction) continue;
    const head = headFromYell(payload.text) ?? 'unknown';
    if (!byHead[head][faction]) byHead[head][faction] = { at: event.observed_at, source: payload.source || 'npc_yell', confirmed: true };
  }
  return byHead;
}

/** The raid object returned for one head, combining headcount observation, learned duration and drops. */
export function buildHead({ raid, latestWho, learned, drops, now, freshSeconds = 150 }) {
  const payload = latestWho?.payload || {};
  const observedMs = Date.parse(latestWho?.observed_at);
  const fresh = Number.isFinite(observedMs) && now - observedMs <= freshSeconds * 1000 && now - observedMs >= -30_000;
  const active = fresh ? payload.activity ?? null : null;
  const startedAt = Date.parse(payload.activityStart);
  return {
    head: raid.head,
    name: raid.name,
    zone: raid.zoneName,
    raid: latestWho ? {
      observedAt: latestWho.observed_at, fresh, active,
      players: payload.playersListed ?? null, listCapped: payload.listCapped ?? null,
      activityStart: Number.isFinite(startedAt) ? payload.activityStart : null,
      // Headcount presence only. A raid leaving the zone is not proof of a kill.
      clearConfirmed: false,
    } : null,
    clear: estimateClear({ active: active === true, startedAt, now, learned }),
    learned: learned ? { samples: learned.samples, medianMs: learned.medianMs === null ? null : Math.round(learned.medianMs), p25Ms: learned.p25Ms === null ? null : Math.round(learned.p25Ms), p75Ms: learned.p75Ms === null ? null : Math.round(learned.p75Ms), confidence: learned.confidence } : null,
    drops,
  };
}
