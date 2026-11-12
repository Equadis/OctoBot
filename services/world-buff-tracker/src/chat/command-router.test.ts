import { describe, expect, it } from "vitest";
import { InMemorySubscriberStore } from "../subscribers/memory-store.js";
import type { ActiveRaid } from "../watcher/raid-events.js";
import {
  CommandRouter,
  isSubscribeRequest,
  SHUNNED_REPLY,
  UNKNOWN_REPLY,
  type BuffCooldown,
  type LairStatus,
} from "./command-router.js";
import { FAIRE_SITES } from "../darkmoon/location.js";
import type { FaireAnswer } from "../darkmoon/observation.js";

function deps(
  opts: {
    withFeedback?: boolean;
    raidElapsed?: () => number | null;
    raidNumber?: () => number | null;
    /** Lairs past Onyxia's, as the status reads them. */
    otherLairs?: readonly LairStatus[];
    buffCooldowns?: () => Promise<readonly BuffCooldown[]>;
    faireAnswer?: () => FaireAnswer;
    now?: () => number;
    isShunned?: (name: string) => boolean;
    guildInvites?: boolean;
  } = {},
) {
  const store = new InMemorySubscriberStore();
  const active: ActiveRaid[] = []; // the raid(s) the status command sees; a test pushes to make it non-empty
  const feedback: { from: string; text: string }[] = [];
  const subscribed: string[] = [];
  const router = new CommandRouter({
    store,
    lairs: () => [
      { raidName: "Onyxia", raids: active, elapsedMs: opts.raidElapsed?.() ?? null, number: opts.raidNumber?.() ?? null },
      ...(opts.otherLairs ?? []),
    ],
    buffCooldowns: opts.buffCooldowns,
    faireAnswer: opts.faireAnswer,
    now: opts.now,
    isShunned: opts.isShunned,
    areaName: "Onyxia's Lair",
    guildName: "Rage Quit",
    guildInvites: opts.guildInvites ?? true,
    onFeedback: opts.withFeedback === false ? undefined : (from, text) => feedback.push({ from, text }),
    onSubscribe: (name) => subscribed.push(name),
  });
  return { store, active, router, feedback, subscribed };
}

/** The status readout of an in-progress raid — what a lair's raids hold while one is tracked. */
const nightfallRaid: ActiveRaid = { label: "the lair (mostly <Nightfall>)", count: 20, peak: 20 };

describe("isSubscribeRequest", () => {
  it("is true for the exact commands (with a leading !/./ tolerated) and the subscribe intent", () => {
    for (const t of ["subscribe", "sub", "start", "!subscribe", ".sub", "sign me up", "notify me"]) {
      expect(isSubscribeRequest(t)).toBe(true);
    }
  });
  it("is false for other messages", () => {
    for (const t of ["status", "help", "unsubscribe", "when's the buff", "hi", ""]) {
      expect(isSubscribeRequest(t)).toBe(false);
    }
  });
});

describe("CommandRouter", () => {
  it("subscribes a player and is idempotent", async () => {
    const { store, router } = deps();
    expect((await router.handle("Raider", "subscribe"))[0]).toMatch(/subscribed/i);
    expect(await store.has("Raider")).toBe(true);
    expect((await router.handle("Raider", "subscribe"))[0]).toMatch(/already subscribed/);
  });

  it("says how to unsubscribe when confirming, and 'stop' does unsubscribe", async () => {
    const { store, router } = deps();
    expect((await router.handle("Raider", "subscribe"))[0]).toContain(`Whisper "stop" to unsubscribe.`);
    expect((await router.handle("Raider", "stop"))[0]).toMatch(/unsubscribed/i);
    expect(await store.has("Raider")).toBe(false);
  });

  it("confirms a fresh subscribe in one line, without pushing manual faction selection", async () => {
    const { router } = deps();
    const reply = await router.handle("Raider", "subscribe");
    expect(reply).toHaveLength(1); // just the confirmation — the side is auto-detected in the background
    expect(reply[0]).toMatch(/subscribed/i);
    expect(reply[0]).not.toMatch(/alliance|horde|both/i);
  });

  it("unsubscribes a player", async () => {
    const { store, router } = deps();
    await router.handle("Raider", "subscribe");
    expect((await router.handle("Raider", "unsubscribe"))[0]).toMatch(/Unsubscribed/);
    expect(await store.has("Raider")).toBe(false);
  });

  it("fires onSubscribe once for a fresh subscribe (for the lifetime ledger), not on a repeat", async () => {
    const { router, subscribed } = deps();
    await router.handle("Raider", "subscribe");
    await router.handle("Raider", "subscribe"); // already subscribed → no second record
    expect(subscribed).toEqual(["Raider"]);
  });

  it("captures feedback with the sender's name and thanks them", async () => {
    const { router, feedback } = deps();
    const reply = await router.handle("Raider", "feedback the timer felt 5 min late");
    expect(feedback).toEqual([{ from: "Raider", text: "the timer felt 5 min late" }]);
    expect(reply[0]).toMatch(/thanks/i);
  });

  it("accepts 'suggest' as an alias and does not require a subscription", async () => {
    const { store, router, feedback } = deps();
    await router.handle("Raider", "suggest add a horde-only mode");
    expect(await store.has("Raider")).toBe(false); // no subscription needed
    expect(feedback[0]).toEqual({ from: "Raider", text: "add a horde-only mode" });
  });

  it("shows usage and captures nothing when feedback has no message", async () => {
    const { router, feedback } = deps();
    const reply = await router.handle("Raider", "feedback");
    expect(feedback).toEqual([]);
    expect(reply[0]).toMatch(/feedback <your message>/i);
  });

  it("tells the player when feedback isn't wired up", async () => {
    const { router } = deps({ withFeedback: false });
    const reply = await router.handle("Raider", "feedback hi");
    expect(reply[0]).toMatch(/isn't set up/i);
  });

  it("reports the raid #, how long it's been in, and when the buff last dropped on status", async () => {
    const { active, router } = deps({
      raidElapsed: () => 42 * 60_000,
      raidNumber: () => 834,
      buffCooldowns: async () => [
        { faction: "alliance", sinceLastDropMs: null, cooldownRemainingMs: 0 }, // none seen yet
        { faction: "horde", sinceLastDropMs: 72 * 60_000, cooldownRemainingMs: 0 }, // last dropped 1h12m ago
      ],
    });
    active.push(nightfallRaid);
    // "Raider" isn't subscribed and no /who detect is wired here, so both capitals show.
    const reply = await router.handle("Raider", "status");
    // The player count is redundant to a user — omitted. 0 cooldown here → no cooldown wording.
    expect(reply).toEqual(["Onyxia: raid #834, 42m in.", "Rallying Cry: Stormwind none seen yet, Orgrimmar 1h12m ago."]);
  });

  it("reports every watched lair in one line, Onyxia's first", async () => {
    const { router } = deps({
      otherLairs: [{ raidName: "BWL", raids: [nightfallRaid], elapsedMs: 95 * 60_000, number: 12 }],
    });
    const reply = await router.handle("Raider", "status");
    expect(reply[0]).toBe("Onyxia: no raid now. BWL: raid #12, 1h35m in.");
  });

  it("names a Nefarian head on the Rallying Cry line, and leaves Onyxia's unnamed", async () => {
    const { router } = deps({
      buffCooldowns: async () => [
        { faction: "alliance", sinceLastDropMs: 10 * 60_000, cooldownRemainingMs: 0, lastHead: "bwl" },
        { faction: "horde", sinceLastDropMs: 72 * 60_000, cooldownRemainingMs: 0, lastHead: "onyxia" },
      ],
    });
    const reply = await router.handle("Raider", "status");
    expect(reply).toContain("Rallying Cry: Stormwind 10m ago (Nefarian head), Orgrimmar 1h12m ago.");
  });

  it.each(["shtatus", "/shtatus", "SHTATUS"])("answers the drunk spelling %s as status", async (text) => {
    const { active, router } = deps({ raidElapsed: () => 42 * 60_000, raidNumber: () => 834 });
    active.push(nightfallRaid);
    expect(await router.handle("Raider", text)).toEqual(await router.handle("Raider", "status"));
  });

  it("keeps the drunk spelling out of the help reply", async () => {
    const { router } = deps();
    expect((await router.handle("Raider", "help")).join(" ")).not.toMatch(/shtatus/i);
  });

  it("reports the cooldown wait when a server buff cooldown is configured and active", async () => {
    const { active, router } = deps({
      buffCooldowns: async () => [
        { faction: "alliance", sinceLastDropMs: 10 * 60_000, cooldownRemainingMs: 0 }, // off cooldown
        { faction: "horde", sinceLastDropMs: 5 * 60_000, cooldownRemainingMs: 25 * 60_000 }, // 25m to go
      ],
    });
    active.push(nightfallRaid);
    const reply = (await router.handle("Raider", "status")).join(" ");
    expect(reply).toContain("Rallying Cry: Stormwind 10m ago, Orgrimmar on cooldown for 25m.");
  });

  it("shows only the subscriber's own side's last drop, not both", async () => {
    const { store, router } = deps({
      buffCooldowns: async () => [
        { faction: "alliance", sinceLastDropMs: null, cooldownRemainingMs: 0 },
        { faction: "horde", sinceLastDropMs: 72 * 60_000, cooldownRemainingMs: 0 },
      ],
    });
    await store.add("Raider");
    await store.update("Raider", { factions: ["horde"] }); // subscribed on the horde side
    const reply = await router.handle("Raider", "status");
    expect(reply).toContain("Rallying Cry: 1h12m ago."); // their capital, so no city named
    expect(reply.join(" ")).not.toMatch(/Stormwind/); // never the other side
  });

  it("detects a non-subscriber's side via /who and shows only that capital", async () => {
    const { router } = deps({
      buffCooldowns: async () => [
        { faction: "alliance", sinceLastDropMs: null, cooldownRemainingMs: 0 },
        { faction: "horde", sinceLastDropMs: 72 * 60_000, cooldownRemainingMs: 0 },
      ],
    });
    router.setFactionDetect(async () => "alliance"); // /who resolves them to alliance
    const reply = await router.handle("Ghost", "status");
    expect(reply).toContain("Rallying Cry: none seen yet."); // Stormwind's
    expect(reply.join(" ")).not.toMatch(/Orgrimmar/);
  });

  it("subscribe via a listener sets the side from the hint, with NO /who lookup", async () => {
    const { store, router } = deps();
    let lookups = 0;
    router.setFactionLookup(() => (lookups += 1));
    await router.handle("Raider", "subscribe", "horde"); // came through the horde listener
    const sub = await store.get("Raider");
    expect(sub?.factions).toEqual(["horde"]);
    expect(sub?.factionSource).toBe("auto"); // resolved, not a manual choice
    expect(lookups).toBe(0); // the certain hint made the /who unnecessary
  });

  it("an explicit alliance/horde/both command marks the side as MANUAL", async () => {
    const { store, router } = deps();
    await router.handle("Raider", "subscribe", "horde");
    await router.handle("Raider", "both"); // deliberate choice
    const sub = await store.get("Raider");
    expect(sub?.factions).toEqual(["alliance", "horde"]);
    expect(sub?.factionSource).toBe("manual");
  });

  describe("retroactive re-resolve (the both-faction backlog)", () => {
    it("narrows a both-faction subscriber to the listener's side on a later contact", async () => {
      const { store, router } = deps();
      await router.handle("Raider", "subscribe"); // direct whisper, no side → both default
      expect((await store.get("Raider"))?.factions).toEqual(["alliance", "horde"]);
      await router.handle("Raider", "status", "horde"); // later, via the horde listener
      const sub = await store.get("Raider");
      expect(sub?.factions).toEqual(["horde"]);
      expect(sub?.factionSource).toBe("auto");
    });

    it("does NOT override a deliberate 'both' (manual) choice", async () => {
      const { store, router } = deps();
      await router.handle("Raider", "subscribe", "alliance");
      await router.handle("Raider", "both"); // manual both
      await router.handle("Raider", "status", "horde"); // contact via horde listener
      expect((await store.get("Raider"))?.factions).toEqual(["alliance", "horde"]); // untouched
    });

    it("leaves an already-resolved single side alone", async () => {
      const { store, router } = deps();
      await router.handle("Raider", "subscribe", "alliance"); // resolved to alliance (auto)
      await router.handle("Raider", "status", "horde"); // contact via the OTHER listener
      expect((await store.get("Raider"))?.factions).toEqual(["alliance"]); // not flipped
    });

    it("does nothing for a non-subscriber or a direct (no-listener) contact", async () => {
      const { store, router } = deps();
      await router.handle("Ghost", "status", "horde"); // not subscribed
      expect(await store.get("Ghost")).toBeNull();
    });
  });

  it("subscribe with no hint (a direct whisper) still falls back to the /who lookup", async () => {
    const { router } = deps();
    const looked: string[] = [];
    router.setFactionLookup((name) => looked.push(name));
    await router.handle("Raider", "subscribe"); // no source faction
    expect(looked).toEqual(["Raider"]);
  });

  it("a natural-language subscribe through a listener also uses the hint, no /who", async () => {
    const { store, router } = deps();
    let lookups = 0;
    router.setFactionLookup(() => (lookups += 1));
    await router.handle("Raider", "hey sign me up", "alliance");
    expect((await store.get("Raider"))?.factions).toEqual(["alliance"]);
    expect(lookups).toBe(0);
  });

  it("status for a non-subscriber uses the listener hint instead of a /who", async () => {
    const { router } = deps({
      buffCooldowns: async () => [
        { faction: "alliance", sinceLastDropMs: null, cooldownRemainingMs: 0 },
        { faction: "horde", sinceLastDropMs: 72 * 60_000, cooldownRemainingMs: 0 },
      ],
    });
    let detects = 0;
    router.setFactionDetect(async () => {
      detects += 1;
      return "alliance";
    });
    const reply = await router.handle("Ghost", "status", "horde");
    expect(reply).toContain("Rallying Cry: 1h12m ago."); // the hinted side — Orgrimmar's
    expect(detects).toBe(0); // hint used, the /who was skipped
  });

  it("status without a raid still reports when the buff last dropped", async () => {
    const { router } = deps({
      buffCooldowns: async () => [
        { faction: "alliance", sinceLastDropMs: null, cooldownRemainingMs: 0 },
        { faction: "horde", sinceLastDropMs: null, cooldownRemainingMs: 0 },
      ],
    });
    const reply = await router.handle("Raider", "status");
    // Never "drop now": the next raid could be many hours away, so an imminent CTA would mislead.
    expect(reply).toEqual(["Onyxia: no raid now.", "Rallying Cry: Stormwind none seen yet, Orgrimmar none seen yet."]);
  });

  it("understands natural phrasing: 'sign me up' subscribes", async () => {
    const { store, router } = deps();
    const reply = (await router.handle("Raider", "hey can you sign me up"))[0];
    expect(reply).toMatch(/subscribed/i);
    expect(await store.has("Raider")).toBe(true);
  });

  it("answers a guild question with a plain invite offer — no guild name, no recruiting pitch", async () => {
    const { router } = deps();
    const reply = (await router.handle("Raider", "how do I join?"))[0];
    expect(reply).toMatch(/invite/i); // offers the guild-invite command
    expect(reply).toMatch(/subscribe/i); // and buff alerts
    expect(reply).not.toMatch(/Rage Quit|recruit/i); // guild attribution removed
  });

  it("offers no guild invite while switched off: no command, no help line, no offer to a guild question", async () => {
    const { router } = deps({ guildInvites: false });
    const invited: string[] = [];
    router.setGuildInvite((name) => invited.push(name));
    for (const text of ["ginvite", "guildinvite", "/ginvite", "how do I join?", "are you recruiting"]) {
      expect(await router.handle("Raider", text)).toEqual([UNKNOWN_REPLY]);
    }
    expect(invited).toEqual([]);
    const help = await router.handle("Raider", "help");
    expect(help.some((line) => /^ginvite\b/i.test(line))).toBe(false);
    expect(help.join(" ")).not.toMatch(/Rage Quit/);
    expect(help.join(" ")).toMatch(/discord - alerts on Discord are instant/); // the rest of help is unchanged
  });

  it("guild-invites SILENTLY on 'ginvite' when wired (no confirmation), else says it can't", async () => {
    const { router } = deps();
    expect((await router.handle("Raider", "ginvite"))[0]).toMatch(/can't send a guild invite/i);
    const invited: string[] = [];
    router.setGuildInvite((name) => invited.push(name));
    const reply = await router.handle("Raider", "ginvite");
    expect(invited).toEqual(["Raider"]); // invited
    expect(reply).toEqual([]); // and NOT told "I sent you" — welcome happens in /g on join
    router.setGuildInvite(null);
    expect((await router.handle("Raider", "ginvite"))[0]).toMatch(/can't send a guild invite/i);
  });

  it("answers 'guildinvite' and '/ginvite' as 'ginvite' does, but no longer a bare 'invite' or 'join'", async () => {
    const { router } = deps();
    const invited: string[] = [];
    router.setGuildInvite((name) => invited.push(name));
    for (const text of ["guildinvite", "/ginvite", "GINVITE"]) await router.handle("Raider", text);
    expect(invited).toEqual(["Raider", "Raider", "Raider"]);
    for (const text of ["invite", "join"]) expect(await router.handle("Raider", text)).toEqual([UNKNOWN_REPLY]);
    expect(invited).toHaveLength(3);
  });

  it("answers a buff question with a subscribe nudge", async () => {
    const { router } = deps();
    const reply = (await router.handle("Raider", "when's the buff coming?"))[0];
    expect(reply).toMatch(/Rallying Cry/i);
    expect(reply).toMatch(/subscribe/i);
  });

  it("answers what it doesn't understand with one short line pointing at help", async () => {
    const { router } = deps();
    for (const text of ["qwzx blorp", "youre late", "dropped 2M ago"]) {
      expect(await router.handle("Raider", text)).toEqual([UNKNOWN_REPLY]);
    }
    expect(UNKNOWN_REPLY).toMatch(/"help"/);
  });

  it("routes a natural-language suggestion to feedback, keeping the whole message", async () => {
    const { router, feedback } = deps();
    const reply = await router.handle("Raider", "you should add a horde-only mode");
    expect(feedback[0]).toEqual({ from: "Raider", text: "you should add a horde-only mode" });
    expect(reply[0]).toMatch(/thanks/i);
  });

  it("answers a natural-language Discord question by sharing the invite (when set)", async () => {
    const withInvite = new CommandRouter({
      store: new InMemorySubscriberStore(),
      lairs: () => [],
      areaName: "Onyxia's Lair",
      guildName: "Rage Quit",
      guildInvites: true,
      discordInvite: "https://discord.gg/abc",
    });
    expect((await withInvite.handle("Raider", "whats your discord?")).join(" ")).toContain("https://discord.gg/abc");
  });

  it("acknowledges a thank-you warmly", async () => {
    const { router } = deps();
    expect((await router.handle("Raider", "thanks so much!"))[0]).toMatch(/welcome/i);
  });

  it("no longer has a 'notify' command — it falls through to the one-line fallback", async () => {
    const { router } = deps();
    expect(await router.handle("Raider", "notify forming off")).toEqual([UNKNOWN_REPLY]);
  });

  it("shares the Discord invite link on 'discord', or says it's not set", async () => {
    const withInvite = new CommandRouter({
      store: new InMemorySubscriberStore(),
      lairs: () => [],
      areaName: "Onyxia's Lair",
      guildName: "Rage Quit",
      guildInvites: true,
      discordInvite: "https://discord.gg/abc",
    });
    const reply = (await withInvite.handle("Raider", "discord")).join(" ");
    expect(reply).toContain("https://discord.gg/abc");
    expect(reply).toMatch(/outside the game/i); // says what Discord is for
    expect(reply).not.toMatch(/home of|Rage Quit/i); // no guild attribution
    // No invite configured → it says so, and never the old linking/ID flow.
    const bare = (await deps().router.handle("Raider", "discord")).join(" ");
    expect(bare).toMatch(/don't have a Discord invite/i);
    expect(bare).not.toMatch(/\/link|user id|whisper.*code/i);
  });

  it("sets the subscriber's side with alliance / horde / both", async () => {
    const { store, router } = deps();
    await router.handle("Raider", "subscribe");
    expect((await store.get("Raider"))?.factions).toEqual(["alliance", "horde"]); // default both
    expect((await router.handle("Raider", "horde"))[0]).toMatch(/Orgrimmar/i);
    expect((await store.get("Raider"))?.factions).toEqual(["horde"]);
    expect((await router.handle("Raider", "alliance"))[0]).toMatch(/Stormwind/i);
    expect((await store.get("Raider"))?.factions).toEqual(["alliance"]);
    expect((await router.handle("Raider", "both"))[0]).toMatch(/both/i);
    expect((await store.get("Raider"))?.factions).toEqual(["alliance", "horde"]);
  });

  it("the side words still work as an override but need a subscription", async () => {
    const { router } = deps();
    expect((await router.handle("Ghost", "alliance"))[0]).toMatch(/not subscribed/i);
  });

  it("has dropped 'profile' and 'faction' — they fall through to the one-line fallback", async () => {
    const { router } = deps();
    await router.handle("Raider", "subscribe");
    for (const msg of ["profile", "faction", "flibber"]) {
      expect(await router.handle("Raider", msg)).toEqual([UNKNOWN_REPLY]);
    }
  });

  it("gives the same help for 'options', 'settings', 'more', 'commands' and '?'", async () => {
    const { router } = deps();
    const help = await router.handle("Raider", "help");
    for (const word of ["options", "settings", "more", "commands", "?", "Settings"]) {
      expect(await router.handle("Raider", word)).toEqual(help);
    }
  });

  it("keeps 'no more' an unsubscribe, not a request for help", async () => {
    const { store, router } = deps();
    await router.handle("Raider", "subscribe");
    expect((await router.handle("Raider", "no more"))[0]).toMatch(/unsubscribed/i);
    expect(await store.has("Raider")).toBe(false);
  });

  it("help is concise: status first, invite last, one command per line, no profile/faction/notify", async () => {
    const { router } = deps();
    const lines = await router.handle("Raider", "help");
    expect(lines[0]).toMatch(/^status/i); // status first
    expect(lines[lines.length - 1]).toMatch(/^ginvite - join <Rage Quit>/); // guild invite last
    const help = lines.join(" ");
    expect(help).toMatch(/subscribe \/ unsubscribe/);
    // Says why Discord: in-game whispers are throttled and can lag; Discord is not.
    expect(lines).toContain("discord - alerts on Discord are instant; in-game whispers can lag");
    expect(help).toMatch(/feedback/i);
    expect(help).toMatch(/alliance \/ horde \/ both/); // pick which capital's alerts
    expect(help).not.toMatch(/profile|notify|\bfaction\b/i);
  });
});

describe("CommandRouter darkmoon", () => {
  const NOW = Date.parse("2026-09-17T12:00:00Z");
  const answer = (over: Partial<Extract<FaireAnswer, { known: true }>> = {}): FaireAnswer => ({
    known: true,
    location: "mulgore",
    site: FAIRE_SITES.mulgore,
    observedAt: NOW - 240_000,
    source: "sighting",
    witness: "Someplayer",
    fresh: true,
    ...over,
  });
  const faireDeps = (a: FaireAnswer = answer()) => deps({ faireAnswer: () => a, now: () => NOW });

  it("ends the status with where the faire is", async () => {
    const { router } = faireDeps();
    const reply = await router.handle("Raider", "status");
    expect(reply[reply.length - 1]).toBe("Darkmoon Faire: Mulgore, seen 4m ago.");
  });

  it("leaves the faire out of the status while nobody has spotted it", async () => {
    const { router } = faireDeps({ known: false });
    const reply = (await router.handle("Raider", "status")).join(" ");
    expect(reply).not.toMatch(/Darkmoon/);
  });

  it("answers where the faire was last seen, in one line", async () => {
    const { router } = faireDeps();
    const reply = await router.handle("Raider", "darkmoon");
    expect(reply).toHaveLength(1);
    expect(reply[0]).toBe("Darkmoon Faire is in Mulgore (below Thunder Bluff) - seen 4m ago.");
  });

  it("answers to the phrasing PizzaWorldBuffs own bot uses", async () => {
    const { router } = faireDeps();
    for (const text of ["dmf", "dmf where", "faire", "/darkmoon", "!dmf", "DARKMOON"]) {
      expect((await router.handle("Raider", text))[0]).toMatch(/Darkmoon Faire/);
    }
  });

  it("answers a natural-language question about the faire", async () => {
    const { router } = faireDeps();
    for (const text of ["where is the darkmoon faire?", "dark moon fairy?", "is dmf up"]) {
      expect((await router.handle("Raider", text))[0]).toMatch(/Darkmoon Faire/);
    }
  });

  it("does not let a faire question fall through to the buff answer", async () => {
    const { router } = faireDeps();
    const reply = await router.handle("Raider", "darkmoon buff?");
    expect(reply[0]).toMatch(/Darkmoon Faire/);
    expect(reply[0]).not.toMatch(/Rallying Cry/);
  });

  it("says so plainly when the faire tracker is not wired", async () => {
    const { router } = deps();
    const reply = await router.handle("Raider", "darkmoon");
    expect(reply).toHaveLength(1);
    expect(reply[0]).toMatch(/not tracking the Darkmoon Faire/i);
    expect(reply[0]).not.toMatch(/Mulgore|Elwynn/);
  });

  it("passes through that a look is too old to trust", async () => {
    const { router } = faireDeps(answer({ fresh: false }));
    expect((await router.handle("Raider", "darkmoon"))[0]).toMatch(/was last seen/);
  });

  it("admits it does not know, rather than naming a zone", async () => {
    const { router } = faireDeps({ known: false });
    expect((await router.handle("Raider", "darkmoon"))[0]).toMatch(/don.t know where/);
  });
});

describe("CommandRouter and a player on the wall of shame", () => {
  const shunned = (name: string): boolean => name.toLowerCase() === "ganker";

  it("refuses every command, and says why", async () => {
    for (const text of ["subscribe", "sign me up", "discord", "status", "help", "invite", "feedback let me back", "hi"]) {
      const { router, store, subscribed, feedback } = deps({ isShunned: shunned, now: () => 0 });
      expect(await router.handle("Ganker", text)).toEqual([SHUNNED_REPLY]);
      expect(await store.has("Ganker")).toBe(false);
      expect(subscribed).toEqual([]);
      expect(feedback).toEqual([]);
    }
  });

  it("says it once a day, and nothing in between", async () => {
    let now = 0;
    const { router } = deps({ isShunned: shunned, now: () => now });
    expect(await router.handle("Ganker", "subscribe")).toEqual([SHUNNED_REPLY]);
    now += 60_000;
    expect(await router.handle("Ganker", "subscribe")).toEqual([]);
    expect(await router.handle("Ganker", "status")).toEqual([]);
    now += 24 * 60 * 60_000;
    expect(await router.handle("Ganker", "status")).toEqual([SHUNNED_REPLY]);
  });

  it("serves everyone else as before", async () => {
    const { router, store } = deps({ isShunned: shunned, now: () => 0 });
    expect((await router.handle("Raider", "subscribe"))[0]).toMatch(/subscribed/i);
    expect(await store.has("Raider")).toBe(true);
  });

  it("fits the refusal in one whisper", () => {
    expect(SHUNNED_REPLY.length).toBeLessThanOrEqual(255);
  });
});
