import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";

/**
 * Player-submitted feedback/suggestions (the "feedback" whisper command). Kept so the
 * author can review it later — Discord messages scroll away, a collection doesn't. Tiny
 * and append-only; a TTL index bounds the history so it can't grow without limit.
 */

export interface FeedbackEntry {
  /** The character who sent it. */
  readonly from: string;
  /** What they said (a single whisper, so already length-bounded by the client). */
  readonly text: string;
  readonly at: Date;
}

export interface FeedbackStore {
  record(entry: FeedbackEntry): Promise<void>;
  /** The most recent entries, newest first — for review. */
  recent(limit: number): Promise<FeedbackEntry[]>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryFeedbackStore implements FeedbackStore {
  readonly #entries: FeedbackEntry[] = [];

  async record(entry: FeedbackEntry): Promise<void> {
    this.#entries.push(entry);
  }

  async recent(limit: number): Promise<FeedbackEntry[]> {
    return this.#entries.slice(Math.max(0, this.#entries.length - limit)).reverse();
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface FeedbackDoc {
  readonly from: string;
  readonly text: string;
  readonly at: Date;
}

/** Narrow port over a Mongo collection, so the store's logic is unit-tested with a fake. */
export interface FeedbackDb {
  insert(doc: FeedbackDoc): Promise<void>;
  /** Most recent entries, descending by `at`. */
  latest(limit: number): Promise<FeedbackDoc[]>;
  close(): Promise<void>;
}

const COLLECTION = "feedback";
const DEFAULT_TTL_DAYS = 365;

export class MongoFeedbackStore implements FeedbackStore {
  readonly #db: FeedbackDb;

  constructor(db: FeedbackDb) {
    this.#db = db;
  }

  static async open(
    database: Db,
    ttlDays: number = DEFAULT_TTL_DAYS,
  ): Promise<MongoFeedbackStore> {
    const collection = database.collection<FeedbackDoc>(COLLECTION);
    await collection.createIndex({ at: -1 }, { expireAfterSeconds: ttlDays * 86_400 });
    const db: FeedbackDb = {
      insert: (doc) => collection.insertOne(doc).then(() => undefined),
      latest: (limit) => collection.find({}).sort({ at: -1 }).limit(limit).toArray(),
      close: releaseSharedClient,
    };
    return new MongoFeedbackStore(db);
  }

  async record(entry: FeedbackEntry): Promise<void> {
    await this.#db.insert({ from: entry.from, text: entry.text, at: entry.at });
  }

  async recent(limit: number): Promise<FeedbackEntry[]> {
    const docs = await this.#db.latest(limit);
    return docs.map((doc) => ({ from: doc.from, text: doc.text, at: doc.at }));
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
