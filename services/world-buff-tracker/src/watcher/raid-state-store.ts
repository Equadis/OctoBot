import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import type { ClearTrackerState } from "./clear-tracker.js";

/**
 * Persists the raid in progress per detection lane, so a restart RESUMES the same raid
 * instead of losing it. Without this, redeploying mid-raid orphans the run: the fresh
 * process sees whatever /who shows now, never the raid it was tracking, so the exit fires
 * no "cleared" alert and no recap. With it, the raid keeps its number, form time and roster
 * across the restart and its clear is still detected.
 *
 * One tiny doc per lane, saved each poll (small) and cleared when the raid ends.
 */
export interface RaidStateStore {
  /** The persisted raid for a lane, or null if none. */
  load(lane: string): Promise<ClearTrackerState | null>;
  /** Persist a lane's raid, or clear it (null). */
  save(lane: string, state: ClearTrackerState | null): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback (no cross-restart resume, which is the whole point,
 *  so this is only for when Mongo isn't configured). */
export class InMemoryRaidStateStore implements RaidStateStore {
  readonly #byLane = new Map<string, ClearTrackerState>();

  async load(lane: string): Promise<ClearTrackerState | null> {
    return this.#byLane.get(lane) ?? null;
  }

  async save(lane: string, state: ClearTrackerState | null): Promise<void> {
    if (state) this.#byLane.set(lane, state);
    else this.#byLane.delete(lane);
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface RaidStateDoc {
  readonly _id: string;
  readonly state: ClearTrackerState;
}

/** Narrow port over the Mongo collection, so the store's logic is unit-tested with a fake. */
export interface RaidStateDb {
  get(lane: string): Promise<ClearTrackerState | null>;
  set(lane: string, state: ClearTrackerState): Promise<void>;
  remove(lane: string): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "raidstate";

export class MongoRaidStateStore implements RaidStateStore {
  readonly #db: RaidStateDb;

  constructor(db: RaidStateDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoRaidStateStore> {
    const collection = database.collection<RaidStateDoc>(COLLECTION);
    const db: RaidStateDb = {
      get: (lane) => collection.findOne({ _id: lane }).then((doc) => doc?.state ?? null),
      set: (lane, state) =>
        collection.updateOne({ _id: lane }, { $set: { state } }, { upsert: true }).then(() => undefined),
      remove: (lane) => collection.deleteOne({ _id: lane }).then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoRaidStateStore(db);
  }

  async load(lane: string): Promise<ClearTrackerState | null> {
    return this.#db.get(lane);
  }

  async save(lane: string, state: ClearTrackerState | null): Promise<void> {
    if (state) await this.#db.set(lane, state);
    else await this.#db.remove(lane);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
