import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import { subscriberKey } from "../subscribers/store.js";

/**
 * Remembers which players Bufftracker has already introduced itself to, so the
 * self-introduction whisper (identity, guild + community attribution, recruiting) fires
 * ONCE per player — the first time they reach a listener — rather than on every message.
 * A chatty bot is a reported bot, and a two-line intro repeated each whisper is chatty.
 *
 * Keyed by the same case-insensitive character key as the subscriber store, so "Raider"
 * and "RAIDER" are one person. `introduceOnce` is atomic (an upsert on Mongo) so two
 * whispers arriving together can't both read "not introduced" and double-send. Entries
 * expire after `ttlDays`, so a player who returns months later is greeted again — harmless,
 * and it keeps the collection bounded.
 */
export interface IntroStore {
  /** Record that we've introduced ourselves to `name`. Returns true if this was the FIRST
   *  time (the caller should send the intro), false if we already had. */
  introduceOnce(name: string): Promise<boolean>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryIntroStore implements IntroStore {
  readonly #seen = new Set<string>();

  async introduceOnce(name: string): Promise<boolean> {
    const key = subscriberKey(name);
    if (this.#seen.has(key)) return false;
    this.#seen.add(key);
    return true;
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface IntroDoc {
  readonly name: string; // canonical case-insensitive key
  readonly at: Date;
}

/** Narrow port over a Mongo collection, so the store's logic is unit-tested with a fake. */
export interface IntroDb {
  /** Insert the key if absent. Returns true if a NEW row was created (a first intro). */
  markIfNew(key: string, at: Date): Promise<boolean>;
  close(): Promise<void>;
}

const COLLECTION = "introductions";
const DEFAULT_TTL_DAYS = 90;

export class MongoIntroStore implements IntroStore {
  readonly #db: IntroDb;

  constructor(db: IntroDb) {
    this.#db = db;
  }

  static async open(
    database: Db,
    ttlDays: number = DEFAULT_TTL_DAYS,
  ): Promise<MongoIntroStore> {
    const collection = database.collection<IntroDoc>(COLLECTION);
    await collection.createIndex({ name: 1 }, { unique: true });
    await collection.createIndex({ at: 1 }, { expireAfterSeconds: ttlDays * 86_400 });
    const db: IntroDb = {
      markIfNew: async (key, at) => {
        const res = await collection.updateOne(
          { name: key },
          { $setOnInsert: { name: key, at } },
          { upsert: true },
        );
        return res.upsertedCount === 1;
      },
      close: releaseSharedClient,
    };
    return new MongoIntroStore(db);
  }

  async introduceOnce(name: string): Promise<boolean> {
    return this.#db.markIfNew(subscriberKey(name), new Date());
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
