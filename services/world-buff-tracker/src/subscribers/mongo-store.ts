import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import {
  DEFAULT_FACTIONS,
  type Faction,
  type FactionSource,
  type Subscriber,
  type SubscriberStore,
  type SubscriberUpdate,
  subscriberKey,
} from "./store.js";

/** One subscriber document; `_id` is the canonical lowercased name (free uniqueness).
 *  Older docs may still carry `discordId`/`delivery`/`alerts` fields; they're ignored. */
export interface SubscriberDoc {
  readonly _id: string;
  readonly name: string;
  /** Optional: docs predating faction prefs have none, and default to both. */
  readonly factions?: readonly Faction[];
  /** Optional: docs predating source tracking have none, and read as "default" (resolvable). */
  readonly factionSource?: FactionSource;
  readonly subscribedAt: Date;
}

export interface UpsertOutcome {
  readonly upsertedCount: number;
}
export interface DeleteOutcome {
  readonly deletedCount: number;
}
export interface UpdateOutcome {
  readonly matchedCount: number;
}

/**
 * The narrow slice of a Mongo collection the store needs. `connect()` adapts a real
 * driver Collection to it; tests inject a fake, so the store's logic is covered
 * without a live database.
 */
export interface SubscriberDb {
  upsertNew(doc: SubscriberDoc): Promise<UpsertOutcome>;
  deleteByKey(key: string): Promise<DeleteOutcome>;
  countByKey(key: string): Promise<number>;
  getByKey(key: string): Promise<SubscriberDoc | null>;
  setFields(key: string, fields: Partial<Pick<SubscriberDoc, "factions" | "factionSource">>): Promise<UpdateOutcome>;
  list(): Promise<SubscriberDoc[]>;
  close(): Promise<void>;
}

const COLLECTION = "subscribers";

function toSubscriber(doc: SubscriberDoc): Subscriber {
  // Missing OR empty factions default to both — an empty array is a data fault that would
  // otherwise silently drop the subscriber from every faction-filtered alert.
  const factions = doc.factions && doc.factions.length > 0 ? [...doc.factions] : [...DEFAULT_FACTIONS];
  return {
    name: doc.name,
    factions,
    factionSource: doc.factionSource ?? "default",
    subscribedAt: doc.subscribedAt,
  };
}

/** Subscriber store backed by MongoDB, via the {@link SubscriberDb} port. */
export class MongoSubscriberStore implements SubscriberStore {
  readonly #db: SubscriberDb;

  constructor(db: SubscriberDb) {
    this.#db = db;
  }

  /** Connect to Mongo and return a ready store. Caller must `close()` it. */
  static async open(database: Db): Promise<MongoSubscriberStore> {
    const collection = database.collection<SubscriberDoc>(COLLECTION);
    const db: SubscriberDb = {
      upsertNew: ({ _id, ...rest }) =>
        collection.updateOne({ _id }, { $setOnInsert: rest }, { upsert: true }),
      deleteByKey: (key) => collection.deleteOne({ _id: key }),
      countByKey: (key) => collection.countDocuments({ _id: key }, { limit: 1 }),
      getByKey: (key) => collection.findOne({ _id: key }),
      setFields: (key, fields) => collection.updateOne({ _id: key }, { $set: fields }),
      list: () => collection.find().toArray(),
      close: releaseSharedClient,
    };
    return new MongoSubscriberStore(db);
  }

  async add(name: string): Promise<boolean> {
    const key = subscriberKey(name);
    if (!key) return false;
    const result = await this.#db.upsertNew({
      _id: key,
      name: name.trim(),
      factions: [...DEFAULT_FACTIONS],
      factionSource: "default", // not resolved yet — subscribe or a listener contact will
      subscribedAt: new Date(),
    });
    return result.upsertedCount === 1;
  }

  async remove(name: string): Promise<boolean> {
    const key = subscriberKey(name);
    if (!key) return false;
    return (await this.#db.deleteByKey(key)).deletedCount === 1;
  }

  async has(name: string): Promise<boolean> {
    const key = subscriberKey(name);
    if (!key) return false;
    return (await this.#db.countByKey(key)) > 0;
  }

  async get(name: string): Promise<Subscriber | null> {
    const key = subscriberKey(name);
    if (!key) return null;
    const doc = await this.#db.getByKey(key);
    return doc ? toSubscriber(doc) : null;
  }

  async update(name: string, changes: SubscriberUpdate): Promise<boolean> {
    const key = subscriberKey(name);
    if (!key) return false;
    const fields: { factions?: readonly Faction[]; factionSource?: FactionSource } = {};
    if (changes.factions !== undefined) fields.factions = changes.factions;
    if (changes.factionSource !== undefined) fields.factionSource = changes.factionSource;
    if (Object.keys(fields).length === 0) return this.has(name);
    return (await this.#db.setFields(key, fields)).matchedCount === 1;
  }

  async all(): Promise<Subscriber[]> {
    return (await this.#db.list()).map(toSubscriber);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
