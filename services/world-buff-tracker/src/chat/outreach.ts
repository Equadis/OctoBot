import type { Logger } from "../logger.js";
import type { Faction } from "../subscribers/store.js";
import { isSubscribeRequest } from "./command-router.js";
import type { IntroStore } from "./intro-store.js";

export interface OutreachConfig {
  readonly guildName: string;
  readonly community: string;
}

export type WhisperFn = (target: string, message: string) => void;
/** Runs a player's message through the command engine and returns the reply line(s).
 *  `sourceFaction` is the player's side when they reached us through a faction-specific listener —
 *  safe to assume it's theirs (that listener serves one faction's capital), so the engine can skip
 *  the /who. */
export type HandleFn = (sender: string, text: string, sourceFaction: Faction | null) => Promise<string[]>;
/** Whether a player is already a subscriber — subscribers are onboarded, so they skip the intro. */
export type IsSubscribedFn = (name: string) => Promise<boolean>;
/** Whether a player on the wall of shame for killing a bot listener — never greeted. */
export type IsShunnedFn = (name: string) => boolean;

/** Bufftracker's one-time self-introduction to a player who first contacts a listener: who it is,
 *  who runs it (the guild, for the community), and how to opt in. Sent ONCE per player (see
 *  `IntroStore`), and only to one who asked something other than to subscribe — the "You're
 *  subscribed!" confirmation stands on its own. No recruiting and no guild invite: the bot is for
 *  the buff, and players took the pitch for something else. Two whispers, each under the line limit:
 *  who it is, then that it knows where the Darkmoon Faire is. */
export function introLines(config: OutreachConfig): readonly string[] {
  return [
    `Hi! I'm the Onyxia world-buff tracker for the ${config.community} community, run by the <${config.guildName}> guild - I ping you in-game just before the Rallying Cry drops. Whisper "subscribe" for pings, or "help" for more.`,
    `I also track where the Darkmoon Faire is - whisper "darkmoon" to find it.`,
  ];
}

/**
 * Bridges a player's contact with a parked listener character to Bufftracker: the listeners
 * hear the whisper, but Bufftracker does the thinking and the whispering — so the watcher
 * registers its outbound channel AND its command engine here when in world, and clears them
 * on disconnect.
 *
 * Every listener whisper is routed to Bufftracker's command engine and answered, so a listener
 * is a full front-end for Bufftracker — you can whisper "subscribe" or "help" at onyxiabuffsw
 * and it works, and a player is never left without a reply. The FIRST time a not-yet-subscribed
 * player reaches a listener with anything but a subscribe, Bufftracker also introduces itself,
 * once, tracked in the `IntroStore`. A player on the wall of shame is never greeted. Only acts
 * while the watcher is available.
 */
export class Outreach {
  #whisper: WhisperFn | null = null;
  #handle: HandleFn | null = null;
  readonly #config: OutreachConfig;
  readonly #isSubscribed: IsSubscribedFn;
  readonly #isShunned: IsShunnedFn;
  readonly #introStore: IntroStore;
  readonly #logger: Logger;

  constructor(
    config: OutreachConfig,
    isSubscribed: IsSubscribedFn,
    isShunned: IsShunnedFn,
    introStore: IntroStore,
    logger: Logger,
  ) {
    this.#config = config;
    this.#isSubscribed = isSubscribed;
    this.#isShunned = isShunned;
    this.#introStore = introStore;
    this.#logger = logger;
  }

  /** The watcher offers its whisper channel (in world); pass null to withdraw it. */
  setChannel(whisper: WhisperFn | null): void {
    this.#whisper = whisper;
  }

  /** The command engine listener whispers are routed through. Set once at startup. */
  setHandler(handle: HandleFn | null): void {
    this.#handle = handle;
  }

  /** A player whispered a listener — route their message through Bufftracker's command engine and
   *  whisper back the reply, then introduce Bufftracker if this is their first contact and they
   *  asked something other than to subscribe. `sourceFaction` is the listener's side (the
   *  player's, safe to assume), passed to the engine so it can set/tailor the side without a /who;
   *  null for a faction-less listener. */
  async onListenerContact(playerName: string, text: string, sourceFaction: Faction | null = null): Promise<void> {
    const whisper = this.#whisper;
    if (!whisper) {
      // Watcher not in world — can't reply; their next contact will be handled.
      this.#logger.debug(`outreach: watcher offline, cannot answer ${playerName} yet`);
      return;
    }
    // The FIRST time a not-yet-subscribed player reaches us (once, not every message —
    // `introduceOnce` is atomic so back-to-back whispers can't double-send). A player on the wall of
    // shame is never greeted; the command engine tells them why.
    const firstContact =
      !this.#isShunned(playerName) &&
      !(await this.#isSubscribed(playerName)) &&
      (await this.#introStore.introduceOnce(playerName));

    // ANSWER FIRST. Their message goes to the command engine and the reply is whispered before any
    // introduction, so a specific request (discord, help, status, subscribe) is served first — the
    // intro never buries what they actually asked for.
    if (this.#handle) {
      for (const reply of await this.#handle(playerName, text, sourceFaction)) whisper(playerName, reply);
    }

    // THEN introduce, once, as a follow-up — unless they subscribed, which says it all.
    if (firstContact && !isSubscribeRequest(text)) {
      this.#logger.info(`outreach: introducing Bufftracker to ${playerName}`);
      for (const line of introLines(this.#config)) whisper(playerName, line);
    }
  }
}
