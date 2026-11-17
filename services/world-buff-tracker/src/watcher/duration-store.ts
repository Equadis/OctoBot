import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";

/**
 * Records how long each observed Onyxia raid took (form → clear) so the forming
 * heads-up can predict a raid's end from the LEARNED median instead of a fixed config
 * guess. Self-improving: the more raids it sees, the better the estimate.
 *
 * The median is used (not the mean) because clear times are right-skewed — a wipe or a
 * stalled raid drags the mean up, while the median tracks the typical run. It is only
 * returned once at least `minSamples` are in hand, so a couple of early raids can't set
 * a wild estimate.
 */
export interface RaidDuration {
  readonly ms: number;
  readonly ts: Date;
  readonly sessionKey?: string;
  readonly valid?: boolean;
}

export interface DurationStore {
  record(duration: RaidDuration): Promise<void>;
  /** Retract a previous inferred completion without deleting historical evidence. */
  invalidate?(sessionKey: string): Promise<void>;
  /** Median clear time (ms) once at least `minSamples` are recorded, else null. */
  median(minSamples: number): Promise<number | null>;
  /** The most recent durations, up to `limit`, in CHRONOLOGICAL order (oldest first) —
   *  for the timer self-evaluation, which replays history forwards. */
  recent(limit: number): Promise<RaidDuration[]>;
  count(): Promise<number>;
  close(): Promise<void>;
}

/**
 * Whether a form→clear duration is long enough to be a real Onyxia clear rather than
 * churn — a crowd that gathered and scattered, common when the server is flaky. Such
 * short "clears" are dropped before recording so they can't drag the learned median
 * down (which would make the buff-timing gate predict raids ending too early).
 */
export function isPlausibleClear(ms: number, minMs: number): boolean {
  return ms >= minMs;
}

export function medianOf(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryDurationStore implements DurationStore {
  readonly #durations: RaidDuration[] = [];

  async record(duration: RaidDuration): Promise<void> {
    const ix = duration.sessionKey ? this.#durations.findIndex(d => d.sessionKey === duration.sessionKey) : -1;
    if (ix >= 0) this.#durations[ix] = duration; else this.#durations.push(duration);
  }
  async invalidate(key: string): Promise<void> {
    const ix = this.#durations.findIndex(d => d.sessionKey === key);
    const old = this.#durations[ix]; if (old) this.#durations[ix] = {...old, valid: false};
  }
  async median(minSamples: number): Promise<number | null> {
    const valid = this.#durations.filter(d => d.valid !== false);
    if (valid.length < minSamples) return null;
    return medianOf(valid.map(d => d.ms));
  }
  async recent(limit: number): Promise<RaidDuration[]> {
    return this.#durations.filter(d => d.valid !== false).slice(-limit);
  }
  async count(): Promise<number> {
    return this.#durations.filter(d => d.valid !== false).length;
  }
  async close(): Promise<void> {
    // nothing to release
  }
}

interface DurationDoc extends RaidDuration {}

/** Pick the latest revision per numbered or unnumbered session before testing eligibility.
 * Do not let a superseded valid duplicate escape an invalidation. Use explicit fields
 * instead of replacing the root with a special Mongo aggregation variable.
 */
export function durationLearningPipeline(): Record<string, unknown>[] {
  return [
    { $match: { sessionKey: { $type: "string", $ne: "" } } },
    { $sort: { ts: -1, _id: -1 } },
    { $group: { _id: "$sessionKey", ms: { $first: "$ms" }, ts: { $first: "$ts" }, valid: { $first: "$valid" } } },
    { $match: { valid: true, ms: { $type: "number", $gt: 0 } } },
    { $project: { _id: 0, sessionKey: "$_id", ms: 1, ts: 1, valid: 1 } },
  ];
}

/** Narrow port over a Mongo collection, so the store's logic is unit-tested with a fake. */
export interface DurationDb {
  insert(doc: DurationDoc): Promise<void>;
  invalidate?(sessionKey: string): Promise<void>;
  /** Most recent durations, up to `limit`. */
  recent(limit: number): Promise<DurationDoc[]>;
  count(): Promise<number>;
  close(): Promise<void>;
}

const COLLECTION = "raiddurations";
const DEFAULT_TTL_DAYS = 90;
/** Enough to characterise the current cadence without letting stale weeks dominate. */
const MEDIAN_WINDOW = 200;

export class MongoDurationStore implements DurationStore {
  readonly #db: DurationDb;

  constructor(db: DurationDb) {
    this.#db = db;
  }

  /** `collectionName` keeps another raid's clear times apart — a BWL clear is hours, not Onyxia's minutes. */
  static async open(
    database: Db,
    ttlDays: number = DEFAULT_TTL_DAYS,
    collectionName: string = COLLECTION,
  ): Promise<MongoDurationStore> {
    const collection = database.collection<DurationDoc>(collectionName);
    await collection.createIndex({ ts: 1 }, { expireAfterSeconds: ttlDays * 86_400 });
    // Legacy unkeyed observations cannot be linked to a raid or a later retraction.
    // Retain them in Mongo for audit, but do not use them for authoritative predictions.
    const unique = durationLearningPipeline();
    const db: DurationDb = {
      insert: (doc) => doc.sessionKey ? collection.updateMany({sessionKey:doc.sessionKey},{$set:doc},{upsert:true}).then(()=>undefined) : collection.insertOne(doc).then(() => undefined),
      invalidate: (sessionKey) => collection.updateMany({sessionKey},{$set:{valid:false}}).then(()=>undefined),
      recent: (limit) => collection.aggregate<DurationDoc>([...unique, { $sort: { ts: -1 } }, { $limit: limit }]).toArray(),
      count: async () => (await collection.aggregate<{ count:number }>([...unique, { $count: "count" }]).next())?.count ?? 0,
      close: releaseSharedClient,
    };
    return new MongoDurationStore(db);
  }

  async record(duration: RaidDuration): Promise<void> {
    await this.#db.insert({ ...duration });
  }

  async invalidate(key: string): Promise<void> { await this.#db.invalidate?.(key); }

  async median(minSamples: number): Promise<number | null> {
    const docs = await this.#db.recent(MEDIAN_WINDOW);
    if (docs.length < minSamples) return null;
    return medianOf(docs.map((d) => d.ms));
  }

  async recent(limit: number): Promise<RaidDuration[]> {
    // The port returns newest-first; the evaluation replays forwards, so reverse to chronological.
    const docs = await this.#db.recent(limit);
    return docs.reverse().map((d) => ({ ms: d.ms, ts: d.ts }));
  }

  async count(): Promise<number> {
    return this.#db.count();
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
