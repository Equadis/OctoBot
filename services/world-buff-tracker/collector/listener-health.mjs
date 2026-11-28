/**
 * What a city listener can honestly say about itself. Being logged in, answering /who and answering whispers prove nothing about the one thing it
 * is for: hearing the capital's announcements. So the health report separates:
 *   connected / since when          (the socket and the world login)
 *   last monster yell of ANY kind   (the listener is in earshot of the world; capitals are never silent, see services/world-buff-tracker
 *                                    watcher/listener-silence.ts for the measurements behind that)
 *   last recognised drop announcement, last drop handed to the publisher, last publication the Worker accepted
 * The Worker turns these into a status; the collector only reports facts.
 */
export class ListenerHealth {
    #connectedAt = null;
    #lastYellAt = null;
    #yells = 0;
    #lastMatchedAt = null;
    #lastMatchedFaction = null;
    #lastMatchedHead = null;
    #lastQueuedAt = null;
    #suppressed = 0;
    #disconnectedAt = null;
    #disconnectReason = null;
    constructor(account) { this.account = account; }
    connected(at) { this.#connectedAt = at; this.#disconnectedAt = null; this.#disconnectReason = null; }
    disconnected(at, reason) { this.#connectedAt = null; this.#disconnectedAt = at; this.#disconnectReason = reason ?? null; }
    heardYell(at) { this.#lastYellAt = at; this.#yells += 1; }
    matched(at, faction, head) { this.#lastMatchedAt = at; this.#lastMatchedFaction = faction; this.#lastMatchedHead = head ?? null; }
    deduplicated() { this.#suppressed += 1; }
    queued(at) { this.#lastQueuedAt = at; }
    /** Facts for one heartbeat. publisher is publisher.stats(): what happened to events after the collector handed them over. */
    snapshot(now, publisher = {}) {
        const iso = ms => (ms === null || ms === undefined ? null : new Date(ms).toISOString());
        return {
            connected: this.#connectedAt !== null,
            connectedSince: iso(this.#connectedAt),
            ...(this.#disconnectedAt !== null ? { disconnectedAt: iso(this.#disconnectedAt), reason: this.#disconnectReason } : {}),
            lastYellAt: iso(this.#lastYellAt),
            yellsHeard: this.#yells,
            lastMatchedAt: iso(this.#lastMatchedAt),
            lastMatchedFaction: this.#lastMatchedFaction,
            lastMatchedHead: this.#lastMatchedHead,
            lastDropQueuedAt: iso(this.#lastQueuedAt),
            dropsSuppressed: this.#suppressed,
            lastIngestOkAt: iso(publisher.lastOkAt ?? null),
            lastIngestError: publisher.lastError ?? null,
            lastIngestErrorAt: iso(publisher.lastErrorAt ?? null),
            ingestQueued: publisher.queued ?? 0,
            ingestRejected: publisher.rejected ?? 0,
            heartbeatAt: iso(now),
        };
    }
}
