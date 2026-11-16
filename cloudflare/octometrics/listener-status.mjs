/**
 * What the Worker can truthfully say about a city listener, from the facts its collector reports (collector/dist-metrics/metrics/listener-health.js).
 *
 * A listener that is connected is not necessarily a listener that can hear: it can answer /who and whispers while standing somewhere no
 * announcement reaches (dead and released, inside a building, in a corner of the zone). Capitals are never silent, because criers and vendors yell
 * through the day, so the honest test is "has it heard ANY monster yell lately", not "has it heard a buff drop". See
 * services/world-buff-tracker/src/watcher/listener-silence.ts for the measurements behind this.
 *
 * Statuses:
 *   unverified  no health report has ever arrived (a collector that predates health reporting): nothing is claimed either way
 *   offline     the heartbeat is stale, or the listener reported that it is not connected
 *   degraded    connected, but what it published is not being accepted (events are waiting after errors)
 *   silent      connected and heartbeating, but no monster yell for longer than a capital normally allows: potentially deaf or out of range
 *   healthy     connected, heartbeating, hearing the world, publishing without errors
 */
export const HEARTBEAT_FRESH_MS = 150_000;
// Stormwind characters were measured hearing a yell every few minutes; Orgrimmar characters far less often and sometimes never, so Orgrimmar
// gets a much longer allowance. These are starting values: the health reports now being stored will show the real gaps.
export const SILENCE_MS = Object.freeze({ sw: 2 * 3_600_000, org: 6 * 3_600_000, bb: 12 * 3_600_000 });
export const INGEST_TROUBLE_MS = 10 * 60_000;

const time = value => { const ms = Date.parse(value); return Number.isFinite(ms) ? ms : null; };

export function listenerStatus({ role, account, health, session = null, lastStoredDropAt = null, now = Date.now() }) {
  const base = { account, role, reportsHealth: Boolean(health), lastStoredDropAt };
  if (!health) {
    return {
      ...base, status: 'unverified',
      detail: session && session.status === 'online'
        ? 'Logged in, but this collector does not report what the listener hears. A missed announcement cannot be ruled out.'
        : 'No listener health has been reported.',
    };
  }
  const p = health.payload || {};
  const heartbeatAt = health.observed_at;
  const facts = {
    connected: p.connected === true, heartbeatAt, connectedSince: p.connectedSince ?? null,
    lastYellAt: p.lastYellAt ?? null, yellsHeard: Number.isFinite(p.yellsHeard) ? p.yellsHeard : null,
    lastMatchedAt: p.lastMatchedAt ?? null, lastMatchedFaction: p.lastMatchedFaction ?? null, lastMatchedHead: p.lastMatchedHead ?? null,
    lastDropQueuedAt: p.lastDropQueuedAt ?? null, dropsSuppressed: Number.isFinite(p.dropsSuppressed) ? p.dropsSuppressed : null,
    lastIngestOkAt: p.lastIngestOkAt ?? null, lastIngestError: p.lastIngestError ?? null, lastIngestErrorAt: p.lastIngestErrorAt ?? null,
    ingestQueued: Number.isFinite(p.ingestQueued) ? p.ingestQueued : 0, ingestRejected: Number.isFinite(p.ingestRejected) ? p.ingestRejected : 0,
  };
  const age = now - (time(heartbeatAt) ?? 0);
  if (!Number.isFinite(age) || age > HEARTBEAT_FRESH_MS || age < -30_000 || !facts.connected) {
    return { ...base, ...facts, status: 'offline', detail: facts.connected ? 'The listener has stopped reporting.' : 'The listener is not connected.' };
  }
  const errorAt = time(facts.lastIngestErrorAt), okAt = time(facts.lastIngestOkAt);
  if (facts.ingestQueued > 0 && errorAt !== null && now - errorAt < INGEST_TROUBLE_MS && (okAt === null || errorAt >= okAt)) {
    return { ...base, ...facts, status: 'degraded', detail: 'Events are waiting to be delivered after errors: ' + String(facts.lastIngestError || 'unknown error').slice(0, 120) };
  }
  const silenceMs = SILENCE_MS[role] ?? SILENCE_MS.bb;
  const heardAt = time(facts.lastYellAt) ?? time(facts.connectedSince);
  if (heardAt !== null && now - heardAt > silenceMs) {
    return { ...base, ...facts, status: 'silent', detail: 'Connected, but no monster yell has been heard for a long time: potentially deaf or outside announcement range.' };
  }
  return { ...base, ...facts, status: 'healthy', detail: 'Connected and hearing the world.' };
}
