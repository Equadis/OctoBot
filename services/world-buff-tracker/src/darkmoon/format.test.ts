import { describe, expect, it } from "vitest";
import { capitalStatusFaire, formatFaire, formatFaireBrief } from "./format.js";
import { FAIRE_SITES } from "./location.js";
import type { FaireAnswer } from "./observation.js";

const NOW = Date.parse("2026-09-17T12:00:00Z");

const known = (over: Partial<Extract<FaireAnswer, { known: true }>> = {}): FaireAnswer => ({
  known: true,
  location: "elwynn",
  site: FAIRE_SITES.elwynn,
  observedAt: NOW - 240_000,
  source: "sighting",
  witness: "Someplayer",
  fresh: true,
  ...over,
});

describe("formatFaire", () => {
  it("states a recent look plainly, with the landmark to ride to", () => {
    expect(formatFaire(known(), NOW)).toBe(
      "Darkmoon Faire is in Elwynn Forest (south of Goldshire) - seen 4m ago.",
    );
  });

  it("refuses the present tense on an old look, and says why it might be wrong", () => {
    const stale = known({ fresh: false, observedAt: NOW - 2 * 86_400_000, location: "mulgore", site: FAIRE_SITES.mulgore });
    expect(formatFaire(stale, NOW)).toBe(
      "Darkmoon Faire was last seen in Mulgore (below Thunder Bluff) ~2d ago - it moves weekly, so it may have moved on.",
    );
  });

  it("admits it does not know rather than guessing a zone", () => {
    const reply = formatFaire({ known: false }, NOW);
    expect(reply).toBe("I don't know where the Darkmoon Faire is right now - nobody's spotted it lately.");
    expect(reply).not.toMatch(/Elwynn|Mulgore/);
  });
});

describe("capitalStatusFaire", () => {
  it("carries the zone, how long ago it was seen, and whether that is recent", () => {
    expect(capitalStatusFaire(known(), NOW)).toEqual({ zone: "Elwynn Forest", ageMs: 240_000, fresh: true });
    const old = known({ location: "mulgore", site: FAIRE_SITES.mulgore, observedAt: NOW - 11 * 3_600_000, fresh: false });
    expect(capitalStatusFaire(old, NOW)).toEqual({ zone: "Mulgore", ageMs: 11 * 3_600_000, fresh: false });
  });

  it("is null when nothing is known, so the yell leaves the faire out", () => {
    expect(capitalStatusFaire({ known: false }, NOW)).toBeNull();
  });
});

describe("formatFaireBrief", () => {
  it("states the zone and the age of a recent look, the landmark left to 'darkmoon'", () => {
    expect(formatFaireBrief(known(), NOW)).toBe("Darkmoon Faire: Elwynn Forest, seen 4m ago.");
  });

  it("warns an old look may have moved on", () => {
    const stale = known({ fresh: false, observedAt: NOW - 3 * 86_400_000, location: "mulgore", site: FAIRE_SITES.mulgore });
    expect(formatFaireBrief(stale, NOW)).toBe("Darkmoon Faire: Mulgore, seen 3d ago, may have moved.");
  });

  it("is null when nothing is known, so the status leaves the faire out", () => {
    expect(formatFaireBrief({ known: false }, NOW)).toBeNull();
  });
});
