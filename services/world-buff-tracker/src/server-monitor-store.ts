import type { Db } from "mongodb";
import { releaseSharedClient } from "./mongo-connection.js";
import type { ServerMonitorState } from "./server-monitor.js";

/**
 * Persists the realm-outage state (`ServerMonitor.snapshot()`) so it survives a restart. Without it,
 * every redeploy during an ongoing outage spun up a fresh monitor that re-announced "server down" to
 * the community channel — and a flappy realm plus frequent deploys bombarded it. Loaded once on boot
 * and saved on each announce/recover transition — one tiny document.
 */
export interface ServerMonitorStore {
  /** The last persisted state, or null if none has ever been saved (a fresh install). */
  load(): Promise<ServerMonitorState | null>;
  /** Persist the latest state. */
  save(state: ServerMonitorState): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback (resets on restart, so no cross-deploy persistence). */
export class InMemoryServerMonitorStore implements ServerMonitorStore {
  #state: ServerMonitorState | null;

  constructor(initial: ServerMonitorState | null = null) {
    this.#state = initial;
  }

  async load(): Promise<ServerMonitorState | null> {
    return this.#state;
  }

  async save(state: ServerMonitorState): Promise<void> {
    this.#state = state;
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface MonitorDoc {
  readonly _id: string;
  readonly announced: boolean;
  readonly downSince: number | null;
}

/** Narrow port over the Mongo collection, so the store's logic is unit-tested with a fake. */
export interface ServerMonitorDb {
  get(): Promise<ServerMonitorState | null>;
  set(state: ServerMonitorState): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "monitors";
const DOC_ID = "realm";

export class MongoServerMonitorStore implements ServerMonitorStore {
  readonly #db: ServerMonitorDb;

  constructor(db: ServerMonitorDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoServerMonitorStore> {
    const collection = database.collection<MonitorDoc>(COLLECTION);
    const db: ServerMonitorDb = {
      get: () =>
        collection
          .findOne({ _id: DOC_ID })
          .then((doc) => (doc ? { announced: doc.announced, downSince: doc.downSince } : null)),
      set: (state) =>
        collection
          .updateOne({ _id: DOC_ID }, { $set: { announced: state.announced, downSince: state.downSince } }, { upsert: true })
          .then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoServerMonitorStore(db);
  }

  async load(): Promise<ServerMonitorState | null> {
    return this.#db.get();
  }

  async save(state: ServerMonitorState): Promise<void> {
    await this.#db.set(state);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
