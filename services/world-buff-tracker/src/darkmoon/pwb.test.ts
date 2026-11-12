import { describe, expect, it } from "vitest";
import {
  isTrustedBroadcast,
  MAX_SIGHTING_AGE_MS,
  MIN_TRUSTED_PWB_VERSION,
  parseDmfBroadcast,
  sightedAt,
  type DmfBroadcast,
} from "./pwb.js";

const broadcast = (over: Partial<DmfBroadcast> = {}): DmfBroadcast => ({
  version: MIN_TRUSTED_PWB_VERSION,
  location: "mulgore",
  ageMs: 0,
  witness: "Someplayer",
  ...over,
});

describe("parseDmfBroadcast", () => {
  it("decodes a live PWB line", () => {
    expect(parseDmfBroadcast("PWB_DMF:10401:M-3600-Someplayer")).toEqual({
      version: 10401,
      location: "mulgore",
      ageMs: 3_600_000,
      witness: "Someplayer",
    });
  });

  it("decodes Elwynn and a zero-age sighting", () => {
    expect(parseDmfBroadcast("PWB_DMF:10500:E-0-Pizzahawaii")).toEqual({
      version: 10500,
      location: "elwynn",
      ageMs: 0,
      witness: "Pizzahawaii",
    });
  });

  it("ignores other traffic on the LFT channel", () => {
    expect(parseDmfBroadcast("PWB:1337:A-O-13-37-Pizzahawaii")).toBeNull();
    expect(parseDmfBroadcast("OB_INC:1:A-O-Someplayer-14-32")).toBeNull();
    expect(parseDmfBroadcast("LFG UBRS need tank")).toBeNull();
    expect(parseDmfBroadcast("")).toBeNull();
  });

  it("drops a zone letter it cannot read rather than guessing", () => {
    // An esES client in "Bosque de Elwynn" broadcasts "B" — PWB's own table cannot map it either.
    expect(parseDmfBroadcast("PWB_DMF:10401:B-60-Jugador")).toBeNull();
    expect(parseDmfBroadcast("PWB_DMF:10401:X-60-Someplayer")).toBeNull();
  });

  it("drops malformed lines instead of half-reading them", () => {
    expect(parseDmfBroadcast("PWB_DMF:10401:M-3600")).toBeNull();
    expect(parseDmfBroadcast("PWB_DMF:10401:M--Someplayer")).toBeNull();
    expect(parseDmfBroadcast("PWB_DMF:10401:M-abc-Someplayer")).toBeNull();
    expect(parseDmfBroadcast("PWB_DMF:10401:M-60-Some-player")).toBeNull();
    expect(parseDmfBroadcast("PWB_DMF:10401")).toBeNull();
    expect(parseDmfBroadcast("PWB_DMF:notanumber:M-60-Someplayer")).toBeNull();
  });

  it("rejects a negative age rather than reading it as a future sighting", () => {
    expect(parseDmfBroadcast("PWB_DMF:10401:M--60-Someplayer")).toBeNull();
  });
});

describe("isTrustedBroadcast", () => {
  it("accepts a current-version, fresh sighting", () => {
    expect(isTrustedBroadcast(broadcast({ version: 10500, ageMs: 3_600_000 }))).toBe(true);
  });

  it("rejects pre-1.4.1 clients, which also fired on the Carnie who is there with no faire", () => {
    expect(isTrustedBroadcast(broadcast({ version: 10400 }))).toBe(false);
    expect(isTrustedBroadcast(broadcast({ version: MIN_TRUSTED_PWB_VERSION }))).toBe(true);
  });

  it("rejects a sighting older than the faire's own visit", () => {
    expect(isTrustedBroadcast(broadcast({ ageMs: MAX_SIGHTING_AGE_MS }))).toBe(true);
    expect(isTrustedBroadcast(broadcast({ ageMs: MAX_SIGHTING_AGE_MS + 1 }))).toBe(false);
  });
});

describe("sightedAt", () => {
  it("resolves the age against our own receive time, not the sender's clock", () => {
    const receivedAt = Date.parse("2026-09-10T12:00:00Z");
    expect(sightedAt(broadcast({ ageMs: 3_600_000 }), receivedAt)).toBe(Date.parse("2026-09-10T11:00:00Z"));
  });
});
