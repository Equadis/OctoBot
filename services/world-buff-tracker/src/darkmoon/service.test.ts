import { describe, expect, it, vi } from "vitest";
import { FaireService, type FaireMove, type ObserveOutcome } from "./service.js";
import { InMemoryKnowledgeStore, type KnowledgeStore } from "./knowledge-store.js";
import { DEFAULT_CORROBORATION, type CorroborationPolicy } from "./corroboration.js";
import { NO_KNOWLEDGE, type FaireKnowledge, type FaireObservation } from "./observation.js";

const utc = (iso: string): number => Date.parse(iso);
const NOW = utc("2026-09-17T12:00:00Z");

function makeService(
  store: KnowledgeStore = new InMemoryKnowledgeStore(),
  hooks: {
    onObservation?: (observation: FaireObservation) => void;
    onMove?: (change: FaireMove) => void;
    corroboration?: CorroborationPolicy;
  } = {},
): FaireService {
  return new FaireService({ store, ...hooks });
}

/** What a real faire looks like on the channel: many distinct clients repeating one sighting. */
async function flood(
  service: FaireService,
  line: string,
  at: number,
  senders = DEFAULT_CORROBORATION.quorum,
): Promise<ObserveOutcome> {
  const outcomes: ObserveOutcome[] = [];
  for (let i = 0; i < senders; i += 1) {
    outcomes.push(await service.observeChannel(line, `player-${i}`, at));
  }
  // Only the vote that tips the quorum settles; the rest are already-known repeats.
  return outcomes.includes("accepted") ? "accepted" : (outcomes[outcomes.length - 1] ?? "ignored");
}

describe("FaireService.observeChannel", () => {
  it("accepts a corroborated broadcast and answers from it", async () => {
    const service = makeService();
    expect(await flood(service, "PWB_DMF:10401:M-3600-Someplayer", NOW)).toBe("accepted");
    expect(service.knowledge.sighting).toEqual({
      location: "mulgore",
      observedAt: NOW - 3_600_000,
      source: "sighting",
      witness: "Someplayer",
    });
    expect(service.answer(NOW)).toMatchObject({ known: true, location: "mulgore", source: "sighting" });
  });

  it("ignores the rest of the LFT channel's traffic", async () => {
    const service = makeService();
    expect(await service.observeChannel("OB_INC:1:A-O-Someplayer-14-32", "p1", NOW)).toBe("ignored");
    expect(await service.observeChannel("PWB:1337:A-O-13-37-Pizzahawaii", "p1", NOW)).toBe("ignored");
    expect(await service.observeChannel("LFG Mara need healer", "p1", NOW)).toBe("ignored");
    expect(service.knowledge).toEqual(NO_KNOWLEDGE);
  });

  it("ignores a broadcast from a version with the Carnie bug", async () => {
    const service = makeService();
    expect(await flood(service, "PWB_DMF:10400:M-60-Someplayer", NOW)).toBe("ignored");
    expect(service.knowledge.sighting).toBeNull();
  });

  it("ignores a sighting too old for PizzaWorldBuffs itself to accept", async () => {
    const service = makeService();
    expect(await flood(service, `PWB_DMF:10401:M-${8 * 86_400}-Someplayer`, NOW)).toBe("ignored");
    expect(service.knowledge.sighting).toBeNull();
  });

  it("keeps the freshest sighting and writes nothing for the rebroadcast flood", async () => {
    const store = new InMemoryKnowledgeStore();
    const save = vi.spyOn(store, "save");
    const service = makeService(store);

    expect(await flood(service, "PWB_DMF:10401:M-3600-First", NOW)).toBe("accepted");
    expect(await flood(service, "PWB_DMF:10401:M-3600-First", NOW)).toBe("counted");
    expect(await flood(service, "PWB_DMF:10401:M-7200-Second", NOW)).toBe("counted");
    expect(save).toHaveBeenCalledTimes(1);

    expect(await flood(service, "PWB_DMF:10401:M-60-Third", NOW)).toBe("accepted");
    expect(service.knowledge.sighting?.witness).toBe("Third");
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("announces an accepted sighting exactly once", async () => {
    const onObservation = vi.fn();
    const service = makeService(new InMemoryKnowledgeStore(), { onObservation });
    await flood(service, "PWB_DMF:10401:M-3600-Someplayer", NOW);
    await flood(service, "PWB_DMF:10401:M-3600-Someplayer", NOW);
    expect(onObservation).toHaveBeenCalledTimes(1);
    expect(onObservation.mock.calls[0]?.[0]).toMatchObject({ source: "sighting", location: "mulgore" });
  });
});

describe("FaireService tamper resistance", () => {
  it("does not believe one player, however loudly they repeat themselves", async () => {
    const service = makeService();
    for (let i = 0; i < 50; i += 1) {
      expect(await service.observeChannel("PWB_DMF:10401:M-0-Troll", "troll", NOW + i * 1000)).toBe("counted");
    }
    expect(service.knowledge.sighting).toBeNull();
    expect(service.answer(NOW)).toEqual({ known: false });
  });

  it("will not count a broadcast whose sender cannot be identified", async () => {
    const service = makeService();
    expect(await service.observeChannel("PWB_DMF:10401:M-0-Troll", "0", NOW)).toBe("unidentified");
    expect(await service.observeChannel("PWB_DMF:10401:M-0-Troll", "", NOW)).toBe("unidentified");
    expect(service.knowledge.sighting).toBeNull();
  });

  it("outvotes a troll who shows up with a handful of characters", async () => {
    const service = makeService();
    for (let i = 0; i < 8; i += 1) {
      await service.observeChannel("PWB_DMF:10401:E-60-Honest", `player-${i}`, NOW);
    }
    expect(service.answer(NOW)).toMatchObject({ location: "elwynn" });

    for (const troll of ["troll1", "troll2", "troll3", "troll4"]) {
      await service.observeChannel("PWB_DMF:10401:M-0-Liar", troll, NOW + 60_000);
    }
    expect(service.answer(NOW + 60_000)).toMatchObject({ location: "elwynn" });
  });

  it("holds the zone through the cooldown even if the liars take the majority", async () => {
    const service = makeService();
    await flood(service, "PWB_DMF:10401:E-60-Honest", NOW, 4);
    const later = NOW + 3_600_000;
    for (let i = 0; i < 12; i += 1) {
      await service.observeChannel("PWB_DMF:10401:M-0-Liar", `sock-${i}`, later);
    }
    expect(service.answer(later)).toMatchObject({ location: "elwynn", witness: "Honest" });
  });

  it("lets the zone move once the cooldown is spent, which is how the faire really moves", async () => {
    const service = makeService();
    await flood(service, "PWB_DMF:10401:E-60-Honest", NOW, 4);
    const nextWeek = NOW + 7 * 86_400_000;
    expect(await flood(service, "PWB_DMF:10401:M-60-Newcomer", nextWeek, 4)).toBe("accepted");
    expect(service.answer(nextWeek)).toMatchObject({ location: "mulgore" });
  });

  it("cannot be kept looking current by one player after the faire has moved", async () => {
    const service = makeService();
    await flood(service, "PWB_DMF:10401:E-60-Honest", NOW, 4);
    const nextDay = NOW + 86_400_000;
    expect(await service.observeChannel("PWB_DMF:10401:E-0-Troll", "troll", nextDay)).toBe("counted");
    expect(service.knowledge.sighting?.observedAt).toBe(NOW - 60_000);
  });

  it("can be relaxed to PizzaWorldBuffs' own trust-the-latest behaviour", async () => {
    const service = makeService(new InMemoryKnowledgeStore(), {
      corroboration: { quorum: 1, changeCooldownMs: 0 },
    });
    expect(await service.observeChannel("PWB_DMF:10401:M-60-Someplayer", "solo", NOW)).toBe("accepted");
  });
});

describe("FaireService.observeNearbyNpc", () => {
  it("records the faire as here when its staff is standing next to us", async () => {
    const service = makeService();
    expect(await service.observeNearbyNpc("Silas Darkmoon", "elwynn", NOW)).toBe(true);
    expect(service.knowledge.onsite).toEqual({
      location: "elwynn",
      observedAt: NOW,
      source: "onsite",
      witness: "Silas Darkmoon",
    });
    expect(service.answer(NOW)).toMatchObject({ known: true, location: "elwynn", source: "onsite" });
  });

  it("ignores NPCs that are not the faire, including the ever-present Carnie", async () => {
    const service = makeService();
    expect(await service.observeNearbyNpc("Innkeeper Farley", "elwynn", NOW)).toBe(false);
    expect(await service.observeNearbyNpc("Darkmoon Faire Carnie", "elwynn", NOW)).toBe(false);
    expect(service.knowledge.onsite).toBeNull();
  });

  it("does not rewrite itself every time the staff re-enters visibility", async () => {
    const store = new InMemoryKnowledgeStore();
    const save = vi.spyOn(store, "save");
    const service = makeService(store);
    expect(await service.observeNearbyNpc("Sayge", "elwynn", NOW)).toBe(true);
    expect(await service.observeNearbyNpc("Sayge", "elwynn", NOW + 60_000)).toBe(false);
    expect(await service.observeNearbyNpc("Flik", "elwynn", NOW + 120_000)).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);

    expect(await service.observeNearbyNpc("Sayge", "elwynn", NOW + 40 * 60_000)).toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("records a MOVE immediately, without waiting out the refresh gap", async () => {
    // The faire arriving in the zone we are parked in is the single most valuable thing we can
    // see, and it must not be swallowed as a repeat of the last look.
    const service = makeService();
    await service.observeNearbyNpc("Sayge", "mulgore", NOW);
    expect(await service.observeNearbyNpc("Sayge", "elwynn", NOW + 60_000)).toBe(true);
    expect(service.answer(NOW + 60_000)).toMatchObject({ location: "elwynn" });
  });

  it("outranks a troll's channel line outright", async () => {
    const service = makeService();
    await service.observeNearbyNpc("Silas Darkmoon", "elwynn", NOW);
    for (let i = 0; i < 10; i += 1) {
      await service.observeChannel("PWB_DMF:10401:M-0-Liar", `sock-${i}`, NOW);
    }
    expect(service.answer(NOW)).toMatchObject({ location: "elwynn", source: "onsite" });
  });
});

describe("FaireService.load", () => {
  it("restores what was seen before a redeploy", async () => {
    const stored: FaireKnowledge = {
      onsite: null,
      sighting: { location: "mulgore", observedAt: NOW - 60_000, source: "sighting", witness: "Someplayer" },
    };
    const service = makeService(new InMemoryKnowledgeStore(stored));
    await service.load();
    expect(service.answer(NOW)).toMatchObject({ known: true, location: "mulgore" });
  });

  it("knows nothing when nothing was ever stored", async () => {
    const service = makeService();
    await service.load();
    expect(service.answer(NOW)).toEqual({ known: false });
  });
});

describe("FaireService move trail", () => {
  it("reports the first zone it ever learns as a move from nothing", async () => {
    const onMove = vi.fn();
    const service = makeService(new InMemoryKnowledgeStore(), { onMove });
    await service.observeNearbyNpc("Sayge", "elwynn", NOW);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0]?.[0]).toMatchObject({ from: null, to: "elwynn" });
  });

  it("reports a real move, once, with both ends", async () => {
    const onMove = vi.fn();
    const service = makeService(new InMemoryKnowledgeStore(), { onMove });
    await service.observeNearbyNpc("Sayge", "elwynn", NOW);
    await service.observeNearbyNpc("Sayge", "mulgore", NOW + 7 * 86_400_000);
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(onMove.mock.calls[1]?.[0]).toMatchObject({ from: "elwynn", to: "mulgore" });
  });

  it("stays quiet while the same faire is re-seen", async () => {
    const onMove = vi.fn();
    const service = makeService(new InMemoryKnowledgeStore(), { onMove });
    await service.observeNearbyNpc("Sayge", "elwynn", NOW);
    await service.observeNearbyNpc("Flik", "elwynn", NOW + 40 * 60_000);
    await service.observeNearbyNpc("Silas Darkmoon", "elwynn", NOW + 80 * 60_000);
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it("does not call it a move when the accepted look is not the newest one", async () => {
    // Our own character saw Elwynn a minute ago; an older channel sighting of Mulgore is accepted
    // into the record but never becomes the answer, so nothing a player sees has changed.
    const onMove = vi.fn();
    const service = makeService(new InMemoryKnowledgeStore(), { onMove });
    await service.observeNearbyNpc("Sayge", "elwynn", NOW);
    onMove.mockClear();
    await flood(service, "PWB_DMF:10401:M-3600-Someplayer", NOW + 1000);
    expect(service.knowledge.sighting).not.toBeNull();
    expect(onMove).not.toHaveBeenCalled();
    expect(service.answer(NOW + 1000)).toMatchObject({ location: "elwynn" });
  });
});

describe("FaireService channel write churn", () => {
  it("does not re-record the same sighting as its age rounding drifts", async () => {
    // Seen in production: PWB reports whole-second ages, so the same look arrives with millisecond
    // jitter every ~10s and used to count as strictly newer each time — a Mongo write per rebroadcast.
    const store = new InMemoryKnowledgeStore();
    const save = vi.spyOn(store, "save");
    const service = makeService(store);

    expect(await flood(service, "PWB_DMF:10401:M-470-Jardiance", NOW)).toBe("accepted");
    for (let i = 1; i <= 30; i += 1) {
      const at = NOW + i * 11_000;
      const age = Math.round((at - (NOW - 470_000)) / 1000);
      await flood(service, `PWB_DMF:10401:M-${age}-Jardiance`, at);
    }
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("still takes a genuinely fresher look from the same witness", async () => {
    const service = makeService();
    await flood(service, "PWB_DMF:10401:M-470-Jardiance", NOW);
    expect(await flood(service, "PWB_DMF:10401:M-10-Jardiance", NOW + 60_000)).toBe("accepted");
  });

  it("always takes a new witness, and always takes a new zone", async () => {
    const byWitness = makeService();
    await flood(byWitness, "PWB_DMF:10401:M-60-First", NOW);
    expect(await flood(byWitness, "PWB_DMF:10401:M-59-Second", NOW)).toBe("accepted");

    const byZone = makeService(new InMemoryKnowledgeStore(), {
      corroboration: { quorum: 3, changeCooldownMs: 0 },
    });
    await flood(byZone, "PWB_DMF:10401:M-60-First", NOW);
    expect(await flood(byZone, "PWB_DMF:10401:E-59-First", NOW)).toBe("accepted");
  });
});
