import { describe, expect, it } from "vitest";
import { GuildLabelStabilizer, classifyGuilds, type RosterMember } from "./guild-label.js";

const members = (spec: Record<string, number>, unguilded = 0, unknown = 0): RosterMember[] => {
  const out: RosterMember[] = [];
  let n = 0;
  for (const [guild, count] of Object.entries(spec)) for (let i = 0; i < count; i += 1) out.push({ name: `p${n++}`, guild });
  for (let i = 0; i < unguilded; i += 1) out.push({ name: `p${n++}`, guild: "" });
  for (let i = 0; i < unknown; i += 1) out.push({ name: `p${n++}`, guild: undefined });
  return out;
};

describe("classifyGuilds", () => {
  it("labels a 60%+ guild by name", () => {
    const c = classifyGuilds(members({ Nightfall: 25 }, 5));
    expect(c).toMatchObject({ kind: "guild", label: "Nightfall", rosterSize: 30 });
  });
  it("85% + 15% is a guild raid", () => {
    expect(classifyGuilds(members({ Nightfall: 34, Stormguard: 6 })).label).toBe("Nightfall");
  });
  it("55% + 45% is a guild-led PUG (largest guild 55%)", () => {
    const c = classifyGuilds(members({ Nightfall: 22, Stormguard: 18 }));
    expect(c).toMatchObject({ kind: "guild-led", label: "Nightfall-led PUG" });
  });
  it("40% + 30% + 30% unguilded is a collaboration, largest first", () => {
    const c = classifyGuilds(members({ Stormguard: 12, Nightfall: 16 }, 12));
    expect(c).toMatchObject({ kind: "collab", label: "Nightfall + Stormguard" });
  });
  it("collaboration needs both guilds >= 25% and combined >= 65%", () => {
    expect(classifyGuilds(members({ A: 14, B: 8 }, 18)).kind).toBe("pug"); // B 20%
    expect(classifyGuilds(members({ A: 11, B: 11 }, 18)).kind).toBe("pug"); // 55% combined
  });
  it("a scatter of small guilds and unguilded players is a PUG", () => {
    expect(classifyGuilds(members({ A: 5, B: 5, C: 5 }, 25)).label).toBe("PUG");
  });
  it("unguilded players are independent: 40 unguilded is a PUG, not a guild", () => {
    expect(classifyGuilds(members({}, 40)).label).toBe("PUG");
  });
  it("too small a roster is Unknown", () => {
    expect(classifyGuilds(members({ Nightfall: 6 }))).toMatchObject({ kind: "unknown", label: "Unknown" });
  });
  it("missing data is not unguilded: a truncated list is Unknown, never PUG", () => {
    const c = classifyGuilds(members({ Nightfall: 8 }, 0, 22));
    expect(c.kind).toBe("unknown");
    expect(c.unguilded).toBe(0);
  });
  it("counts a reconnecting character once", () => {
    const roster = [...members({ Nightfall: 12 }), { name: "p0", guild: "Nightfall" }, { name: "p0", guild: "Nightfall" }];
    expect(classifyGuilds(roster).rosterSize).toBe(12);
  });
  it("thresholds are configurable", () => {
    const rules = { guildShare: 0.5, ledShare: 0.4, collabEachShare: 0.25, collabCombinedShare: 0.65, minRoster: 10, minKnownShare: 0.8, stableReadings: 3 };
    expect(classifyGuilds(members({ Nightfall: 22, Stormguard: 18 }), rules).label).toBe("Nightfall");
  });
});

describe("GuildLabelStabilizer", () => {
  const pug = classifyGuilds(members({ A: 5, B: 5, C: 5 }, 25));
  const guild = classifyGuilds(members({ Nightfall: 25 }, 5));
  it("stays Unknown until a label repeats, then commits", () => {
    const s = new GuildLabelStabilizer();
    expect(s.update(guild).label).toBe("Unknown");
    expect(s.update(guild).label).toBe("Unknown");
    expect(s.update(guild).label).toBe("Nightfall");
  });
  it("does not flip on a one-or-two-reading blip, flips after three", () => {
    const s = new GuildLabelStabilizer();
    for (let i = 0; i < 3; i += 1) s.update(guild);
    expect(s.update(pug).label).toBe("Nightfall");
    expect(s.update(pug).label).toBe("Nightfall");
    expect(s.update(guild).label).toBe("Nightfall"); // streak broken
    expect(s.update(pug).label).toBe("Nightfall");
    expect(s.update(pug).label).toBe("Nightfall");
    expect(s.update(pug).label).toBe("PUG");
  });
});
