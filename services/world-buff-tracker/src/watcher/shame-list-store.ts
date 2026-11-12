import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import type { CharacterDetails } from "./character.js";

/**
 * Remembers every player who has killed a bot listener, and who they are once a /who has said.
 *
 * Learned one death at a time, so nothing could rebuild it: it has to survive a redeploy. Kept apart
 * from the wall's message id on purpose — one is who the bot will no longer deal with, the other is
 * which Discord message happens to show them, and losing either must not take the other with it.
 */

export interface ShamedPlayer {
  readonly name: string;
  /** The character's GUID in decimal — what spots them standing nearby, where only GUIDs travel.
   *  Null for a player listed before GUIDs were kept. */
  readonly guid: string | null;
  /** Race and class from a /who, or null until the player has been seen online since the kill. */
  readonly details: CharacterDetails | null;
}

export interface ShameListStore {
  /** The players, in the order they first killed a listener; empty on a fresh install. */
  load(): Promise<readonly ShamedPlayer[]>;
  save(players: readonly ShamedPlayer[]): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback. Forgets everyone on restart. */
export class InMemoryShameListStore implements ShameListStore {
  #players: readonly ShamedPlayer[];

  constructor(initial: readonly ShamedPlayer[] = []) {
    this.#players = initial;
  }

  async load(): Promise<readonly ShamedPlayer[]> {
    return this.#players;
  }

  async save(players: readonly ShamedPlayer[]): Promise<void> {
    this.#players = players;
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

/** A player as stored — fields added over time may be missing from an older document. */
interface StoredPlayer {
  readonly name: string;
  readonly guid?: string | null;
  readonly details?: CharacterDetails | null;
}

interface ShameListDoc {
  readonly _id: string;
  readonly players?: StoredPlayer[];
  /** The first release kept names alone; read so its list is not lost. */
  readonly names?: string[];
}

/** The players a stored document holds, whichever release wrote it. */
export function playersOf(doc: Omit<ShameListDoc, "_id"> | null): readonly ShamedPlayer[] {
  if (!doc) return [];
  const stored = doc.players ?? doc.names?.map((name): StoredPlayer => ({ name })) ?? [];
  return stored.map((player) => ({ name: player.name, guid: player.guid ?? null, details: player.details ?? null }));
}

/** Narrow port over the Mongo collection, so the store's logic is unit-tested with a fake. */
export interface ShameListDb {
  get(): Promise<readonly ShamedPlayer[]>;
  set(players: readonly ShamedPlayer[]): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "wallOfShame";
const DOC_ID = "players";

export class MongoShameListStore implements ShameListStore {
  readonly #db: ShameListDb;

  constructor(db: ShameListDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoShameListStore> {
    const collection = database.collection<ShameListDoc>(COLLECTION);
    const db: ShameListDb = {
      get: () => collection.findOne({ _id: DOC_ID }).then(playersOf),
      set: (players) =>
        collection
          .updateOne(
            { _id: DOC_ID },
            { $set: { players: [...players] }, $unset: { names: "" } },
            { upsert: true },
          )
          .then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoShameListStore(db);
  }

  async load(): Promise<readonly ShamedPlayer[]> {
    return this.#db.get();
  }

  async save(players: readonly ShamedPlayer[]): Promise<void> {
    await this.#db.set(players);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
