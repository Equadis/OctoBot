import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";

/**
 * Remembers which Discord message the wall of shame owns.
 *
 * One string, but it has to survive a redeploy: without it every restart would post and pin a
 * second wall and orphan the first. The players it lists are kept separately (see
 * shame-list-store.ts) — they are what the bot knows, this is only where it shows them.
 */

export interface WallOfShameState {
  /** The pinned message the wall edits in place, or null before it has ever been posted. */
  readonly messageId: string | null;
}

export interface WallOfShameStore {
  load(): Promise<WallOfShameState | null>;
  save(state: WallOfShameState): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback. Resets on restart, so the wall reposts once. */
export class InMemoryWallOfShameStore implements WallOfShameStore {
  #state: WallOfShameState | null;

  constructor(initial: WallOfShameState | null = null) {
    this.#state = initial;
  }

  async load(): Promise<WallOfShameState | null> {
    return this.#state;
  }

  async save(state: WallOfShameState): Promise<void> {
    this.#state = state;
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface WallDoc {
  readonly _id: string;
  readonly messageId: string | null;
}

/** Narrow port over the Mongo collection, so the store's logic is unit-tested with a fake. */
export interface WallOfShameDb {
  get(): Promise<WallOfShameState | null>;
  set(state: WallOfShameState): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "wallOfShame";
const DOC_ID = "wall";

export class MongoWallOfShameStore implements WallOfShameStore {
  readonly #db: WallOfShameDb;

  constructor(db: WallOfShameDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoWallOfShameStore> {
    const collection = database.collection<WallDoc>(COLLECTION);
    const db: WallOfShameDb = {
      get: () =>
        collection.findOne({ _id: DOC_ID }).then((doc) => (doc ? { messageId: doc.messageId } : null)),
      set: (state) =>
        collection
          .updateOne({ _id: DOC_ID }, { $set: { messageId: state.messageId } }, { upsert: true })
          .then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoWallOfShameStore(db);
  }

  async load(): Promise<WallOfShameState | null> {
    return this.#db.get();
  }

  async save(state: WallOfShameState): Promise<void> {
    await this.#db.set(state);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
