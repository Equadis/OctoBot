import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";

/**
 * Persists every /who observation so detection can be REPLAYED on real history —
 * the way to tune the temporal windows and derive statistics offline without
 * waiting on live raids. One document per poll, auto-expired by a TTL index so it
 * never grows without bound. Writes are best-effort: a DB hiccup must never break
 * the poll loop, so the caller fires them and swallows errors.
 */

export interface PollSnapshot {
  readonly ts: Date;
  readonly present: number;
  readonly complete: boolean;
  readonly names: readonly string[];
}

export interface SnapshotStore {
  record(snapshot: PollSnapshot): Promise<void>;
  /** The most recent `limit` snapshots in chronological (ascending) order, for replay. */
  recent(limit: number): Promise<PollSnapshot[]>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemorySnapshotStore implements SnapshotStore {
  readonly #all: PollSnapshot[] = [];

  async record(snapshot: PollSnapshot): Promise<void> {
    this.#all.push(snapshot);
  }
  async recent(limit: number): Promise<PollSnapshot[]> {
    return this.#all.slice(Math.max(0, this.#all.length - limit));
  }
  async close(): Promise<void> {
    // nothing to release
  }
}

interface SnapshotDoc {
  readonly ts: Date;
  readonly present: number;
  readonly complete: boolean;
  readonly names: string[];
}

/** Narrow port over a Mongo collection, so the store's logic is unit-tested with a fake. */
export interface SnapshotDb {
  insert(doc: SnapshotDoc): Promise<void>;
  latest(limit: number): Promise<SnapshotDoc[]>; // descending by ts
  close(): Promise<void>;
}

const COLLECTION = "snapshots";
const DEFAULT_TTL_DAYS = 30;

export class MongoSnapshotStore implements SnapshotStore {
  readonly #db: SnapshotDb;

  constructor(db: SnapshotDb) {
    this.#db = db;
  }

  /** `collectionName` keeps another lair's polls apart — Blackwing Lair's, say. */
  static async open(
    database: Db,
    ttlDays: number = DEFAULT_TTL_DAYS,
    collectionName: string = COLLECTION,
  ): Promise<MongoSnapshotStore> {
    const collection = database.collection<SnapshotDoc>(collectionName);
    await collection.createIndex({ ts: 1 }, { expireAfterSeconds: ttlDays * 86_400 });
    const db: SnapshotDb = {
      insert: (doc) => collection.insertOne(doc).then(() => undefined),
      latest: (limit) => collection.find().sort({ ts: -1 }).limit(limit).toArray(),
      close: releaseSharedClient,
    };
    return new MongoSnapshotStore(db);
  }

  async record(snapshot: PollSnapshot): Promise<void> {
    await this.#db.insert({
      ts: snapshot.ts,
      present: snapshot.present,
      complete: snapshot.complete,
      names: [...snapshot.names],
    });
  }

  async recent(limit: number): Promise<PollSnapshot[]> {
    const docs = await this.#db.latest(limit);
    return docs
      .reverse()
      .map((doc) => ({ ts: doc.ts, present: doc.present, complete: doc.complete, names: doc.names }));
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
