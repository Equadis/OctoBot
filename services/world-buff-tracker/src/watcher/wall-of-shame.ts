import type { Logger } from "../logger.js";
import {
  DISCORD_MESSAGE_LIMIT,
  type ChannelMessage,
  type CreateResult,
  type DmResult,
} from "../notify/discord-dm.js";
import { describeCharacter } from "./character.js";
import type { ShamedPlayer } from "./shame-list-store.js";
import type { WallOfShameStore } from "./wall-of-shame-store.js";

/**
 * The wall of shame: ONE pinned message showing the shame list (see shame-list.ts) — a short intro
 * saying why, then every player who has killed a bot listener, in the order they first did it, with
 * their faction, race and class once a /who has seen them.
 *
 * Edited in place, never reposted, for the reason the other boards are: the message id is kept, so
 * a redeploy edits the same message instead of orphaning it and pinning a second. A message someone
 * deleted is posted and pinned afresh; one merely unpinned is left alone.
 *
 * Discord refuses a message over its length limit, so a wall too long for one message shows the
 * players who fit — the earliest — and says so in the log. That is over a hundred names.
 */

/** The three channel operations the wall needs. */
export interface WallChannel {
  create(message: ChannelMessage): Promise<CreateResult>;
  edit(messageId: string, message: ChannelMessage): Promise<DmResult>;
  pin(messageId: string): Promise<DmResult>;
}

export interface WallOfShameDeps {
  readonly channel: WallChannel;
  readonly store: WallOfShameStore;
  readonly logger: Logger;
}

/** What the wall says before its list: who these players are, and what it cost. */
export const WALL_INTRO = [
  "**🪦 Wall of Shame**",
  "These players killed one of our buff listeners — the characters parked in Stormwind and Orgrimmar " +
    "that hear the Rallying Cry and tell everyone when it drops. Each kill left that city without buff " +
    "alerts until the listener was revived.",
  "Killing one, by your own hand or your pet's or summon's, puts you on this list and bans you from the " +
    "tracker: no more alerts, and no more answers.",
  "",
].join("\n");

/** A player's line: "- Name — Horde Orc Warlock", or just the name until a /who has seen them. */
export function wallLine(player: ShamedPlayer): string {
  return player.details ? `- ${player.name} — ${describeCharacter(player.details)}` : `- ${player.name}`;
}

/** The wall's text — the intro, then a line per player — holding as many players as fit in `maxLength`. */
export function renderWall(
  players: readonly ShamedPlayer[],
  maxLength: number = DISCORD_MESSAGE_LIMIT,
): { readonly content: string; readonly shown: number } {
  const lines = [WALL_INTRO];
  let length = WALL_INTRO.length;
  for (const player of players) {
    const line = wallLine(player);
    if (length + 1 + line.length > maxLength) break;
    lines.push(line);
    length += 1 + line.length;
  }
  return { content: lines.join("\n"), shown: lines.length - 1 };
}

function describe(result: DmResult | CreateResult): string {
  return result.ok ? "ok" : `${result.kind}${result.status ? ` ${result.status}` : ""}`;
}

export class WallOfShame {
  readonly #deps: WallOfShameDeps;
  #messageId: string | null = null;
  /** The message this session posted but could not pin — tried again on the next change. */
  #unpinned: string | null = null;
  /** Serialises paints, so two deaths at once cannot race into two posted walls. */
  #queue: Promise<void> = Promise.resolve();

  constructor(deps: WallOfShameDeps) {
    this.#deps = deps;
  }

  /** Load the message id. Call once on boot, before the first paint. */
  async load(): Promise<void> {
    const state = await this.#deps.store.load();
    this.#messageId = state?.messageId ?? null;
  }

  /**
   * Show these players on the wall — after one is added or described, and on boot, so a message
   * deleted while the bot was down comes back.
   */
  show(players: readonly ShamedPlayer[]): Promise<void> {
    this.#queue = this.#queue.then(() => this.#render(players)).catch((error) =>
      this.#deps.logger.error(`wall of shame threw: ${error instanceof Error ? error.message : String(error)}`),
    );
    return this.#queue;
  }

  async #render(players: readonly ShamedPlayer[]): Promise<void> {
    // Nobody to name yet: the wall goes up with its first player.
    if (players.length === 0) return;
    const { content, shown } = renderWall(players);
    if (shown < players.length) {
      this.#deps.logger.warn(`wall of shame: ${players.length - shown} players do not fit in one message`);
    }
    const message: ChannelMessage = { content };

    if (this.#messageId !== null) {
      const edited = await this.#deps.channel.edit(this.#messageId, message);
      if (edited.ok) {
        if (this.#unpinned === this.#messageId) await this.#pin(this.#messageId);
        return;
      }
      if (edited.kind !== "unreachable" || edited.status !== 404) {
        this.#deps.logger.error(`wall of shame edit failed (${describe(edited)})`);
        return;
      }
      this.#deps.logger.warn("wall of shame message is gone; posting it again");
      this.#messageId = null;
    }

    const created = await this.#deps.channel.create(message);
    if (!created.ok) {
      this.#deps.logger.error(`wall of shame post failed (${describe(created)})`);
      return;
    }
    this.#messageId = created.messageId;
    await this.#deps.store.save({ messageId: created.messageId });
    await this.#pin(created.messageId);
  }

  async #pin(messageId: string): Promise<void> {
    const pinned = await this.#deps.channel.pin(messageId);
    if (pinned.ok) {
      this.#unpinned = null;
      return;
    }
    this.#unpinned = messageId;
    this.#deps.logger.error(
      `wall of shame pin failed (${describe(pinned)}) — the bot needs the Pin Messages permission in its channel`,
    );
  }
}
