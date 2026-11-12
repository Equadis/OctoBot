import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import type { WorldPoint } from "../protocol/update-object.js";
import type { Anchor } from "./listener-anchor.js";

/**
 * Persists each listener's parked anchor (its reference doodads) and one marker: whether login was
 * enabled on the previous run. The marker is how "re-capture the anchor" is gated — a normal
 * reconnect keeps the stored anchor, but the first run after WOW_LOGIN_ENABLED went false→true (a
 * deliberate re-park) re-captures. No TTL: the anchor is the reference and must not expire.
 */
export interface AnchorStore {
  loadAnchor(listener: string): Promise<Anchor | null>;
  saveAnchor(listener: string, anchor: Anchor): Promise<void>;
  /** Login-enabled state recorded on the previous run, or null if never recorded. */
  wasEnabled(): Promise<boolean | null>;
  setEnabled(enabled: boolean): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryAnchorStore implements AnchorStore {
  readonly #anchors = new Map<string, Anchor>();
  #enabled: boolean | null = null;

  async loadAnchor(listener: string): Promise<Anchor | null> {
    return this.#anchors.get(listener) ?? null;
  }
  async saveAnchor(listener: string, anchor: Anchor): Promise<void> {
    this.#anchors.set(listener, anchor);
  }
  async wasEnabled(): Promise<boolean | null> {
    return this.#enabled;
  }
  async setEnabled(enabled: boolean): Promise<void> {
    this.#enabled = enabled;
  }
  async close(): Promise<void> {
    // nothing to release
  }
}

/** One document in the collection — either a listener's anchor (keyed by name) or the login flag. */
export interface AnchorDoc {
  readonly _id: string;
  readonly parked?: WorldPoint;
  readonly doodads?: WorldPoint[];
  readonly enabled?: boolean;
}

/** Narrow port over the Mongo collection, so the store's logic is unit-tested with a fake. */
export interface AnchorDb {
  get(id: string): Promise<AnchorDoc | null>;
  put(id: string, fields: Omit<AnchorDoc, "_id">): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "listeneranchors";
const LOGIN_ID = "__login__";

export class MongoAnchorStore implements AnchorStore {
  readonly #db: AnchorDb;

  constructor(db: AnchorDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoAnchorStore> {
    const collection = database.collection<AnchorDoc>(COLLECTION);
    const db: AnchorDb = {
      get: (id) => collection.findOne({ _id: id }),
      put: (id, fields) => collection.updateOne({ _id: id }, { $set: fields }, { upsert: true }).then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoAnchorStore(db);
  }

  async loadAnchor(listener: string): Promise<Anchor | null> {
    const doc = await this.#db.get(listener);
    if (!doc?.parked || !doc.doodads) return null;
    return { parked: doc.parked, doodads: doc.doodads };
  }

  async saveAnchor(listener: string, anchor: Anchor): Promise<void> {
    await this.#db.put(listener, { parked: anchor.parked, doodads: [...anchor.doodads] });
  }

  async wasEnabled(): Promise<boolean | null> {
    return (await this.#db.get(LOGIN_ID))?.enabled ?? null;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await this.#db.put(LOGIN_ID, { enabled });
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
