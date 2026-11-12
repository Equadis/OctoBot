import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";

/**
 * Remembers which Chronicle kills we've already processed and how they reconciled. Chronicle's
 * /recent is a small rolling window that we re-fetch every poll, so the SAME logs come back
 * repeatedly — `knownLogIds` lets the poller act only on ones it hasn't seen. Each kill's
 * `matched` verdict (was it a raid we detected?) is kept so recall can be measured over time.
 * Idempotent on `logId`: the first verdict stands (our snapshots for that time already exist by
 * the time a log is uploaded, so re-evaluating later would not change it).
 */
export interface StoredKill {
  readonly logId: string;
  readonly realm: string;
  readonly uploader: string;
  readonly at: Date;
  readonly playerCount: number;
  readonly matched: boolean;
  readonly processedAt: Date;
}

export interface ChronicleStore {
  /** Which of these logIds are already stored — so the poller processes only NEW kills. */
  knownLogIds(logIds: readonly string[]): Promise<Set<string>>;
  /** Persist a processed kill; a repeat logId is ignored (the first verdict stands). */
  record(kill: StoredKill): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryChronicleStore implements ChronicleStore {
  readonly #byId = new Map<string, StoredKill>();

  async knownLogIds(logIds: readonly string[]): Promise<Set<string>> {
    return new Set(logIds.filter((id) => this.#byId.has(id)));
  }
  async record(kill: StoredKill): Promise<void> {
    if (!this.#byId.has(kill.logId)) this.#byId.set(kill.logId, kill);
  }
  async close(): Promise<void> {
    // nothing to release
  }
}

/** Narrow port over a Mongo collection, so the store's logic is unit-tested with a fake. */
export interface ChronicleDb {
  existing(logIds: readonly string[]): Promise<string[]>;
  upsert(kill: StoredKill): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "chroniclekills";
const DEFAULT_TTL_DAYS = 90;

export class MongoChronicleStore implements ChronicleStore {
  readonly #db: ChronicleDb;

  constructor(db: ChronicleDb) {
    this.#db = db;
  }

  static async open(
    database: Db,
    ttlDays: number = DEFAULT_TTL_DAYS,
  ): Promise<MongoChronicleStore> {
    const collection = database.collection<StoredKill>(COLLECTION);
    await collection.createIndex({ logId: 1 }, { unique: true });
    await collection.createIndex({ processedAt: 1 }, { expireAfterSeconds: ttlDays * 86_400 });
    const db: ChronicleDb = {
      existing: (logIds) =>
        collection
          .find({ logId: { $in: [...logIds] } })
          .toArray()
          .then((docs) => docs.map((d) => d.logId)),
      // logId comes from the filter on insert, so $setOnInsert carries only the rest — setting a
      // field that's also the query key would be a conflict.
      upsert: ({ logId, ...rest }) =>
        collection.updateOne({ logId }, { $setOnInsert: rest }, { upsert: true }).then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoChronicleStore(db);
  }

  async knownLogIds(logIds: readonly string[]): Promise<Set<string>> {
    if (logIds.length === 0) return new Set();
    return new Set(await this.#db.existing(logIds));
  }

  async record(kill: StoredKill): Promise<void> {
    await this.#db.upsert(kill);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
