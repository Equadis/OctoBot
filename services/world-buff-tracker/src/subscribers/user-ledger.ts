import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import { subscriberKey } from "./store.js";

/**
 * An append-only ledger of distinct player names for a lifetime statistic — used for BOTH
 * "distinct players who have ever subscribed" (collection `users`) and "distinct players ever
 * guild-invited" (collection `invites`), one instance per collection. The point is a total that
 * can't shrink: the subscriber store removes an active subscriber on unsubscribe (so alerts never
 * reach them), and a guild invite is a one-shot event — neither leaves a running count, so this
 * keeps the name. Kept SEPARATE from the active stores on purpose: those decide who gets alerts,
 * and a lifetime metric must never leak an inactive person back into them.
 *
 * Keyed by the same case-insensitive character key as the subscriber store, so one person counts
 * once whatever the casing. Idempotent (a unique index), and — unlike the intro store — it never
 * expires: a lifetime total is forever.
 */
export interface UserLedger {
  /** Record that `name` has been a subscriber at some point. Idempotent. */
  record(name: string): Promise<void>;
  /** How many distinct people have ever subscribed. */
  count(): Promise<number>;
  close(): Promise<void>;
}

/** In-memory ledger — local/test fallback and the shape the Mongo ledger mirrors. */
export class InMemoryUserLedger implements UserLedger {
  readonly #names = new Set<string>();

  async record(name: string): Promise<void> {
    this.#names.add(subscriberKey(name));
  }
  async count(): Promise<number> {
    return this.#names.size;
  }
  async close(): Promise<void> {
    // nothing to release
  }
}

interface UserDoc {
  readonly name: string; // canonical case-insensitive key
  readonly firstSeen: Date;
}

/** Narrow port over a Mongo collection, so the ledger's logic is unit-tested with a fake. */
export interface UserDb {
  /** Insert the key if absent (keeps the earliest firstSeen). Idempotent. */
  upsert(key: string, firstSeen: Date): Promise<void>;
  count(): Promise<number>;
  close(): Promise<void>;
}

const COLLECTION = "users";

export class MongoUserLedger implements UserLedger {
  readonly #db: UserDb;

  constructor(db: UserDb) {
    this.#db = db;
  }

  static async open(
    database: Db,
    collectionName: string = COLLECTION,
  ): Promise<MongoUserLedger> {
    const collection = database.collection<UserDoc>(collectionName);
    await collection.createIndex({ name: 1 }, { unique: true });
    const db: UserDb = {
      upsert: (key, firstSeen) =>
        collection
          .updateOne({ name: key }, { $setOnInsert: { name: key, firstSeen } }, { upsert: true })
          .then(() => undefined),
      count: () => collection.countDocuments(),
      close: releaseSharedClient,
    };
    return new MongoUserLedger(db);
  }

  async record(name: string): Promise<void> {
    await this.#db.upsert(subscriberKey(name), new Date());
  }

  async count(): Promise<number> {
    return this.#db.count();
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
