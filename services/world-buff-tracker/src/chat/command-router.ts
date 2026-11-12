import {
  DEFAULT_FACTIONS,
  isFaction,
  needsFactionResolution,
  subscriberKey,
  type Faction,
  type SubscriberStore,
} from "../subscribers/store.js";
import type { ActiveRaid } from "../watcher/raid-events.js";
import { RAID_ZONES, type RaidZoneId } from "../watcher/raid-zone.js";
import { CITY_FOR, humanClock, withUnsubscribeHint } from "../notify/format.js";
import { parseIntent, type Intent } from "./intent.js";
import { formatFaire, formatFaireBrief } from "../darkmoon/format.js";
import type { FaireAnswer } from "../darkmoon/observation.js";

/** The exact words that subscribe a caller (also handled in `handle`'s switch). */
const SUBSCRIBE_COMMANDS = new Set(["subscribe", "sub", "start"]);

/** Whether a whisper is a request to subscribe — the exact command, or a natural-language
 *  subscribe intent. Lets the onboarding skip the "whisper subscribe" pitch for a caller who is
 *  already subscribing in the same breath (telling a subscriber to subscribe reads as a bug). */
export function isSubscribeRequest(text: string): boolean {
  const command = text.trim().replace(/^[!./]+/, "").split(/\s+/)[0]?.toLowerCase() ?? "";
  if (SUBSCRIBE_COMMANDS.has(command)) return true;
  return parseIntent(text) === "subscribe";
}

/** Per-faction buff-drop info for the status query. */
export interface BuffCooldown {
  readonly faction: Faction;
  /** ms since the last recorded Rallying Cry drop in this faction's capital, or null if none seen. */
  readonly sinceLastDropMs: number | null;
  /** ms until a fresh Rallying Cry can drop again for this side, or 0 when off cooldown / when the
   *  server has no cooldown configured (a buff drops on any clear). */
  readonly cooldownRemainingMs: number;
  /** Whose head the last drop came from — named in the status when it was Nefarian's. Undefined = none
   *  seen (or Onyxia's, the default). */
  readonly lastHead?: RaidZoneId;
}

/** One watched lair's raid in progress, for the status command. */
export interface LairStatus {
  /** The raid's short name: "Onyxia", "BWL". */
  readonly raidName: string;
  /** Raids in progress there — read when no raid number is known yet. */
  readonly raids: readonly ActiveRaid[];
  /** How long the raid in progress has been in the lair (form → now), or null if none. */
  readonly elapsedMs: number | null;
  /** The raid in progress's reference number, or null if none. */
  readonly number: number | null;
}

/** A lair's part of the status: its raid in progress, or that there is none. */
function lairStatusText(lair: LairStatus): string {
  if (lair.raids.length === 0 && lair.number === null) return `${lair.raidName}: no raid now.`;
  const id = lair.number !== null ? `raid #${lair.number}` : lair.raids.map((raid) => raid.label).join(", ");
  return `${lair.raidName}: ${id}${lair.elapsedMs !== null ? `, ${humanClock(lair.elapsedMs)} in` : ""}.`;
}

/** A side's Rallying Cry in the status: the wait while a cooldown is set and running, else how long ago
 *  the last one dropped. */
function rallyingCryState(cd: BuffCooldown): string {
  if (cd.cooldownRemainingMs > 0) return `on cooldown for ${humanClock(cd.cooldownRemainingMs)}`;
  if (cd.sinceLastDropMs === null) return "none seen yet";
  // Onyxia's head is the usual one; only a Nefarian head is worth the words.
  const head = cd.lastHead && cd.lastHead !== "onyxia" ? ` (${RAID_ZONES[cd.lastHead].boss} head)` : "";
  return `${humanClock(cd.sinceLastDropMs)} ago${head}`;
}

/** A reader-friendly name for a set of subscribed sides. */
export function factionLabel(factions: readonly Faction[]): string {
  const set = new Set(factions);
  if (set.has("alliance") && set.has("horde")) return "both Stormwind & Orgrimmar";
  if (set.has("alliance")) return "Stormwind (Alliance)";
  if (set.has("horde")) return "Orgrimmar (Horde)";
  return "no";
}

/**
 * Routes a whisper from a player to a command and produces the reply line(s) to
 * whisper back. Pure aside from the injected store; terse because a whisper
 * is length-limited and a chatty bot is a reported bot.
 *
 * Commands (case-insensitive, a leading !/./ tolerated):
 *   subscribe | sub | start        — opt in to in-game raid alerts
 *   unsubscribe | unsub | stop      — opt out
 *   alliance | horde | both         — which side's buff you want
 *   ginvite | guildinvite           — guild-invite the caller (while switched on)
 *   feedback | suggest              — send a message to the team
 *   discord                         — share the community Discord invite link
 *   darkmoon | dmf | faire          — where the Darkmoon Faire was last seen
 *   status | profile | help
 */
export interface CommandDeps {
  readonly store: SubscriberStore;
  /** Each watched lair's raid in progress, Onyxia's first — for the status command. */
  readonly lairs: () => readonly LairStatus[];
  readonly areaName: string;
  /** The guild the "ginvite" help line names ("join <guild>"). */
  readonly guildName: string;
  /** Whether the bot hands out guild invites. Off, "ginvite"/"guildinvite" are no command, help leaves the
   *  line out, and a guild question is not answered with an offer. */
  readonly guildInvites: boolean;
  /** The community Discord server invite link, shared by the "discord" command.
   *  Null/undefined = not configured, and the command says so. */
  readonly discordInvite?: string | null;
  /** Receives a player's "feedback"/"suggest" message (sender + text). Fire-and-forget:
   *  the caller persists it and posts it to the feedback channel. Undefined = no-op. */
  readonly onFeedback?: (from: string, text: string) => void;
  /** Fired (fire-and-forget) when a player newly subscribes, so the caller can record them in
   *  the lifetime user ledger — a total that survives a later unsubscribe. Undefined = no-op. */
  readonly onSubscribe?: (name: string) => void;
  /** Per-faction buff cooldown for status — how long until a fresh Rallying Cry can drop. */
  readonly buffCooldowns?: () => Promise<readonly BuffCooldown[]>;
  /** Where the Darkmoon Faire is, for the "darkmoon" command. Undefined = the tracker isn't
   *  wired and the command says so instead of answering from a guess. */
  readonly faireAnswer?: () => FaireAnswer;
  /** Injectable clock, so the faire answer's "seen 4m ago" is testable. Defaults to Date.now. */
  readonly now?: () => number;
  /** Whether a player is on the wall of shame for killing a bot listener. The bot does nothing for
   *  them — no command, no subscription — and only tells them why. Undefined = nobody is. */
  readonly isShunned?: (name: string) => boolean;
}

/** What a player on the wall of shame is told, instead of an answer. */
/** The one answer to a message that is no command and no question we recognise. */
export const UNKNOWN_REPLY = `Not sure what you mean - whisper "help" for commands.`;

export const SHUNNED_REPLY =
  "You killed one of my listeners, so you're on the wall of shame. I won't answer you or send you buff alerts anymore.";

/** A shunned player hears the refusal at most this often — however much they whisper, the bot
 *  does not keep talking to them. */
const SHUNNED_REPLY_INTERVAL_MS = 24 * 60 * 60_000;

export class CommandRouter {
  readonly #deps: CommandDeps;
  // Guild invites can only be sent by the connected watcher, which registers this
  // when it reaches world and clears it on disconnect. Null = can't invite right now.
  #guildInvite: ((name: string) => void) | null = null;
  // The watcher registers a /who-based faction detector; fired (fire-and-forget) when a
  // new subscriber is added, to auto-set their side. Null = detection unavailable.
  #factionLookup: ((name: string) => void) | null = null;
  // The watcher registers a /who that RESOLVES a player's faction — used to tailor the
  // status to a non-subscriber's side. Null = detection unavailable (falls back to both).
  #factionDetect: ((name: string) => Promise<Faction | null>) | null = null;
  /** When each shunned player was last told why (by name key), so the refusal is not repeated. */
  readonly #refusedAt = new Map<string, number>();

  constructor(deps: CommandDeps) {
    this.#deps = deps;
  }

  /** The watcher offers/withdraws its guild-invite capability as it connects/drops. */
  setGuildInvite(fn: ((name: string) => void) | null): void {
    this.#guildInvite = fn;
  }

  /** The watcher offers/withdraws /who-based faction detection as it connects/drops. */
  setFactionLookup(fn: ((name: string) => void) | null): void {
    this.#factionLookup = fn;
  }

  /** The watcher offers/withdraws a /who that resolves a player's faction, for the status. */
  setFactionDetect(fn: ((name: string) => Promise<Faction | null>) | null): void {
    this.#factionDetect = fn;
  }

  /**
   * `sourceFaction` is the caller's side when it can be trusted without a lookup — set when the
   * player reached us through a faction-specific listener. That listener lives in and yells from
   * one faction's capital, so its whisperers are that faction in practice (a safe assumption even
   * on a cross-faction realm where a whisper could technically cross). It lets subscribe/status
   * skip the /who; null means fall back to a lookup.
   */
  async handle(sender: string, text: string, sourceFaction: Faction | null = null): Promise<string[]> {
    // Before anything else — a player who killed a listener gets nothing done for them.
    if (this.#deps.isShunned?.(sender)) return this.#refuse(sender);
    // Retroactively resolve a both-faction subscriber's side from the listener they came through,
    // before answering — so the reply (and any alerts) reflect their real side from now on.
    await this.#reResolveFaction(sender, sourceFaction);
    const parts = text.trim().replace(/^[!./]+/, "").split(/\s+/);
    const command = (parts[0] ?? "").toLowerCase();
    const { store, areaName } = this.#deps;

    switch (command) {
      case "subscribe":
      case "sub":
      case "start": {
        const added = await store.add(sender);
        // Set their side: from the listener they came through if we know it (certain, no /who),
        // else a best-effort /who (a custom race or being offline leaves them on both).
        if (added) {
          await this.#autoSetFaction(sender, sourceFaction);
          this.#deps.onSubscribe?.(sender); // record in the lifetime user ledger
        }
        return added
          ? [withUnsubscribeHint(`You're subscribed! I'll ping you in-game when a raid clears and the Rallying Cry is about to drop.`)]
          : [`You're already subscribed to ${areaName} alerts. "help" for more.`];
      }
      case "unsubscribe":
      case "unsub":
      case "stop": {
        const removed = await store.remove(sender);
        return [
          removed
            ? `Unsubscribed - no more ${areaName} alerts. Whisper "subscribe" to opt back in.`
            : `You weren't subscribed. Whisper "subscribe" to start.`,
        ];
      }
      // Named for the guild, so a player saying "invite" or "join" about anything else isn't sent one.
      case "ginvite":
      case "guildinvite":
        if (!this.#deps.guildInvites) return [UNKNOWN_REPLY];
        return this.#invite(sender);
      case "feedback":
      case "suggest":
      case "suggestion":
        return this.#feedback(sender, parts.slice(1).join(" ").trim());
      // Side words pick which capital's alerts to get — the side is detected automatically, but a
      // player may want the other capital, or both, or the detection may have got it wrong.
      case "alliance":
      case "horde":
      case "both":
        return this.#setFaction(sender, command);
      case "discord":
        return this.#discord();
      // "dmf"/"dmf where" are what PizzaWorldBuffs' own bot answers to, so a player who already
      // knows that phrasing gets an answer here without learning a second vocabulary.
      case "darkmoon":
      case "dmf":
      case "faire":
        return this.#darkmoon();
      // "shtatus" is how a drunk character's "status" comes out.
      case "status":
      case "shtatus":
        return this.#status(sender, sourceFaction);
      case "help":
      case "commands":
      case "options":
      case "settings":
      case "more":
      case "?":
        // Concise, one command per whisper. Each line is its own whisper and they arrive in order,
        // so the two people actually ask for — what's raiding, and where the faire is — go first,
        // and the guild invite last.
        return [
          `status - what's raiding Onyxia and BWL now, and when the buff last dropped`,
          `darkmoon - where the Darkmoon Faire was last seen`,
          `subscribe / unsubscribe - start or stop in-game buff alerts`,
          `alliance / horde / both - which capital's buffs to be alerted for`,
          `discord - alerts on Discord are instant; in-game whispers can lag`,
          `feedback <message> - send a suggestion or bug report`,
          ...(this.#deps.guildInvites ? [`ginvite - join <${this.#deps.guildName}>`] : []),
        ];
      default: {
        // Natural-language intent detection over the whole message.
        const intent = parseIntent(text);
        if (intent) return this.#handleIntent(intent, sender, text, sourceFaction);
        // Not a recognised command — one short pointer to help. Not the live status: a "youre late"
        // answered with four whispers of it is the wall of scripted replies players complained of.
        return [UNKNOWN_REPLY];
      }
    }
  }

  /** A player on the wall of shame: told why once a day, and otherwise met with silence. */
  #refuse(sender: string): string[] {
    const now = (this.#deps.now ?? Date.now)();
    const key = subscriberKey(sender);
    const last = this.#refusedAt.get(key);
    if (last !== undefined && now - last < SHUNNED_REPLY_INTERVAL_MS) return [];
    this.#refusedAt.set(key, now);
    return [SHUNNED_REPLY];
  }

  /** Live-state query for a player: what's raiding each lair now (and how long), and when the
   *  Rallying Cry last dropped in THEIR capital(s) only — not both, since a player can only use
   *  their own side's buff. */
  async #status(sender: string, sourceFaction: Faction | null = null): Promise<string[]> {
    const { lairs, buffCooldowns } = this.#deps;
    const lines: string[] = [];
    // Every lair in one whisper: a status that grows a whisper per lair is a chattier bot.
    const raidLine = lairs().map(lairStatusText).join(" ");
    if (raidLine) lines.push(raidLine);
    const factions = buffCooldowns ? await this.#relevantFactions(sender, sourceFaction) : [];
    if (buffCooldowns) {
      const shown = (await buffCooldowns()).filter((cd) => factions.includes(cd.faction));
      // One side is the player's own, so it needs no city name; both sides name each.
      const [first, ...rest] = shown;
      const part =
        first && rest.length === 0
          ? rallyingCryState(first)
          : shown.map((cd) => `${CITY_FOR[cd.faction]} ${rallyingCryState(cd)}`).join(", ");
      if (part) lines.push(`Rallying Cry: ${part}.`);
    }
    // Where the Darkmoon Faire is, once it has been seen — an unknown faire is left for "darkmoon".
    const faire = this.#deps.faireAnswer?.();
    const faireLine = faire ? formatFaireBrief(faire, (this.#deps.now ?? Date.now)()) : null;
    if (faireLine) lines.push(faireLine);
    return lines;
  }

  /** The capital side(s) relevant to a player: their subscribed side(s) if subscribed (we already
   *  know it); else the listener's side if they came through one (safe to assume, no /who); else
   *  resolved from a /who — falling back to both if we can't tell. */
  async #relevantFactions(sender: string, sourceFaction: Faction | null): Promise<readonly Faction[]> {
    const sub = await this.#deps.store.get(sender);
    if (sub) return sub.factions;
    if (sourceFaction) return [sourceFaction];
    const detected = this.#factionDetect ? await this.#factionDetect(sender) : null;
    return detected ? [detected] : DEFAULT_FACTIONS;
  }

  /** Set a fresh subscriber's side: from the listener they came through if known (safe to assume,
   *  so no /who — see `handle`), else fire the best-effort /who lookup. */
  async #autoSetFaction(sender: string, sourceFaction: Faction | null): Promise<void> {
    if (sourceFaction) {
      await this.#deps.store.update(sender, { factions: [sourceFaction], factionSource: "auto" });
      return;
    }
    this.#factionLookup?.(sender);
  }

  /**
   * A subscribed player reached us through a faction-specific listener — retroactively resolve
   * their side if it's still the unresolved "both" default. Never touches a "manual" choice (so a
   * deliberate "both" is kept) or an already-resolved single side. This is what clears the
   * both-faction backlog as those subscribers interact, no /who needed.
   */
  async #reResolveFaction(sender: string, sourceFaction: Faction | null): Promise<void> {
    if (!sourceFaction) return;
    const sub = await this.#deps.store.get(sender);
    if (!sub || !needsFactionResolution(sub)) return;
    await this.#deps.store.update(sender, { factions: [sourceFaction], factionSource: "auto" });
  }

  /** Choose which side's buffs to get: "alliance", "horde", or "both". Empty shows current. */
  async #setFaction(sender: string, side: string): Promise<string[]> {
    const { store } = this.#deps;
    const sub = await store.get(sender);
    if (!sub) return [`You're not subscribed. Whisper "subscribe" first.`];

    const s = side.trim().toLowerCase();
    if (s === "") {
      return [
        `You get ${factionLabel(sub.factions)} buff alerts. Whisper "alliance", "horde", or "both" to change.`,
      ];
    }
    let factions: readonly Faction[] | null = null;
    if (s === "both" || s === "all") factions = DEFAULT_FACTIONS;
    else if (isFaction(s)) factions = [s];
    else if (["alli", "ally", "aly", "a"].includes(s)) factions = ["alliance"];
    else if (["h"].includes(s)) factions = ["horde"];
    if (!factions) {
      return [`Whisper "alliance", "horde", or "both". You're on ${factionLabel(sub.factions)}.`];
    }
    await store.update(sender, { factions: [...factions], factionSource: "manual" });
    return [`Done - I'll alert you for ${factionLabel(factions)} buffs.`];
  }

  /** Where the Darkmoon Faire is. Unwired = say so, rather than guess at a zone. */
  #darkmoon(): string[] {
    const { faireAnswer, now } = this.#deps;
    if (!faireAnswer) return [`I'm not tracking the Darkmoon Faire right now - sorry!`];
    return [formatFaire(faireAnswer(), (now ?? Date.now)())];
  }

  /** Share the Discord invite link, with a one-line note on what it's for. Null = unconfigured. */
  #discord(): string[] {
    const { discordInvite } = this.#deps;
    if (!discordInvite) {
      return [`I don't have a Discord invite link set up right now - sorry!`];
    }
    return [`Join our Discord to get Rallying Cry alerts outside the game: ${discordInvite}`];
  }

  /** Capture a player's feedback/suggestion and hand it off (persisted + posted to the
   *  feedback channel by the caller). Empty text just shows how to use it. */
  #feedback(sender: string, text: string): string[] {
    if (text === "") {
      return [`Whisper "feedback <your message>" and I'll pass your suggestion along.`];
    }
    if (!this.#deps.onFeedback) {
      return [`Feedback isn't set up on this bot right now - sorry about that!`];
    }
    this.#deps.onFeedback(sender, text);
    return [`Thanks for the feedback - I've passed it along.`];
  }

  /** Send the caller a guild invite. Only works while the watcher is in world; if it
   *  is offline, or Bufftracker lacks invite rights in the guild, nothing is sent. */
  #invite(sender: string): string[] {
    if (!this.#guildInvite) {
      return [`I can't send a guild invite right now - try again in a moment.`];
    }
    // Invite silently — no confirmation whisper. If they accept, they're welcomed in guild chat.
    this.#guildInvite(sender);
    return [];
  }

  /** Act on a natural-language intent — re-dispatching to the canonical command where one
   *  exists. `text` is the whole original message, used when an intent carries a payload
   *  (feedback). */
  async #handleIntent(intent: Intent, sender: string, text: string, sourceFaction: Faction | null): Promise<string[]> {
    const { areaName } = this.#deps;
    switch (intent) {
      case "subscribe":
      case "unsubscribe":
      case "status":
      case "discord":
      case "darkmoon":
      case "help":
        return this.handle(sender, intent, sourceFaction);
      case "feedback":
        // The phrasing IS the suggestion — pass the whole message through.
        return this.#feedback(sender, text.trim());
      case "guild":
        if (!this.#deps.guildInvites) return [UNKNOWN_REPLY];
        return [
          `Whisper "ginvite" and I'll send you a guild invite right now - and "subscribe" for buff alerts.`,
        ];
      case "buff":
        return [
          `I call out Rallying Cry buff drops from ${areaName} raids. ` +
            `Whisper "subscribe" and I'll ping you when one's about to drop.`,
        ];
      case "thanks":
        return [`You're very welcome - happy raiding! Whisper "help" anytime.`];
    }
  }
}
