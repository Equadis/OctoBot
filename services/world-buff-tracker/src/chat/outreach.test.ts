import { describe, expect, it } from "vitest";
import { silentLogger } from "../logger.js";
import { Outreach, introLines } from "./outreach.js";
import { InMemoryIntroStore } from "./intro-store.js";
import type { Faction } from "../subscribers/store.js";

const config = {
  guildName: "Rage Quit",
  community: "OctoWoW",
};

describe("introLines", () => {
  it("introduces itself, says what it does, and points at subscribe/help", () => {
    const [who] = introLines(config);
    expect(who).toMatch(/world-?buff tracker/i);
    expect(who).toContain("Rallying Cry");
    expect(who).toMatch(/subscribe/i);
    expect(who).toMatch(/"help" for more/);
  });

  it("then says it knows where the Darkmoon Faire is, and how to ask", () => {
    const [, faire] = introLines(config);
    expect(faire).toMatch(/Darkmoon Faire/);
    expect(faire).toMatch(/whisper "darkmoon"/);
  });

  it("attributes to the guild for the community, but recruits for nothing and offers no invite", () => {
    const lines = introLines(config).join(" ");
    expect(lines).toContain("Rage Quit"); // the guild running it
    expect(lines).toContain("OctoWoW"); // the community it serves
    expect(lines).not.toMatch(/recruit|invite/i);
  });

  it("is two whispers, each under the client's line limit, with no tips", () => {
    const lines = introLines(config);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(255);
      expect(line).not.toMatch(/gold|tip/i);
    }
  });
});

describe("Outreach", () => {
  function make(cfg = config, subscribed: string[] = [], shunned: string[] = []) {
    const whispers: { to: string; msg: string }[] = [];
    const routed: { sender: string; text: string }[] = [];
    const hints: (Faction | null)[] = [];
    const subs = new Set(subscribed.map((n) => n.toLowerCase()));
    const outcasts = new Set(shunned.map((n) => n.toLowerCase()));
    const outreach = new Outreach(
      cfg,
      async (name) => subs.has(name.toLowerCase()),
      (name) => outcasts.has(name.toLowerCase()),
      new InMemoryIntroStore(),
      silentLogger,
    );
    outreach.setChannel((to, msg) => whispers.push({ to, msg }));
    outreach.setHandler(async (sender, text, sourceFaction) => {
      routed.push({ sender, text });
      hints.push(sourceFaction);
      return [`reply to ${text}`];
    });
    return { outreach, whispers, routed, hints, subs };
  }

  const isIntro = (msg: string): boolean => /world-buff tracker/i.test(msg);

  it("answers a non-subscriber FIRST, then introduces itself as a follow-up", async () => {
    const { outreach, whispers, routed } = make();
    await outreach.onListenerContact("Raider", "discord"); // a specific request
    const msgs = whispers.map((w) => w.msg);
    expect(msgs).toContain("reply to discord"); // their answer
    expect(msgs.some((m) => isIntro(m))).toBe(true); // the onboarding intro
    expect(msgs.some((m) => /whisper "subscribe"/i.test(m))).toBe(true); // still pitches subscribe
    // the answer leads; the intro follows so it never buries what they asked for
    expect(msgs.indexOf("reply to discord")).toBeLessThan(msgs.findIndex((m) => isIntro(m)));
    expect(routed).toEqual([{ sender: "Raider", text: "discord" }]);
  });

  it("a first-contact subscribe gets the confirmation alone — no intro, no follow-up", async () => {
    const { outreach, whispers } = make();
    await outreach.onListenerContact("Raider", "subscribe", "horde"); // their FIRST message is subscribe
    expect(whispers.map((w) => w.msg)).toEqual(["reply to subscribe"]); // the mock stands in for "You're subscribed!"
  });

  it("a first contact that is not a subscribe gets its answer and the two intro lines, nothing more", async () => {
    const { outreach, whispers } = make();
    await outreach.onListenerContact("Raider", "hi", "horde");
    expect(whispers.map((w) => w.msg)).toEqual(["reply to hi", ...introLines(config)]);
  });

  it("the confirmation reply is identical whether they subscribe first or after a 'hey'", async () => {
    const confirm = (w: { to: string; msg: string }[]): string[] =>
      w.map((x) => x.msg).filter((m) => m === "reply to subscribe");

    const direct = make(); // first message is subscribe
    await direct.outreach.onListenerContact("Raider", "subscribe", "horde");

    const staged = make(); // "hey" then "subscribe"
    await staged.outreach.onListenerContact("Other", "hey", "horde");
    await staged.outreach.onListenerContact("Other", "subscribe", "horde");

    expect(confirm(direct.whispers)).toEqual(["reply to subscribe"]);
    expect(confirm(staged.whispers)).toEqual(["reply to subscribe"]); // same single confirmation
  });

  it("forwards the listener's faction to the command engine as the source hint", async () => {
    const { outreach, hints } = make();
    await outreach.onListenerContact("Raider", "subscribe", "horde"); // horde listener
    expect(hints).toEqual(["horde"]);
  });

  it("forwards a null hint when the listener has no faction configured", async () => {
    const { outreach, hints } = make();
    await outreach.onListenerContact("Raider", "subscribe"); // no faction passed
    expect(hints).toEqual([null]);
  });

  it("introduces itself ONCE, then keeps answering without re-introducing", async () => {
    const { outreach, whispers, routed } = make();
    await outreach.onListenerContact("Raider", "hi");
    await outreach.onListenerContact("RAIDER", "yo"); // case-insensitive, still not subscribed
    expect(whispers.filter((w) => isIntro(w.msg)).length).toBe(1); // intro only the FIRST time
    expect(routed.map((r) => r.text)).toEqual(["hi", "yo"]); // but both routed and answered
  });

  it("does NOT greet a subscriber, but still routes and answers", async () => {
    const { outreach, whispers, routed } = make(config, ["Raider"]); // Raider is subscribed
    await outreach.onListenerContact("Raider", "status");
    expect(whispers.some((w) => isIntro(w.msg))).toBe(false); // no intro for a subscriber
    expect(whispers.some((w) => w.msg === "reply to status")).toBe(true); // still answered
    expect(routed).toEqual([{ sender: "Raider", text: "status" }]);
  });

  it("does nothing while the watcher channel is unavailable, then works once it is", async () => {
    const whispers: string[] = [];
    const routed: string[] = [];
    const outreach = new Outreach(config, async () => false, () => false, new InMemoryIntroStore(), silentLogger);
    outreach.setHandler(async (_s, t) => {
      routed.push(t);
      return ["ok"];
    });
    await outreach.onListenerContact("Raider", "hi"); // no channel → not greeted, not routed
    expect(whispers).toEqual([]);
    expect(routed).toEqual([]);
    outreach.setChannel((_to, msg) => whispers.push(msg));
    await outreach.onListenerContact("Raider", "hi");
    expect(routed).toEqual(["hi"]);
    expect(whispers).toContain("ok");
  });

  it("never greets a player on the wall of shame — only the engine's answer goes back", async () => {
    const { outreach, whispers, routed } = make(config, [], ["Ganker"]);
    await outreach.onListenerContact("Ganker", "hi", "horde");
    expect(routed).toEqual([{ sender: "Ganker", text: "hi" }]); // the engine refuses them
    expect(whispers.map((w) => w.msg)).toEqual(["reply to hi"]); // no intro
  });
});
