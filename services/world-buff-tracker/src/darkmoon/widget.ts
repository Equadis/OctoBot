import type {
  ChannelMessage,
  CreateResult,
  DiscordEmbed,
  DmResult,
} from "../notify/discord-dm.js";
import { humanSpan } from "../notify/format.js";
import type { Logger } from "../logger.js";
import type { FaireAnswer } from "./observation.js";
import type { DarkmoonWidgetStore } from "./widget-store.js";

/**
 * A live Darkmoon Faire board: ONE message in its own channel, edited in place forever.
 *
 * Edited rather than reposted for the reason the server-status widget was: a channel that posts a
 * fresh message every refresh buries itself, and a redeploy that forgets which message it owns
 * orphans the last one and starts again. The message id is persisted, so a restart keeps editing
 * the same message.
 *
 * The other half of keeping this channel quiet is that a render only reaches Discord when the
 * rendered TEXT changes. The board reports a look and its age, and at day scale that age barely
 * moves — so a five-minute tick produces roughly one edit an hour, not 288 a day.
 */

/** Discord embed colours: a current look, and one old enough to doubt. */
const COLOUR_FRESH = 0x57f287;
const COLOUR_STALE = 0xfee75c;
const COLOUR_UNKNOWN = 0x4f545c;

/** Discord renders the embed timestamp itself, localised to each viewer ("Today at 12:13 PM"), and
 *  joins the footer to it with a bullet. So this is the only way to label what that time MEANS —
 *  it is when the board was last redrawn, not when the faire was seen. */
const UPDATED_LABEL = "Updated";

export function buildFaireEmbed(answer: FaireAnswer, now: number): DiscordEmbed {
  if (!answer.known) {
    return {
      title: "🎪 Darkmoon Faire",
      description:
        "**Location unknown**\nNobody has spotted it recently. It'll show up here as soon as anyone does.",
      color: COLOUR_UNKNOWN,
      footer: { text: UPDATED_LABEL },
      timestamp: new Date(now).toISOString(),
    };
  }

  const where = `${answer.site.zone} (${answer.site.landmark})`;
  const ago = humanSpan(now - answer.observedAt);
  // Never predicts, so it never claims the present tense on an old look — on a realm where the
  // faire moves weekly that is the difference between a fact and a guess.
  const description = answer.fresh
    ? `**${where}**\nSeen ${ago} ago`
    : `**${where}**\nLast seen ${ago} ago — it moves weekly, so it may have moved on`;

  return {
    title: "🎪 Darkmoon Faire",
    description,
    color: answer.fresh ? COLOUR_FRESH : COLOUR_STALE,
    footer: { text: UPDATED_LABEL },
    timestamp: new Date(now).toISOString(),
  };
}

/** The two channel operations the board needs — the same shape the status widget uses. */
export interface FaireChannel {
  create(message: ChannelMessage): Promise<CreateResult>;
  edit(messageId: string, message: ChannelMessage): Promise<DmResult>;
}

export interface DarkmoonWidgetDeps {
  readonly channel: FaireChannel;
  readonly store: DarkmoonWidgetStore;
  /** Reads the current answer at render time. */
  readonly answer: (now: number) => FaireAnswer;
  readonly now?: () => number;
  readonly logger: Logger;
}

function describe(result: DmResult | CreateResult): string {
  return result.ok ? "ok" : `${result.kind}${result.status ? ` ${result.status}` : ""}`;
}

export class DarkmoonWidget {
  readonly #deps: DarkmoonWidgetDeps;
  #messageId: string | null = null;
  /** The last text actually sent to Discord — a render that matches it is not worth an API call. */
  #rendered: string | null = null;
  /** Serialises refreshes so a boot paint cannot race the timer into two posted messages. */
  #queue: Promise<void> = Promise.resolve();

  constructor(deps: DarkmoonWidgetDeps) {
    this.#deps = deps;
  }

  /** Load the persisted message id. Call once on boot, before the first refresh. */
  async load(): Promise<void> {
    const state = await this.#deps.store.load();
    this.#messageId = state?.messageId ?? null;
  }

  /** Re-render. Edits the existing message; creates it the first time, or if it was deleted. */
  refresh(): Promise<void> {
    this.#queue = this.#queue
      .then(() => this.#render())
      .catch((error) =>
        this.#deps.logger.error(
          `darkmoon widget refresh threw: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    return this.#queue;
  }

  async #render(): Promise<void> {
    const now = (this.#deps.now ?? Date.now)();
    const embed = buildFaireEmbed(this.#deps.answer(now), now);
    // The timestamp moves every render by design, so it is excluded from the comparison — otherwise
    // nothing would ever match and the "only edit on change" saving would be zero.
    const signature = JSON.stringify({ ...embed, timestamp: undefined });
    if (signature === this.#rendered && this.#messageId !== null) return;

    const message: ChannelMessage = { embeds: [embed] };
    if (this.#messageId !== null) {
      const edited = await this.#deps.channel.edit(this.#messageId, message);
      if (edited.ok) {
        this.#rendered = signature;
        return;
      }
      if (edited.kind === "unreachable" && edited.status === 404) {
        this.#deps.logger.warn("darkmoon board message is gone; reposting it");
        this.#messageId = null; // fall through and recreate
      } else {
        this.#deps.logger.error(`darkmoon board edit failed (${describe(edited)})`);
        return;
      }
    }

    const created = await this.#deps.channel.create(message);
    if (!created.ok) {
      this.#deps.logger.error(`darkmoon board post failed (${describe(created)})`);
      return;
    }
    this.#messageId = created.messageId;
    this.#rendered = signature;
    await this.#deps.store.save({ messageId: created.messageId });
  }
}
