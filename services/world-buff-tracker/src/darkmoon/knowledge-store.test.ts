import { describe, expect, it, vi } from "vitest";
import {
  docToKnowledge,
  docToObservation,
  InMemoryKnowledgeStore,
  MongoKnowledgeStore,
  observationToDoc,
  type KnowledgeDb,
} from "./knowledge-store.js";
import { NO_KNOWLEDGE, type FaireKnowledge, type FaireObservation } from "./observation.js";

const sighting: FaireObservation = {
  location: "mulgore",
  observedAt: Date.parse("2026-09-17T12:00:00Z"),
  source: "sighting",
  witness: "Someplayer",
};

const onsite: FaireObservation = {
  location: "elwynn",
  observedAt: Date.parse("2026-09-16T09:00:00Z"),
  source: "onsite",
  witness: "Silas Darkmoon",
};

const knowledge: FaireKnowledge = { onsite, sighting };

describe("InMemoryKnowledgeStore", () => {
  it("starts empty and returns what was saved", async () => {
    const store = new InMemoryKnowledgeStore();
    expect(await store.load()).toEqual(NO_KNOWLEDGE);
    await store.save(knowledge);
    expect(await store.load()).toEqual(knowledge);
  });

  it("can be seeded, standing in for a previous run", async () => {
    expect(await new InMemoryKnowledgeStore(knowledge).load()).toEqual(knowledge);
  });
});

describe("document round-trip", () => {
  it("survives a save/load unchanged, both sources", () => {
    const doc = { _id: "knowledge", onsite: observationToDoc(onsite), sighting: observationToDoc(sighting) };
    expect(docToKnowledge(doc)).toEqual(knowledge);
  });

  it("reads a document with only one source recorded", () => {
    expect(docToKnowledge({ _id: "knowledge", onsite: null, sighting: observationToDoc(sighting) })).toEqual({
      onsite: null,
      sighting,
    });
  });

  it("drops an observation whose zone is not one the faire visits", () => {
    expect(docToObservation({ ...observationToDoc(sighting), location: "booty bay" })).toBeNull();
    expect(docToObservation({ ...observationToDoc(sighting), location: "" })).toBeNull();
  });

  it("drops an observation claiming a source that does not exist", () => {
    // The source decides which look is believed on a tie, so a forged one must not be honoured.
    expect(docToObservation({ ...observationToDoc(sighting), source: "herald" })).toBeNull();
    expect(docToObservation({ ...observationToDoc(sighting), source: "gossip" })).toBeNull();
  });

  it("drops an observation with an unusable timestamp", () => {
    expect(docToObservation({ ...observationToDoc(sighting), observedAt: NaN })).toBeNull();
  });

  it("reads a missing observation as nothing known", () => {
    expect(docToObservation(null)).toBeNull();
    expect(docToObservation(undefined)).toBeNull();
  });
});

describe("MongoKnowledgeStore", () => {
  const fakeDb = (initial: FaireKnowledge = NO_KNOWLEDGE) => {
    let held = initial;
    const db: KnowledgeDb = {
      get: vi.fn(async () => held),
      set: vi.fn(async (next: FaireKnowledge) => {
        held = next;
      }),
      close: vi.fn(async () => undefined),
    };
    return db;
  };

  it("reads through to the collection", async () => {
    const db = fakeDb(knowledge);
    expect(await new MongoKnowledgeStore(db).load()).toEqual(knowledge);
    expect(db.get).toHaveBeenCalledTimes(1);
  });

  it("writes through to the collection", async () => {
    const db = fakeDb();
    const store = new MongoKnowledgeStore(db);
    await store.save(knowledge);
    expect(db.set).toHaveBeenCalledWith(knowledge);
    expect(await store.load()).toEqual(knowledge);
  });

  it("releases the client on close", async () => {
    const db = fakeDb();
    await new MongoKnowledgeStore(db).close();
    expect(db.close).toHaveBeenCalledTimes(1);
  });
});
