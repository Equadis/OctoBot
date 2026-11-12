import { describe, expect, it } from "vitest";
import {
  answerFaire,
  FRESH_MS,
  NO_KNOWLEDGE,
  STALE_MS,
  type FaireKnowledge,
  type FaireObservation,
} from "./observation.js";

const NOW = Date.parse("2026-09-17T12:00:00Z");

const seen = (over: Partial<FaireObservation> = {}): FaireObservation => ({
  location: "elwynn",
  observedAt: NOW - 60_000,
  source: "sighting",
  witness: "Someplayer",
  ...over,
});

const knows = (over: Partial<FaireKnowledge> = {}): FaireKnowledge => ({ ...NO_KNOWLEDGE, ...over });

describe("answerFaire", () => {
  it("knows nothing before anything has been seen", () => {
    expect(answerFaire(NO_KNOWLEDGE, NOW)).toEqual({ known: false });
  });

  it("reports a recent look in the present tense", () => {
    const answer = answerFaire(knows({ sighting: seen() }), NOW);
    expect(answer).toMatchObject({ known: true, location: "elwynn", fresh: true, source: "sighting" });
  });

  it("names the landmark a player actually rides to", () => {
    const answer = answerFaire(knows({ sighting: seen({ location: "mulgore" }) }), NOW);
    if (!answer.known) throw new Error("expected a known answer");
    expect(answer.site).toEqual({ zone: "Mulgore", landmark: "below Thunder Bluff" });
  });

  it("stops calling a look fresh once it has aged", () => {
    expect(answerFaire(knows({ sighting: seen({ observedAt: NOW - FRESH_MS }) }), NOW)).toMatchObject({
      fresh: true,
    });
    expect(answerFaire(knows({ sighting: seen({ observedAt: NOW - FRESH_MS - 1 }) }), NOW)).toMatchObject({
      fresh: false,
    });
  });

  it("stops repeating a look old enough to describe a faire that has moved on", () => {
    expect(answerFaire(knows({ sighting: seen({ observedAt: NOW - STALE_MS }) }), NOW)).toMatchObject({
      known: true,
    });
    expect(answerFaire(knows({ sighting: seen({ observedAt: NOW - STALE_MS - 1 }) }), NOW)).toEqual({
      known: false,
    });
  });

  describe("choosing between sources", () => {
    it("takes the newer look, because the faire really does move", () => {
      const answer = answerFaire(
        knows({
          onsite: seen({ location: "elwynn", source: "onsite", observedAt: NOW - 86_400_000 }),
          sighting: seen({ location: "mulgore", observedAt: NOW - 60_000 }),
        }),
        NOW,
      );
      expect(answer).toMatchObject({ location: "mulgore", source: "sighting" });
    });

    it("believes our own character when the two looks are equally recent", () => {
      const answer = answerFaire(
        knows({
          onsite: seen({ location: "elwynn", source: "onsite" }),
          sighting: seen({ location: "mulgore" }),
        }),
        NOW,
      );
      expect(answer).toMatchObject({ location: "elwynn", source: "onsite" });
    });

    it("falls back to the other source when one is missing", () => {
      expect(answerFaire(knows({ onsite: seen({ source: "onsite" }) }), NOW)).toMatchObject({
        source: "onsite",
      });
    });

    it("ignores a look dated in the future — that is skew or a forgery", () => {
      const answer = answerFaire(
        knows({
          onsite: seen({ location: "mulgore", source: "onsite", observedAt: NOW + 3_600_000 }),
          sighting: seen({ location: "elwynn" }),
        }),
        NOW,
      );
      expect(answer).toMatchObject({ location: "elwynn" });
    });

    it("knows nothing when the only look is in the future", () => {
      expect(answerFaire(knows({ sighting: seen({ observedAt: NOW + 1 }) }), NOW)).toEqual({ known: false });
    });
  });
});
