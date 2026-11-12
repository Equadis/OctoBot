import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import { subscriberKey } from "./store.js";

/**
 * The players CURRENTLY in the guild who joined via the bot's invite — the guild-side equivalent
 * of the active subscriber count. A name is added when they accept an invite we sent (the welcome
 * flow already confirms "we invited them"), and removed when they leave or are removed from the
 * guild (SMSG_GUILD_EVENT Left/Removed). Distinct from the lifetime `invites` ledger, which only
 * ever grows: this rises and falls with real membership. Keyed by the same case-insensitive
 * character key as the subscriber store.
 */
export interface GuildieStore {
  /** Record a player who joined via our invite. True if newly added. */
  add(name: string): Promise<boolean>;
  /** Remove a player who left / was removed from the guild. True if one was removed. */
  remove(name: string): Promise<boolean>;
  /** How many bot-invited players are in the guild right now. */
  count(): Promise<number>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryGuildieStore implements GuildieStore {
  readonly #names = new Set<string>();

  async add(name: string): Promise<boolean> {
    const key = subscriberKey(name);
    if (!key || this.#names.has(key)) return false;
    this.#names.add(key);
    return true;
  }
  async remove(name: string): Promise<boolean> {
    return this.#names.delete(subscriberKey(name));
  }
  async count(): Promise<number> {
    return this.#names.size;
  }
  async close(): Promise<void> {
    // nothing to release
  }
}

interface GuildieDoc {
  readonly name: string; // canonical case-insensitive key
  readonly joinedAt: Date;
}

/** Narrow port over a Mongo collection, so the store's logic is unit-tested with a fake. */
export interface GuildieDb {
  /** Insert the key if absent. Returns true if a NEW row was created. */
  addKey(key: string, joinedAt: Date): Promise<boolean>;
  /** Delete the key. Returns true if a row was removed. */
  removeKey(key: string): Promise<boolean>;
  count(): Promise<number>;
  close(): Promise<void>;
}

const COLLECTION = "guildies";

export class MongoGuildieStore implements GuildieStore {
  readonly #db: GuildieDb;

  constructor(db: GuildieDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoGuildieStore> {
    const collection = database.collection<GuildieDoc>(COLLECTION);
    await collection.createIndex({ name: 1 }, { unique: true });
    const db: GuildieDb = {
      addKey: async (key, joinedAt) => {
        const res = await collection.updateOne(
          { name: key },
          { $setOnInsert: { name: key, joinedAt } },
          { upsert: true },
        );
        return res.upsertedCount === 1;
      },
      removeKey: async (key) => (await collection.deleteOne({ name: key })).deletedCount === 1,
      count: () => collection.countDocuments(),
      close: releaseSharedClient,
    };
    return new MongoGuildieStore(db);
  }

  async add(name: string): Promise<boolean> {
    const key = subscriberKey(name);
    if (!key) return false;
    return this.#db.addKey(key, new Date());
  }
  async remove(name: string): Promise<boolean> {
    const key = subscriberKey(name);
    if (!key) return false;
    return this.#db.removeKey(key);
  }
  async count(): Promise<number> {
    return this.#db.count();
  }
  async close(): Promise<void> {
    await this.#db.close();
  }
}
