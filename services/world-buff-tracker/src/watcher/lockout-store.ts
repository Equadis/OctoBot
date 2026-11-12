import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";

/**
 * Persists the per-lane raid LOCKOUT ledger (player name -> epoch ms when last locked to a raid), so
 * the Onyxia lockout survives a restart. Pushing code redeploys the bot, which would otherwise clear
 * the in-memory locks — and a raid that cleared just before the deploy could then have its lingering
 * members re-form a phantom duplicate. With this, the locks are reloaded on boot and the rule holds
 * across deploys. One small doc per lane, saved each poll (the ledger is pruned to the lockout window,
 * so it stays bounded) and reloaded on startup.
 */
export interface LockoutStore {
  /** The persisted lockout ledger for a lane (name -> locked-at ms), or null if none. */
  load(lane: string): Promise<Record<string, number> | null>;
  /** Persist a lane's lockout ledger (already pruned to the window by the tracker). */
  save(lane: string, entries: Record<string, number>): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback (no cross-restart persistence, which is the whole point). */
export class InMemoryLockoutStore implements LockoutStore {
  readonly #byLane = new Map<string, Record<string, number>>();

  async load(lane: string): Promise<Record<string, number> | null> {
    return this.#byLane.get(lane) ?? null;
  }

  async save(lane: string, entries: Record<string, number>): Promise<void> {
    this.#byLane.set(lane, entries);
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface LockoutDoc {
  readonly _id: string;
  readonly entries: Record<string, number>;
}

/** Narrow port over the Mongo collection, so the store's logic is unit-tested with a fake. */
export interface LockoutDb {
  get(lane: string): Promise<Record<string, number> | null>;
  set(lane: string, entries: Record<string, number>): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "lockouts";

export class MongoLockoutStore implements LockoutStore {
  readonly #db: LockoutDb;

  constructor(db: LockoutDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoLockoutStore> {
    const collection = database.collection<LockoutDoc>(COLLECTION);
    const db: LockoutDb = {
      get: (lane) => collection.findOne({ _id: lane }).then((doc) => doc?.entries ?? null),
      set: (lane, entries) =>
        collection.updateOne({ _id: lane }, { $set: { entries } }, { upsert: true }).then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoLockoutStore(db);
  }

  async load(lane: string): Promise<Record<string, number> | null> {
    return this.#db.get(lane);
  }

  async save(lane: string, entries: Record<string, number>): Promise<void> {
    await this.#db.set(lane, entries);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
