import { describe, expect, it } from "vitest";
import { confirmingKills } from "./confirm.js";
import type { OnyxiaKill } from "./types.js";

const T = (iso: string): Date => new Date(iso);
function kill(over: Partial<OnyxiaKill> & { logId: string }): OnyxiaKill {
  return { realm: "N'Zoth", uploader: "Anaeri", guild: null, at: T("2026-09-01T02:10:00Z"), playerCount: 28, ...over };
}

const SPAN_FROM = T("2026-09-01T02:00:00Z").getTime();
const SPAN_TO = T("2026-09-01T02:40:00Z").getTime();
const ROSTER = ["Anaeri", "Zug", "Bob"];

describe("confirmingKills", () => {
  it("returns a kill whose uploader is in the roster and whose time is in span", () => {
    const got = confirmingKills([kill({ logId: "a", uploader: "Zug" })], ROSTER, SPAN_FROM, SPAN_TO);
    expect(got.map((k) => k.logId)).toEqual(["a"]);
  });

  it("matches the uploader case-insensitively", () => {
    const got = confirmingKills([kill({ logId: "a", uploader: "ZUG" })], ROSTER, SPAN_FROM, SPAN_TO);
    expect(got).toHaveLength(1);
  });

  it("excludes a roster member's kill from OUTSIDE the raid's span (an earlier raid)", () => {
    const old = kill({ logId: "old", uploader: "Anaeri", at: T("2026-08-31T20:00:00Z") });
    expect(confirmingKills([old], ROSTER, SPAN_FROM, SPAN_TO)).toEqual([]);
  });

  it("excludes a kill uploaded by someone not in this raid's roster", () => {
    expect(confirmingKills([kill({ logId: "x", uploader: "Ghost" })], ROSTER, SPAN_FROM, SPAN_TO)).toEqual([]);
  });

  it("returns every confirming kill (several uploaders of the one raid)", () => {
    const kills = [kill({ logId: "a", uploader: "Anaeri" }), kill({ logId: "b", uploader: "Bob" }), kill({ logId: "c", uploader: "Ghost" })];
    expect(confirmingKills(kills, ROSTER, SPAN_FROM, SPAN_TO).map((k) => k.logId)).toEqual(["a", "b"]);
  });
});
