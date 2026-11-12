import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import type { Faction } from "./buff-store.js";
import type { RaidEvent } from "./raid-events.js";

/**
 * Remembers the last park-alert we broadcast for each (city, kind), so a repeat of the
 * SAME buff cycle is suppressed no matter what shook the roster loose:
 *
 *   - a redeploy re-reads /who and sees the raid already in progress ("underway"),
 *   - a wipe drops the count below the clear line and it climbs back ("cleared" twice),
 *   - ordinary churn wobbles the count across a threshold.
 *
 * None of those is a new reason to park. The dedup is keyed to the buff CYCLE (the pending
 * window before a fresh Rallying Cry drops), not to the in-memory raid detector — which is
 * exactly why it lives in the DB and survives a restart. `shouldBroadcast` decides; the
 * store just persists the timestamps. There are only ever a handful of rows (cities × kinds).
 */

export type RaidEventKind = RaidEvent["kind"];
/** The dedup keys the ledger tracks: one per raid-event alert (forming, cleared), plus the
 *  "about to clear" heads-up, which has no RaidEvent of its own (it fires from a raid's elapsed
 *  time crossing its predicted-clear lead, not from a detector). */
export type BroadcastKind = RaidEventKind | "raid-ending";

export interface BroadcastRecord {
  readonly city: Faction;
  readonly kind: BroadcastKind;
  /** The raid group this alert was about, for the log and the status query. */
  readonly cohortLabel: string;
  readonly peak: number;
  /** The raid number this broadcast was for — lets a per-raid dedup (the "about to clear" heads-up)
   *  survive reconnects and restarts, since it lives in the DB rather than in per-connection memory. */
  readonly raidNumber?: number | null;
  /** When we last broadcast this (city, kind). */
  readonly lastBroadcastAt: Date;
}

/**
 * Is a park-alert for (city, kind) a fresh one worth sending, or one we've already sent
 * this cycle? A cycle ends when a fresh buff actually drops for that city, so:
 *
 *   - never broadcast before  → yes,
 *   - a buff has dropped since our last broadcast (`lastBuffDropAt` is newer) → new cycle, yes,
 *   - our last broadcast is older than `maxCycleMs` → stale (e.g. a run whose buff we never
 *     heard), so don't stay muted forever → yes,
 *   - otherwise we already spoke this pending cycle → no.
 */
export function shouldBroadcast(
  last: Pick<BroadcastRecord, "lastBroadcastAt"> | null,
  lastBuffDropAt: Date | null,
  now: number,
  maxCycleMs: number,
): boolean {
  if (!last) return true;
  if (now - last.lastBroadcastAt.getTime() >= maxCycleMs) return true;
  if (lastBuffDropAt && lastBuffDropAt.getTime() > last.lastBroadcastAt.getTime()) return true;
  return false;
}

/**
 * Should a raid-event alert (forming/cleared) fire for a (city, kind)? Deduped PER RAID NUMBER, the
 * same way the "about to clear" heads-up is: fire once per DISTINCT raid, so a single raid's
 * wipe/roster-churn re-emitting the same event (same number) is suppressed, but every distinct raid
 * alerts BOTH cities. There is no re-drop cooldown on this server — each clear is a fresh buff
 * opportunity — so a new raid must never be muted by an older one's alert.
 *
 * Falls back to the per-buff-cycle `shouldBroadcast` only when the event carries NO number (a
 * detector-emitted forming below strength), where there is no raid number to dedup on yet.
 *
 * (Before this, the clear used the per-cycle dedup, a cooldown-era remnant: a raid that cleared
 * within `maxCycleMs` of an earlier raid's clear — with no buff dropped for that city since — had its
 * clear silently swallowed for that city, which is how one faction vanished from a raid's clear post.)
 */
export function shouldBroadcastRaid(
  last: Pick<BroadcastRecord, "lastBroadcastAt" | "raidNumber"> | null,
  raidNumber: number | null,
  lastBuffDropAt: Date | null,
  now: number,
  maxCycleMs: number,
): boolean {
  if (raidNumber != null) return last?.raidNumber == null || last.raidNumber !== raidNumber;
  return shouldBroadcast(last, lastBuffDropAt, now, maxCycleMs);
}

/**
 * Is `faction` still within a server Rallying Cry cooldown — a fresh buff cannot drop for it yet,
 * so a "park now" alert would be misleading and is suppressed? `cooldownMs` of 0 means no cooldown
 * (always false — a buff can drop on any clear, this server's default).
 */
export function onBuffCooldown(lastBuffDropAt: Date | null, now: number, cooldownMs: number): boolean {
  return cooldownMs > 0 && lastBuffDropAt != null && now - lastBuffDropAt.getTime() < cooldownMs;
}

/** Milliseconds until the cooldown elapses for a side (a fresh buff can drop again), or 0 when off
 *  cooldown / when there is no cooldown. For the status readout. */
export function buffCooldownRemainingMs(lastBuffDropAt: Date | null, now: number, cooldownMs: number): number {
  if (cooldownMs <= 0 || lastBuffDropAt == null) return 0;
  const remaining = cooldownMs - (now - lastBuffDropAt.getTime());
  return remaining > 0 ? remaining : 0;
}

export interface BroadcastLedger {
  /** The last broadcast for a (city, kind), or null if there's never been one. */
  last(city: Faction, kind: BroadcastKind): Promise<BroadcastRecord | null>;
  /** Record a broadcast we just sent (upsert on city+kind). */
  record(rec: BroadcastRecord): Promise<void>;
  close(): Promise<void>;
}

function key(city: Faction, kind: BroadcastKind): string {
  return `${city}:${kind}`;
}

/** In-memory ledger — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryBroadcastLedger implements BroadcastLedger {
  readonly #records = new Map<string, BroadcastRecord>();

  async last(city: Faction, kind: BroadcastKind): Promise<BroadcastRecord | null> {
    return this.#records.get(key(city, kind)) ?? null;
  }

  async record(rec: BroadcastRecord): Promise<void> {
    this.#records.set(key(rec.city, rec.kind), rec);
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface BroadcastDoc {
  readonly city: Faction;
  readonly kind: BroadcastKind;
  readonly cohortLabel: string;
  readonly peak: number;
  readonly raidNumber?: number | null;
  readonly lastBroadcastAt: Date;
}

/** Narrow port over the Mongo collection, so the ledger's logic is unit-tested with a fake. */
export interface BroadcastDb {
  get(city: Faction, kind: BroadcastKind): Promise<BroadcastDoc | null>;
  upsert(doc: BroadcastDoc): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "broadcasts";

export class MongoBroadcastLedger implements BroadcastLedger {
  readonly #db: BroadcastDb;

  constructor(db: BroadcastDb) {
    this.#db = db;
  }

  /** `collectionName` keeps another raid's alerts apart: each lair's raids are deduped on their own. */
  static async open(database: Db, collectionName: string = COLLECTION): Promise<MongoBroadcastLedger> {
    const collection = database.collection<BroadcastDoc>(collectionName);
    await collection.createIndex({ city: 1, kind: 1 }, { unique: true });
    const db: BroadcastDb = {
      get: (city, kind) => collection.findOne({ city, kind }),
      upsert: (doc) =>
        collection
          .updateOne({ city: doc.city, kind: doc.kind }, { $set: doc }, { upsert: true })
          .then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoBroadcastLedger(db);
  }

  async last(city: Faction, kind: BroadcastKind): Promise<BroadcastRecord | null> {
    const doc = await this.#db.get(city, kind);
    return doc
      ? {
          city: doc.city,
          kind: doc.kind,
          cohortLabel: doc.cohortLabel,
          peak: doc.peak,
          raidNumber: doc.raidNumber ?? null,
          lastBroadcastAt: doc.lastBroadcastAt,
        }
      : null;
  }

  async record(rec: BroadcastRecord): Promise<void> {
    await this.#db.upsert({
      city: rec.city,
      kind: rec.kind,
      cohortLabel: rec.cohortLabel,
      peak: rec.peak,
      raidNumber: rec.raidNumber ?? null,
      lastBroadcastAt: rec.lastBroadcastAt,
    });
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
