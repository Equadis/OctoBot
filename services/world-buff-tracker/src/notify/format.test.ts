import { describe, expect, it } from "vitest";
import type { RaidCohortSnapshot } from "../watcher/raid-events.js";
import {
  formatBuffAlert,
  formatBuffDropped,
  formatBuffDroppedWhisper,
  formatBuffWhisper,
  formatRaidEnding,
  formatRaidEndingWhisper,
  formatRaidDisbanded,
  formatRaidDisbandedWhisper,
  formatCapitalStatusYell,
  formatFeedbackPost,
  formatGuildWelcome,
  formatWhisperDelayNote,
  humanSpan,
  formatHeadIncoming,
  humanClock,
  withUnsubscribeHint,
} from "./format.js";
import { BLACKWING_LAIR, ONYXIA } from "../watcher/raid-zone.js";

const M = 60_000;

function cohort(over: Partial<RaidCohortSnapshot> = {}): RaidCohortSnapshot {
  return { key: "Nightfall", label: "<Nightfall>", count: 16, peak: 16, members: [], ...over };
}

describe("formatBuffAlert — raid starting", () => {
  it("titles 'Onyxia raid starting', names the raid #, the open capital, and quotes the typical clear", () => {
    const msg = formatBuffAlert(ONYXIA, { kind: "raid-forming", initial: false, cohort: cohort(), number: 28 }, ["alliance"], "30-50m");
    expect(msg.title).toBe("🐲 Onyxia raid starting");
    expect(msg.body).toBe("Raid #28 formed, usually 30-50m to clear. Rallying Cry buff drops in Stormwind on a clear.");
    expect(msg.body).not.toContain("Orgrimmar");
    expect(msg.body).not.toMatch(/\bwait\b/i); // no call to action — just the facts
  });

  it("omits the clear-time clause when no estimate is available", () => {
    const msg = formatBuffAlert(ONYXIA, { kind: "raid-forming", initial: false, cohort: cohort(), number: 28 }, ["alliance"]);
    expect(msg.body).toBe("Raid #28 formed. Rallying Cry buff drops in Stormwind on a clear.");
  });

  it("falls back to 'A raid' when the formation carries no number, no bare member count", () => {
    const msg = formatBuffAlert(ONYXIA, { kind: "raid-forming", initial: false, cohort: cohort() }, ["alliance", "horde"]);
    expect(msg.body).toContain("A raid formed");
    expect(msg.body).toContain("Stormwind or Orgrimmar");
    expect(msg.body).not.toMatch(/\(\d+\)/);
  });
});

describe("formatBuffAlert — raid has ended (merged recap, no CTA)", () => {
  it("titles 'Onyxia raid has ended', carries the # + duration and a hedged buff line", () => {
    const msg = formatBuffAlert(
      ONYXIA,
      { kind: "raid-left", cohort: cohort({ count: 0 }), number: 28, durationMs: 47 * M },
      ["alliance", "horde"],
    );
    expect(msg.title).toBe("🏁 Onyxia raid has ended");
    expect(msg.body).toBe("Raid #28 cleared after ~47m. Buff may drop in Stormwind or Orgrimmar.");
    expect(msg.body).not.toMatch(/\bwait\b/i);
  });

  it("a Chronicle-confirmed clear says Onyxia is down and drops the 'may' hedge", () => {
    const msg = formatBuffAlert(
      ONYXIA,
      { kind: "raid-left", cohort: cohort({ count: 0 }), number: 28, durationMs: 47 * M, killConfirmed: true },
      ["horde"],
    );
    expect(msg.body).toContain("Onyxia down, kill confirmed");
    expect(msg.body).toContain("Buff should drop in Orgrimmar");
    expect(msg.body).not.toMatch(/\bmay\b/);
  });
});

describe("formatBuffWhisper", () => {
  it("starting: names the raid, typical clear, and the open capital", () => {
    const line = formatBuffWhisper(ONYXIA, { kind: "raid-forming", initial: false, cohort: cohort(), number: 28 }, ["horde"], "30-50m");
    expect(line).toBe("Onyxia raid starting (Raid #28, usually 30-50m to clear). Rallying Cry buff drops in Orgrimmar on a clear.");
  });

  it("ended: plain hedges with 'may', confirmed says the kill", () => {
    const plain = formatBuffWhisper(ONYXIA, { kind: "raid-left", cohort: cohort({ count: 0 }) }, ["alliance", "horde"]);
    const confirmed = formatBuffWhisper(ONYXIA, { kind: "raid-left", cohort: cohort({ count: 0 }), killConfirmed: true }, ["horde"]);
    expect(plain).toBe("Onyxia raid cleared. Buff may drop in Stormwind or Orgrimmar.");
    expect(confirmed).toContain("kill confirmed");
    expect(confirmed).not.toMatch(/\bmay\b/);
  });
});

describe("formatRaidEnding — might end soon", () => {
  it("titles 'might end soon', shows time-in, the typical range, and the capital — no CTA", () => {
    const msg = formatRaidEnding(ONYXIA, 28, ["alliance"], 28 * M, "30-50m");
    expect(msg.title).toBe("⏰ Onyxia raid might end soon");
    expect(msg.body).toBe("Raid #28 has been in ~28m (typical clear 30-50m). Buff may drop soon in Stormwind.");
  });

  it("keeps the timing soft — no precise ETA a wide spread would make wrong", () => {
    const msg = formatRaidEnding(ONYXIA, 28, ["alliance"], 28 * M, "30-50m");
    expect(msg.body).toMatch(/may drop soon/);
    expect(msg.body).not.toMatch(/~\d+m (?:left|to go|until)/i);
  });

  it("the whisper twin names the raid #, time-in, typical, and capital", () => {
    const line = formatRaidEndingWhisper(ONYXIA, 28, ["horde"], 28 * M, "30-50m");
    expect(line).toBe("Onyxia raid #28 might end soon (~28m in, typical 30-50m). Buff may drop soon in Orgrimmar.");
  });
});

describe("formatRaidDisbanded", () => {
  it("titles 'Onyxia raid disbanded', shows how short it was, and says no buff is coming — no CTA", () => {
    const msg = formatRaidDisbanded(ONYXIA, 28, 15 * M);
    expect(msg.title).toBe("🚫 Onyxia raid disbanded");
    expect(msg.body).toBe("Raid #28 left after ~15m without clearing. No buff coming.");
    expect(msg.body).not.toMatch(/\bwait\b/i);
  });

  it("omits the duration cleanly when unknown", () => {
    const msg = formatRaidDisbanded(ONYXIA, null);
    expect(msg.body).toBe("A raid left without clearing. No buff coming.");
  });

  it("the whisper twin says no buff is coming, without a CTA", () => {
    const line = formatRaidDisbandedWhisper(ONYXIA, 28, 15 * M);
    expect(line).toBe("Onyxia raid #28 disbanded (left after ~15m). No buff coming.");
  });
});

describe("formatBuffDropped", () => {
  it("titles 'Onyxia buff dropped in <city>', a factual body, and NO tip ask", () => {
    const msg = formatBuffDropped("alliance", ONYXIA);
    expect(msg.title).toBe("🎉 Onyxia buff dropped in Stormwind");
    expect(msg.body).toBe("The Rallying Cry of the Dragonslayer is up.");
    expect(msg.body).not.toMatch(/tip|appreciated|Did you get it/i); // the tip ask is gone
    expect(msg.body).not.toMatch(/<t:/); // Discord's own post-time is the drop time; no "N hours ago"
  });

  it("makes NO cooldown / duration claim", () => {
    const msg = formatBuffDropped("horde", ONYXIA);
    expect(msg.title).toContain("Orgrimmar");
    expect(msg.body).not.toMatch(/cooldown|2h|wears off|until/i);
  });

  it("a saved head explains the origin (still no tip); a fresh drop just reports the buff", () => {
    const fresh = formatBuffDropped("alliance", ONYXIA);
    expect(fresh.body).not.toMatch(/saved|earlier kill|heads-up/i);
    const saved = formatBuffDropped("alliance", ONYXIA, true);
    expect(saved.body).toContain("saved Onyxia head from an earlier kill");
    expect(saved.body).toMatch(/no raid was in the lair/);
    expect(saved.body).not.toMatch(/tip|appreciated/i);
    expect(saved.title).toBe(fresh.title); // same headline; only the body differs
  });
});

describe("formatBuffDroppedWhisper", () => {
  it("names the buff and city, with no timestamp, no cooldown claim, and NO tip ask", () => {
    const line = formatBuffDroppedWhisper("alliance", ONYXIA);
    expect(line).toContain("The Rallying Cry of the Dragonslayer just dropped in Stormwind");
    expect(line).not.toMatch(/<t:/);
    expect(line).not.toMatch(/cooldown|2h|at least/i);
    expect(line).not.toMatch(/tip|appreciated|Did you get it/i);
  });

  it("carries no Discord link — that is for a player who asks", () => {
    expect(formatBuffDroppedWhisper("alliance", ONYXIA)).not.toMatch(/discord/i);
  });
});

describe("formatHeadIncoming", () => {
  it("names the incoming city and the witness for an alliance turn-in, with no CTA", () => {
    const msg = formatHeadIncoming("alliance", "Someplayer");
    expect(msg.title).toBe("⚡ Onyxia buff incoming in Stormwind");
    expect(msg.body).toContain("Someplayer");
    expect(msg.body).toMatch(/should drop in Stormwind/i);
    expect(msg.body).toMatch(/within moments/i); // it's the ADVANCE warning, not a drop
    expect(msg.body).not.toMatch(/\b(get to|hearthstone|wait)\b/i);
  });

  it("maps horde to Orgrimmar", () => {
    expect(formatHeadIncoming("horde", "Thrallfan").title).toBe("⚡ Onyxia buff incoming in Orgrimmar");
  });
});

describe("formatGuildWelcome", () => {
  it("welcomes the member by name, on one line, without naming the guild", () => {
    const line = formatGuildWelcome("Raider");
    expect(line).toContain("Raider");
    expect(line).toMatch(/welcome/i);
    expect(line).not.toContain("\n");
  });
});

describe("humanClock", () => {
  it("renders minutes, hours, and hours+minutes compactly", () => {
    expect(humanClock(42 * M)).toBe("42m");
    expect(humanClock(120 * M)).toBe("2h");
    expect(humanClock(82 * M)).toBe("1h22m");
    expect(humanClock(-5)).toBe("0m");
  });
});

/** The capital status yell, where one is expected — failing the test when there is none. */
function yelled(...args: Parameters<typeof formatCapitalStatusYell>): string {
  const yell = formatCapitalStatusYell(...args);
  if (yell === null) throw new Error("expected a status yell, got none");
  return yell;
}

describe("formatCapitalStatusYell", () => {
  const raid = { zone: ONYXIA, number: 834, elapsedMs: 42 * M };

  it("with a raid in: names it, time-in, the typical range, the buff line, and no 'cooldown' (the subscribe prompt stays)", () => {
    const y = formatCapitalStatusYell("horde", [{ ...raid, typicalClear: "30-50m" }]);
    expect(y).toBe(
      `[Onyxia] Onyxia raid in progress (#834, ~42m in, typical clear 30-50m). The Rallying Cry buff may drop soon. Whisper "subscribe" for pings, "discord" for discord notifications.`,
    );
    expect(y).not.toMatch(/cooldown/i);
  });

  it("no raid in: leaves the lair out, and with nothing else to tell of, yells nothing", () => {
    expect(formatCapitalStatusYell("alliance", [])).toBeNull();
    expect(formatCapitalStatusYell("alliance", [], null)).toBeNull();
  });

  it("no raid in, but a faire to tell of: the faire and the call to action, no Onyxia", () => {
    const y = formatCapitalStatusYell("alliance", [], { zone: "Elwynn Forest", ageMs: 20 * M, fresh: true });
    expect(y).toBe(
      `[Darkmoon Faire] is in Elwynn Forest. Whisper "subscribe" for pings, "discord" for discord notifications.`,
    );
  });

  it("drops the raid number when unknown, keeping the time-in", () => {
    const y = formatCapitalStatusYell("alliance", [{ zone: ONYXIA, number: null, elapsedMs: 12 * M }]);
    expect(y).not.toMatch(/#\d/);
    expect(y).toContain("~12m in");
    expect(y).toContain("may drop soon");
  });

  it("stays within the 255-char yell cap even in the busiest state", () => {
    const y = yelled("horde", [{ zone: ONYXIA, number: 99999, elapsedMs: 135 * M, typicalClear: "30-50m" }]);
    expect(y.length).toBeLessThanOrEqual(255);
  });
});

describe("formatFeedbackPost", () => {
  it("names the sender and includes their message verbatim", () => {
    const post = formatFeedbackPost("Raider", "the timer felt 5 min late");
    expect(post).toContain("Raider");
    expect(post).toContain("the timer felt 5 min late");
    expect(post).toMatch(/suggestion/i);
  });

  it("appends the realm in brackets after the character when given", () => {
    expect(formatFeedbackPost("Raider", "hi", "N'Zoth")).toContain("Raider (N'Zoth)");
  });

  it("omits the brackets when no server is given", () => {
    expect(formatFeedbackPost("Raider", "hi")).not.toContain("(");
  });
});

describe("humanSpan", () => {
  it("falls back to the clock below a day", () => {
    expect(humanSpan(40 * 60_000)).toBe("40m");
    expect(humanSpan(5 * 3_600_000)).toBe("5h");
    expect(humanSpan(23 * 3_600_000)).toBe("23h");
  });

  it("counts whole days, with hours only when there are some", () => {
    expect(humanSpan(86_400_000)).toBe("1d");
    expect(humanSpan(3 * 86_400_000 + 6 * 3_600_000)).toBe("3d6h");
    expect(humanSpan(18 * 86_400_000)).toBe("18d");
  });

  it("carries a remainder that rounds up to a full day instead of printing 24h", () => {
    expect(humanSpan(3 * 86_400_000 + 23.9 * 3_600_000)).toBe("4d");
  });

  it("never renders a past deadline as negative", () => {
    expect(humanSpan(-5_000)).toBe("0m");
  });
});

describe("formatCapitalStatusYell darkmoon line", () => {
  const H = 3_600_000;

  it("promotes the faire when it has been seen recently", () => {
    const yell = yelled("horde", [], { zone: "Mulgore", ageMs: 20 * M, fresh: true });
    expect(yell).toContain("[Darkmoon Faire] is in Mulgore.");
    // Slotted before the call to action, so the yell still ends on what to whisper.
    expect(yell.indexOf("Darkmoon Faire")).toBeLessThan(yell.indexOf("Whisper"));
  });

  it("dates an older look instead of claiming the faire is still there", () => {
    const yell = yelled("horde", [], { zone: "Mulgore", ageMs: 11.5 * H, fresh: false });
    expect(yell).toContain("[Darkmoon Faire] was last seen in Mulgore ~11h30m ago.");
    expect(yell).not.toContain("is in Mulgore");
  });

  it("says nothing about the faire when nothing is known", () => {
    const raid = { zone: ONYXIA, number: 7, elapsedMs: 1_800_000 };
    expect(yelled("horde", [{ ...raid, typicalClear: "30-50m" }], null)).not.toContain("Darkmoon");
    expect(yelled("horde", [raid])).not.toContain("Darkmoon");
  });

  it("stays within the 255-char yell cap with a raid and the longest dated faire line", () => {
    const y = yelled("alliance", [{ zone: ONYXIA, number: 99999, elapsedMs: 135 * M, typicalClear: "30-50m" }], {
      zone: "Elwynn Forest",
      ageMs: 6 * 86_400_000 + 23 * H,
      fresh: false,
    });
    expect(y.length).toBeLessThanOrEqual(255);
  });

  it("keeps the raid status first — that is what the yell is for", () => {
    const yell = yelled("alliance", [{ zone: ONYXIA, number: 7, elapsedMs: 1_800_000, typicalClear: "30-50m" }], {
      zone: "Elwynn Forest",
      ageMs: 20 * M,
      fresh: true,
    });
    expect(yell.indexOf("Onyxia raid in progress")).toBeLessThan(yell.indexOf("Darkmoon"));
  });
});

describe("formatWhisperDelayNote", () => {
  it("says nothing for a whisper that arrived promptly", () => {
    expect(formatWhisperDelayNote(0)).toBeNull();
    expect(formatWhisperDelayNote(59_000)).toBeNull();
  });

  it("owns up to the delay and points at the route that is not rate-limited", () => {
    const note = formatWhisperDelayNote(6 * 60_000);
    expect(note).toBe(' (sent 6m late - lots of subscribers online. Whisper "discord" for instant alerts.)');
  });

  it("stays inside the whisper length limit on the longest alert it can follow", () => {
    // Vanilla caps a whisper at 255 characters; the note is appended to an already-written alert.
    const longest = formatBuffWhisper(
      ONYXIA,
      { kind: "raid-left", cohort: cohort({ count: 0 }), number: 42, killConfirmed: true },
      ["alliance", "horde"],
      "30-50m",
    );
    expect(longest.length + (formatWhisperDelayNote(9 * 60_000) ?? "").length).toBeLessThan(255);
  });
});

describe("withUnsubscribeHint", () => {
  it("ends a subscriber's whisper with how to stop the alerts", () => {
    expect(withUnsubscribeHint("Onyxia raid cleared.")).toBe(`Onyxia raid cleared. Whisper "stop" to unsubscribe.`);
  });

  it("keeps the longest alert whisper within the 255-char whisper limit", () => {
    const longest = [
      formatBuffDroppedWhisper("alliance", ONYXIA),
      formatRaidEndingWhisper(ONYXIA, 99999, ["alliance", "horde"], 135 * M, "30-50m"),
    ];
    for (const line of longest) expect(withUnsubscribeHint(line).length).toBeLessThanOrEqual(255);
  });
});

describe("Blackwing Lair wording", () => {
  it("names the BWL raid and Nefarian in the raid alerts and their whispers", () => {
    const forming = formatBuffAlert(BLACKWING_LAIR, { kind: "raid-forming", initial: false, cohort: cohort(), number: 3 }, ["horde"]);
    expect(forming.title).toBe("🐲 BWL raid starting");
    const cleared = formatBuffAlert(
      BLACKWING_LAIR,
      { kind: "raid-left", cohort: cohort({ count: 0 }), number: 3, killConfirmed: true },
      ["horde"],
    );
    expect(cleared.title).toBe("🏁 BWL raid has ended");
    expect(cleared.body).toContain("Nefarian down, kill confirmed");
    expect(formatBuffWhisper(BLACKWING_LAIR, { kind: "raid-left", cohort: cohort({ count: 0 }) }, ["horde"])).toBe(
      "BWL raid cleared. Buff may drop in Orgrimmar.",
    );
    expect(formatRaidEnding(BLACKWING_LAIR, 3, ["alliance"], 150 * M).title).toBe("⏰ BWL raid might end soon");
    expect(formatRaidEndingWhisper(BLACKWING_LAIR, 3, ["alliance"], 150 * M)).toMatch(/^BWL raid #3 might end soon/);
    expect(formatRaidDisbanded(BLACKWING_LAIR, 3).title).toBe("🚫 BWL raid disbanded");
    expect(formatRaidDisbandedWhisper(BLACKWING_LAIR, 3)).toBe("BWL raid #3 disbanded. No buff coming.");
    expect(JSON.stringify(cleared)).not.toContain("Onyxia");
  });

  it("names Nefarian's head on its drop, saved or fresh", () => {
    expect(formatBuffDropped("horde", BLACKWING_LAIR).title).toBe("🎉 Nefarian buff dropped in Orgrimmar");
    expect(formatBuffDropped("horde", BLACKWING_LAIR, true).body).toContain("saved Nefarian head");
    expect(formatBuffDroppedWhisper("alliance", BLACKWING_LAIR)).toBe(
      "The Rallying Cry of the Dragonslayer just dropped in Stormwind (Nefarian head)!",
    );
    expect(formatBuffDroppedWhisper("alliance", ONYXIA)).toContain("(Onyxia head)");
  });
});

describe("formatCapitalStatusYell with both lairs raiding", () => {
  const ony = { zone: ONYXIA, number: 834, elapsedMs: 42 * M, typicalClear: "30-50m" };
  const bwl = { zone: BLACKWING_LAIR, number: 12, elapsedMs: 70 * M, typicalClear: "2h-2h50m" };

  it("tells of a BWL raid alone under its own tag", () => {
    expect(yelled("horde", [bwl])).toMatch(/^\[BWL\] BWL raid in progress \(#12, ~1h10m in, typical clear 2h-2h50m\)/);
  });

  it("lists both raids tersely, tag by tag, ahead of the buff line", () => {
    expect(yelled("horde", [ony, bwl])).toBe(
      `[Onyxia] raid #834 ~42m in, typical 30-50m. [BWL] raid #12 ~1h10m in, typical 2h-2h50m. The Rallying Cry buff may drop soon. Whisper "subscribe" for pings, "discord" for discord notifications.`,
    );
  });

  it("stays within the yell cap at its busiest, dropping the faire line before a raid", () => {
    const busiest = [
      { ...ony, number: 99999, elapsedMs: 135 * M },
      { ...bwl, number: 99999, elapsedMs: 359 * M, typicalClear: "2h10m-2h50m" },
    ];
    const faire = { zone: "Elwynn Forest", ageMs: 6 * 86_400_000 + 23 * 3_600_000, fresh: false };
    const y = yelled("alliance", busiest, faire);
    expect(y.length).toBeLessThanOrEqual(255);
    expect(y).toContain("[BWL]");
    expect(y).toContain("[Onyxia]");
    expect(y).toMatch(/Whisper "subscribe"/);
  });
});
