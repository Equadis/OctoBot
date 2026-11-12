import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import { isRaidZoneId, type RaidZoneId } from "./raid-zone.js";

/**
 * Records when the Rallying Cry of the Dragonslayer buff dropped, PER FACTION (a
 * listener heard the turn-in yell). We track DROPS, not the buff on players — the
 * only thing the rest of the bot needs is the last drop time, which the broadcast
 * ledger uses as the per-cycle dedup boundary (a fresh drop reopens the alerts).
 *
 * There is deliberately NO buff-duration / cooldown model here: on this server a fresh
 * Rallying Cry can drop whenever a raid clears (measured — re-drops as close as ~53m
 * apart), so the retail "a hanging head banks the next turn-in for 2h" assumption does
 * not hold and is not encoded. Every drop is kept (they are sparse — a few per day) for
 * monitoring and to measure the real interval between drops. A TTL index bounds history.
 */

export type Faction = "alliance" | "horde";
export const FACTIONS: readonly Faction[] = ["alliance", "horde"] as const;

export interface BuffDrop {
  readonly faction: Faction;
  /** When the buff was applied (the yell fired). */
  readonly appliedAt: Date;
  /** Whose head was turned in for a Rallying Cry: Onyxia's ("onyxia") or Nefarian's ("bwl") — the
   *  same buff either way. Absent on a drop recorded before the two heads were told apart; read it
   *  with {@link headOf}. */
  readonly head?: RaidZoneId;
}

/** Whose head a Rallying Cry drop came from. A drop with no head recorded predates Nefarian tracking,
 *  when every drop the bot announced was Onyxia's. */
export function headOf(drop: BuffDrop): RaidZoneId {
  return drop.head ?? "onyxia";
}

export interface BuffStore {
  /** Record a buff drop (a heard yell). */
  record(drop: BuffDrop): Promise<void>;
  /** The latest drop for a faction, or null if none was ever seen. */
  current(faction: Faction): Promise<BuffDrop | null>;
  /** The last `limit` drops for a faction, chronological (ascending) — for measuring the real interval. */
  history(faction: Faction, limit: number): Promise<BuffDrop[]>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback and the shape the Mongo store mirrors. */
export class InMemoryBuffStore implements BuffStore {
  readonly #drops: BuffDrop[] = [];

  async record(drop: BuffDrop): Promise<void> {
    this.#drops.push(drop);
  }

  async current(faction: Faction): Promise<BuffDrop | null> {
    let latest: BuffDrop | null = null;
    for (const drop of this.#drops) {
      if (drop.faction !== faction) continue;
      if (!latest || drop.appliedAt.getTime() > latest.appliedAt.getTime()) latest = drop;
    }
    return latest;
  }

  async history(faction: Faction, limit: number): Promise<BuffDrop[]> {
    const forFaction = this.#drops
      .filter((drop) => drop.faction === faction)
      .sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());
    return forFaction.slice(Math.max(0, forFaction.length - limit));
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface BuffDoc {
  readonly faction: Faction;
  readonly appliedAt: Date;
  readonly head?: string;
}

/** A stored drop back as a domain drop; an unrecognised head string is dropped rather than trusted. */
function toDrop(doc: BuffDoc): BuffDrop {
  const base = { faction: doc.faction, appliedAt: doc.appliedAt };
  return isRaidZoneId(doc.head) ? { ...base, head: doc.head } : base;
}

/** Narrow port over a Mongo collection, so the store's logic is unit-tested with a fake. */
export interface BuffDb {
  insert(doc: BuffDoc): Promise<void>;
  /** Most recent drops for a faction, descending by appliedAt. */
  latest(faction: Faction, limit: number): Promise<BuffDoc[]>;
  close(): Promise<void>;
}

const COLLECTION = "buffdrops";
const DEFAULT_TTL_DAYS = 90;

export class MongoBuffStore implements BuffStore {
  readonly #db: BuffDb;

  constructor(db: BuffDb) {
    this.#db = db;
  }

  static async open(database: Db, ttlDays: number = DEFAULT_TTL_DAYS): Promise<MongoBuffStore> {
    const collection = database.collection<BuffDoc>(COLLECTION);
    await collection.createIndex({ appliedAt: 1 }, { expireAfterSeconds: ttlDays * 86_400 });
    await collection.createIndex({ faction: 1, appliedAt: -1 });
    const db: BuffDb = {
      insert: (doc) => collection.insertOne(doc).then(() => undefined),
      latest: (faction, limit) =>
        collection.find({ faction }).sort({ appliedAt: -1 }).limit(limit).toArray(),
      close: releaseSharedClient,
    };
    return new MongoBuffStore(db);
  }

  async record(drop: BuffDrop): Promise<void> {
    const doc: BuffDoc = { faction: drop.faction, appliedAt: drop.appliedAt };
    await this.#db.insert(drop.head ? { ...doc, head: drop.head } : doc);
  }

  async current(faction: Faction): Promise<BuffDrop | null> {
    const [latest] = await this.#db.latest(faction, 1);
    return latest ? toDrop(latest) : null;
  }

  async history(faction: Faction, limit: number): Promise<BuffDrop[]> {
    const docs = await this.#db.latest(faction, limit);
    return docs.reverse().map(toDrop);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
