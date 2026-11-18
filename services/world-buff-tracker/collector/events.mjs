import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
/**
 * A bounded async publisher: local JSONL plus optional authenticated HTTPS ingest.
 *
 * Delivery policy (the old one retried every failure, including permanent 4xx rejections, every ten seconds forever, so one rejected event
 * blocked every event behind it):
 *   2xx                                  delivered
 *   408, 425, 429, 5xx, network, timeout temporary: kept at the head and retried with backoff (events carry an eventId, so a retry the Worker
 *                                        already stored is recognised and not stored twice)
 *   any other 4xx                        the Worker refused this event for good: logged with its reason, counted, dropped
 * When the queue is full the oldest routine event (population, /who, health) goes first; drop announcements are kept for as long as possible.
 */
export const RETRYABLE_STATUS = new Set([408, 425, 429]);
export function classifyStatus(status) {
    if (status >= 200 && status < 300)
        return "delivered";
    if (RETRYABLE_STATUS.has(status) || status >= 500)
        return "retry";
    return "reject";
}
export class EventPublisher {
    file;
    url;
    token;
    queue = [];
    pumping = false;
    shuttingDown = false;
    fileChain = Promise.resolve();
    #fetch;
    #sleep;
    #now;
    #log;
    #maxQueue;
    #stdout;
    #stats = { delivered: 0, rejected: 0, dropped: 0, retries: 0, lastOkAt: null, lastError: null, lastErrorAt: null };
    constructor(file, url, token, options = {}) {
        this.file = file;
        this.url = url;
        this.token = token;
        this.#fetch = options.fetch ?? fetch;
        this.#sleep = options.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
        this.#now = options.now ?? Date.now;
        this.#log = options.log ?? (line => console.log(`DROPFLOW ${JSON.stringify(line)}`));
        this.#maxQueue = options.maxQueue ?? 500;
        this.#stdout = options.stdout ?? process.stdout;
        this.#append = options.append ?? (async (path, data) => { await mkdir(dirname(path), { recursive: true }); await appendFile(path, data, { encoding: "utf8", mode: 0o600 }); });
    }
    #append;
    /** What happened to events after they were handed over; reported in the listener heartbeat. */
    stats() { return { ...this.#stats, queued: this.queue.length }; }
    publish(event) {
        if (this.shuttingDown)
            return;
        process.stdout.write(`METRIC ${JSON.stringify(event)}\n`);
        this.fileChain = this.fileChain.then(() => this.#append(this.file, JSON.stringify(event) + "\n")).catch(e => console.error(`METRICS file error: ${String(e)}`));
        if (this.url) {
            if (this.queue.length >= this.#maxQueue) {
                const index = this.queue.findIndex(e => e.type !== "world_buff_drop");
                const [removed] = this.queue.splice(index >= 0 ? index : 0, 1);
                this.#stats.dropped += 1;
                console.error(`METRICS ingest queue full; dropped ${removed.type}`);
                this.#log({ stage: "dropped_queue_full", type: removed.type, eventId: removed.eventId ?? null });
            }
            this.queue.push(event);
            void this.pump();
        }
    }
    async pump() {
        if (this.pumping || !this.url)
            return;
        this.pumping = true;
        let delay = 10_000;
        try {
            while (this.queue.length && !this.shuttingDown) {
                const event = this.queue[0];
                let status = null, detail = "";
                try {
                    const response = await this.#fetch(this.url, {
                        method: "POST", headers: { "content-type": "application/json", ...(this.token ? { "authorization": `Bearer ${this.token}` } : {}) },
                        body: JSON.stringify(event), signal: AbortSignal.timeout(8000),
                    });
                    status = response.status;
                    if (status < 200 || status >= 300)
                        detail = (await response.text().catch(() => "")).slice(0, 300);
                }
                catch (error) {
                    detail = String(error);
                }
                const verdict = status === null ? "retry" : classifyStatus(status);
                const isDrop = event.type === "world_buff_drop";
                if (verdict === "delivered") {
                    this.queue.shift();
                    this.#stats.delivered += 1;
                    this.#stats.lastOkAt = this.#now();
                    delay = 10_000;
                    if (isDrop)
                        this.#log({ stage: "accepted", status, type: event.type, faction: event.faction, buff: event.buff, eventId: event.eventId ?? null, observedAt: event.time });
                }
                else if (verdict === "reject") {
                    this.queue.shift();
                    this.#stats.rejected += 1;
                    this.#stats.lastError = `HTTP ${status} ${detail}`.trim();
                    this.#stats.lastErrorAt = this.#now();
                    console.error(`METRICS ingest rejected ${event.type}: HTTP ${status} ${detail}`);
                    this.#log({ stage: "rejected", status, reason: detail, type: event.type, faction: event.faction ?? null, buff: event.buff ?? null, eventId: event.eventId ?? null, observedAt: event.time });
                }
                else {
                    this.#stats.retries += 1;
                    this.#stats.lastError = status === null ? detail : `HTTP ${status} ${detail}`.trim();
                    this.#stats.lastErrorAt = this.#now();
                    console.error(`METRICS ingest deferred: ${this.#stats.lastError}`);
                    if (isDrop)
                        this.#log({ stage: "publish_deferred", status, reason: detail, eventId: event.eventId ?? null, retryInMs: delay });
                    await this.#sleep(delay);
                    delay = Math.min(delay * 2, 120_000);
                }
            }
        }
        finally {
            this.pumping = false;
        }
    }
    async close() { this.shuttingDown = true; await this.fileChain; }
}
