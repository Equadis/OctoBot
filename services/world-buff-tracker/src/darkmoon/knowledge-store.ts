import type { Db } from "mongodb";
import { releaseSharedClient } from "../mongo-connection.js";
import { isFaireLocation } from "./location.js";
import { NO_KNOWLEDGE, type FaireKnowledge, type FaireObservation, type ObservationSource } from "./observation.js";

/**
 * Persists what the bot has been told about the Darkmoon Faire: the newest herald announcement and
 * the newest sighting, kept apart so the stronger source is never overwritten by the weaker one.
 *
 * Worth a document of its own because an observation is not merely "where the faire is this week" —
 * it is the fact that pins the calendar's zone alternation, and that fact is good forever. Losing
 * it on a redeploy would drop the bot back to the shipped assumption until the next faire came
 * round to re-teach it, which can be most of a month.
 *
 * One tiny document, loaded once on boot and written only when something strictly newer arrives.
 */

export interface KnowledgeStore {
  /** What was last persisted; NO_KNOWLEDGE if nothing ever has been. */
  load(): Promise<FaireKnowledge>;
  save(knowledge: FaireKnowledge): Promise<void>;
  close(): Promise<void>;
}

/** In-memory store — local/test fallback (resets on restart, so the anchor reverts to the guess). */
export class InMemoryKnowledgeStore implements KnowledgeStore {
  #knowledge: FaireKnowledge;

  constructor(initial: FaireKnowledge = NO_KNOWLEDGE) {
    this.#knowledge = initial;
  }

  async load(): Promise<FaireKnowledge> {
    return this.#knowledge;
  }

  async save(knowledge: FaireKnowledge): Promise<void> {
    this.#knowledge = knowledge;
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

interface ObservationDoc {
  readonly location: string;
  readonly observedAt: number;
  readonly source: string;
  readonly witness: string;
}

interface KnowledgeDoc {
  readonly _id: string;
  readonly onsite?: ObservationDoc | null;
  readonly sighting: ObservationDoc | null;
}

/** Narrow port over the Mongo collection, so the store's logic is unit-tested with a fake. */
export interface KnowledgeDb {
  get(): Promise<FaireKnowledge>;
  set(knowledge: FaireKnowledge): Promise<void>;
  close(): Promise<void>;
}

const COLLECTION = "darkmoon";
const DOC_ID = "knowledge";

export function observationToDoc(observation: FaireObservation): ObservationDoc {
  return {
    location: observation.location,
    observedAt: observation.observedAt,
    source: observation.source,
    witness: observation.witness,
  };
}

function isObservationSource(value: string): value is ObservationSource {
  return value === "onsite" || value === "sighting";
}

/**
 * Read a stored observation back. Every field is re-validated rather than trusted: the location is
 * what every answer hangs off and the source decides which observation outranks which, so a
 * hand-edited or half-written document should cost us the anchor rather than quietly hand out a
 * wrong zone with a forged rank.
 */
export function docToObservation(doc: ObservationDoc | null | undefined): FaireObservation | null {
  if (!doc) return null;
  if (!isFaireLocation(doc.location)) return null;
  if (!isObservationSource(doc.source)) return null;
  if (!Number.isFinite(doc.observedAt)) return null;
  return {
    location: doc.location,
    observedAt: doc.observedAt,
    source: doc.source,
    witness: doc.witness,
  };
}

export function docToKnowledge(doc: KnowledgeDoc): FaireKnowledge {
  return {
    onsite: docToObservation(doc.onsite),
    sighting: docToObservation(doc.sighting),
  };
}

export class MongoKnowledgeStore implements KnowledgeStore {
  readonly #db: KnowledgeDb;

  constructor(db: KnowledgeDb) {
    this.#db = db;
  }

  static async open(database: Db): Promise<MongoKnowledgeStore> {
    const collection = database.collection<KnowledgeDoc>(COLLECTION);
    const db: KnowledgeDb = {
      get: () =>
        collection.findOne({ _id: DOC_ID }).then((doc) => (doc ? docToKnowledge(doc) : NO_KNOWLEDGE)),
      set: (knowledge) =>
        collection
          .updateOne(
            { _id: DOC_ID },
            {
              $set: {
                onsite: knowledge.onsite ? observationToDoc(knowledge.onsite) : null,
                sighting: knowledge.sighting ? observationToDoc(knowledge.sighting) : null,
              },
            },
            { upsert: true },
          )
          .then(() => undefined),
      close: releaseSharedClient,
    };
    return new MongoKnowledgeStore(db);
  }

  async load(): Promise<FaireKnowledge> {
    return this.#db.get();
  }

  async save(knowledge: FaireKnowledge): Promise<void> {
    await this.#db.set(knowledge);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
