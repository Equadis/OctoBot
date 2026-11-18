/**
 * World buff drop pipeline for the OctoMetrics collector:
 *   NPC message received -> matched -> deduplicated -> published   (accepted / stored / returned by the API are the Worker's stages)
 * Every stage that decides something writes one structured line, so a missed drop is explainable afterwards.
 *
 * What the old code did wrong: it deduplicated on `realm:buff`, one five-minute window shared by Alliance and Horde and by both heads. A Horde
 * drop therefore silently swallowed an Alliance drop in the next five minutes (and the reverse), and nothing was logged when it did.
 */
import { createHash } from "node:crypto";
import { matchRallyYell, isWarchiefBlessingYell, RALLY_BUFF, WARCHIEF_BUFF } from "./buffs.mjs";

/**
 * Two announcements are the same announcement only when realm, faction, buff and head all match AND they arrive close together. Repeats of one
 * yell (a second listener in the same city, a repeated packet) arrive within seconds; a genuinely new turn-in is a new yell. Sixty seconds covers
 * the first without hiding the second. (It was five minutes, shared across factions.)
 */
export const DEFAULT_DEDUPE_MS = 60_000;
// The listener for each role stands in one capital and can only hear that faction's yells.
const ROLE_FACTION = { sw: "alliance", org: "horde" };

export function dropKey({ realm, faction, buff, head }) {
    return `${realm}:${faction}:${buff}:${head ?? "unknown"}`;
}

/** A stable identity for one announcement. A retry of the same event carries the same id, so the Worker can recognise it. */
export function eventIdFor({ realm, faction, buff, head, time, text }) {
    return createHash("sha256").update([realm, faction, buff, head ?? "", time, text ?? ""].join("|")).digest("hex").slice(0, 24);
}

export class DropDeduper {
    #seen = new Map();
    #windowMs;
    #now;
    constructor(windowMs = DEFAULT_DEDUPE_MS, now = Date.now) {
        this.#windowMs = windowMs;
        this.#now = now;
    }
    get windowMs() { return this.#windowMs; }
    /** "new" the first time within the window, "duplicate" (with the age of the first) after that. Only a new event starts a window. */
    check(key) {
        const now = this.#now();
        for (const [k, at] of this.#seen)
            if (now - at >= this.#windowMs)
                this.#seen.delete(k);
        const first = this.#seen.get(key);
        if (first !== undefined)
            return { result: "duplicate", ageMs: now - first };
        this.#seen.set(key, now);
        return { result: "new", ageMs: 0 };
    }
}

/**
 * handleYell(account, sender, text, health?) -> { outcome, ... }
 *   outcome: "ignored" (not a drop announcement), "faction_mismatch", "duplicate", "published"
 */
export function createDropPipeline({ publish, windowMs = DEFAULT_DEDUPE_MS, now = Date.now, log = () => { } }) {
    const deduper = new DropDeduper(windowMs, now);
    function drop(account, sender, text, buff, faction, head, health) {
        const base = { realm: account.realmName, account: account.account, role: account.role, faction, buff, head: head ?? null };
        const expected = ROLE_FACTION[account.role];
        if (expected && expected !== faction) {
            // A Horde announcement heard by the Stormwind character (or the reverse) is not a drop for that capital, and the Worker would refuse it.
            log({ stage: "rejected_locally", reason: "faction_does_not_match_listener", ...base });
            return { outcome: "faction_mismatch", ...base };
        }
        health?.matched?.(now(), faction, head);
        log({ stage: "matched", ...base, sender });
        const verdict = deduper.check(dropKey({ realm: account.realmName, faction, buff, head }));
        if (verdict.result === "duplicate") {
            health?.deduplicated?.(now());
            log({ stage: "deduplicated", ...base, firstSeenMsAgo: verdict.ageMs, windowMs: deduper.windowMs });
            return { outcome: "duplicate", ...base };
        }
        const time = new Date(now()).toISOString();
        const event = {
            type: "world_buff_drop", time, realm: account.realmName, account: account.account, role: account.role,
            buff, faction, ...(head ? { head } : {}), sender, text, source: "npc_yell",
            eventId: eventIdFor({ realm: account.realmName, faction, buff, head, time, text }),
        };
        publish(event);
        health?.queued?.(now());
        log({ stage: "published", ...base, eventId: event.eventId, observedAt: time });
        return { outcome: "published", event, ...base };
    }
    return {
        deduper,
        handleYell(account, sender, text, health) {
            const rally = matchRallyYell(text);
            if (rally)
                return drop(account, sender, text, RALLY_BUFF, rally.faction, rally.head, health);
            if (account.role === "org" && isWarchiefBlessingYell(text))
                return drop(account, sender, text, WARCHIEF_BUFF, "horde", null, health);
            return { outcome: "ignored" };
        },
    };
}
