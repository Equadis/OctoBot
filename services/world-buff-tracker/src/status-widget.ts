import type { Logger } from "./logger.js";
import type { ChannelMessage, CreateResult, DiscordEmbed, DmResult } from "./notify/discord-dm.js";
import {
  EMPTY_BASELINE,
  classifyResponse,
  foldBaseline,
  type RealmResponse,
  type ResponseBaseline,
} from "./realm-response.js";

/**
 * The live server-status "widget": ONE message in #server-status that the bot keeps edited in place,
 * showing whether the realm is up and healthy at a glance. Two pieces:
 *
 *  - `buildServerStatusEmbed` — pure: a view of the realm's state -> a Discord embed. All wording,
 *    colour and duration formatting live here, unit-tested, so nothing is "a number nobody can check".
 *  - `ServerStatusWidget` — the orchestrator: edits the existing message, creating it only the first
 *    time or if a moderator deleted it. It depends on a narrow `StatusChannel` port (not the Discord
 *    sender directly), so the create-then-edit behaviour is tested with a fake.
 *
 * This is deliberately SEPARATE from the community down/up event posts (which stay in the Onyxia
 * channel with their role pings): the widget answers "what is true now", the alert "something changed".
 */

/** A finished realm outage, for the "last outage" line. */
export interface LastOutage {
  readonly endedAt: number;
  readonly durationMs: number;
}

/** The live realm facts the widget reads at refresh time (from the ServerMonitor + ping samples).
 *  It carries the RAW ping stats, not a verdict — the widget folds them into a baseline and classifies
 *  (so the "steady / elevated / unstable" judgement is stateful and lives in one place). */
export interface LiveRealmStatus {
  readonly realm: string;
  readonly up: boolean;
  /** Median recent round-trip from the bot's host, or null if no pongs have landed in the window. */
  readonly pingMedianMs: number | null;
  /** Spread (max-min) of recent round-trips — the jitter measure — or null if no pongs. */
  readonly pingSpreadMs: number | null;
  /** Realm-wide players online from the latest `/who`, or null if no fresh reading (see
   *  realm-population.ts — the count expires, so an outage never freezes a pre-outage number here). */
  readonly playersOnline: number | null;
  /** When the current up/down state began (epoch ms), or null if unknown. */
  readonly stateSince: number | null;
  /** When the bot started watching this realm (epoch ms) — for the "watching for" footer. */
  readonly watchingSince: number;
  /** When this snapshot was taken (epoch ms). */
  readonly now: number;
}

/** Everything the embed renders: the up/down state, the classified realm-response verdict (no raw
 *  ms — see realm-response.ts for why), the persisted last outage, and the timing fields. */
export interface ServerStatusView {
  readonly realm: string;
  readonly up: boolean;
  readonly response: RealmResponse;
  /** Realm-wide players online, or null when there is no fresh reading. */
  readonly playersOnline: number | null;
  readonly stateSince: number | null;
  readonly watchingSince: number;
  readonly now: number;
  readonly lastOutage: LastOutage | null;
}

/** Embed sidebar colours (0xRRGGBB): green healthy, amber elevated/unstable, red down. */
export const COLOR_UP = 0x2ecc71;
export const COLOR_LAGGY = 0xf1c40f;
export const COLOR_DOWN = 0xe74c3c;

/** Compact human span with day granularity: "under a minute", "42m", "3h20m", "5d", "2d4h". */
export function humanSpan(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  if (totalMin < 1) return "under a minute";
  if (totalMin < 60) return `${totalMin}m`;
  const totalHr = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;
  if (totalHr < 24) return remMin === 0 ? `${totalHr}h` : `${totalHr}h${remMin}m`;
  const days = Math.floor(totalHr / 24);
  const remHr = totalHr % 24;
  return remHr === 0 ? `${days}d` : `${days}d${remHr}h`;
}

/** Amber when the realm is up but its ping is elevated or fluctuating; green when steady/unknown. */
function isOffHealth(view: ServerStatusView): boolean {
  return view.up && (view.response === "elevated" || view.response === "unstable");
}

/** Group thousands so a four-figure population reads at a glance: 1204 -> "1,204". The locale is
 *  pinned so the rendering is identical whatever the host's is. */
function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

/** The population field — the realm-wide online count off the latest `/who`. "Checking…" until one
 *  lands (the same wording the response field uses for "no reading yet"), so the field keeps its slot
 *  rather than appearing and vanishing between refreshes. */
function playersOnlineField(playersOnline: number | null): string {
  return playersOnline === null ? "Checking…" : formatCount(playersOnline);
}

/** The realm-response field — a qualitative verdict against the realm's own baseline, no ms. */
function responseField(response: RealmResponse): string {
  switch (response) {
    case "steady":
      return "Stable";
    case "elevated":
      return "Elevated — higher than usual";
    case "unstable":
      return "Unstable — fluctuating";
    case "unknown":
      return "Checking…";
  }
}

function lastOutageField(view: ServerStatusView): string {
  if (view.lastOutage === null) return "None recorded";
  return `${humanSpan(view.now - view.lastOutage.endedAt)} ago · lasted ${humanSpan(view.lastOutage.durationMs)}`;
}

function titleSuffix(view: ServerStatusView): string {
  if (!view.up) return "Down";
  if (view.response === "elevated") return "Online (elevated ping)";
  if (view.response === "unstable") return "Online (unstable ping)";
  return "Online";
}

/**
 * The one sentence describing the realm right now.
 *
 * It carries the outage clock while down, because that is the same fact stated once instead of
 * twice: the title already says "Down", so a separate Status field repeating it added nothing but
 * a second place to read the same word.
 */
function describeState(view: ServerStatusView): string {
  if (!view.up) {
    if (view.stateSince === null) return "The realm is down.";
    return `The realm has been down for ${humanSpan(view.now - view.stateSince)}.`;
  }
  if (view.response === "elevated") return "The realm is up but latency is higher than usual.";
  if (view.response === "unstable") return "The realm is up but latency is fluctuating.";
  return "The realm is up and responding normally.";
}

/** Render the current realm state as the widget embed. Pure. */
export function buildServerStatusEmbed(view: ServerStatusView): DiscordEmbed {
  const offHealth = isOffHealth(view);
  const color = !view.up ? COLOR_DOWN : offHealth ? COLOR_LAGGY : COLOR_UP;
  const dot = !view.up ? "🔴" : offHealth ? "🟡" : "🟢"; // 🔴 🟡 🟢

  // Population and response are omitted while the realm is down: there is no live `/who` to count
  // from and no ping to judge, so both would read "Checking…" and say nothing.
  const liveFields: DiscordEmbed["fields"] = view.up
    ? [
        { name: "Players online", value: playersOnlineField(view.playersOnline), inline: true },
        // A qualitative reading against the realm's own baseline — the bot pings from the US, so an
        // absolute ms would be meaningless to a reader elsewhere. See realm-response.ts.
        { name: "Realm response", value: responseField(view.response), inline: true },
      ]
    : [];
  // No "Status" field: the title, the coloured dot and the description already say up or down, and
  // a fourth copy next to "Last outage" — which is about a DIFFERENT outage, in a different tense —
  // was the confusing part. While down, the previous outage is dropped for the same reason the
  // population and ping are: the outage happening right now is the only one anyone is reading for.
  const fields: DiscordEmbed["fields"] = view.up
    ? [...liveFields, { name: "Last outage", value: lastOutageField(view), inline: true }]
    : [];

  return {
    title: `${dot} ${view.realm} — ${titleSuffix(view)}`,
    description: describeState(view),
    color,
    fields,
    footer: { text: `Watching for ${humanSpan(view.now - view.watchingSince)}` },
    timestamp: new Date(view.now).toISOString(),
  };
}

/** Narrow delivery port — create the widget message once, then edit it in place. */
export interface StatusChannel {
  create(message: ChannelMessage): Promise<CreateResult>;
  edit(messageId: string, message: ChannelMessage): Promise<DmResult>;
}

/** The durable state the widget reads/writes: message id, last outage, applied channel name, and the
 *  flattened response baseline (persisted so the ~day-long ping baseline survives frequent redeploys). */
export interface StatusWidgetState {
  readonly messageId: string | null;
  readonly lastOutageEndedAt: number | null;
  readonly lastOutageDurationMs: number | null;
  readonly channelName: string | null;
  readonly baselineEmaMs: number | null;
  readonly baselineSamples: number;
  readonly baselineUpdatedAt: number | null;
}

export interface StatusWidgetStore {
  load(): Promise<StatusWidgetState | null>;
  save(state: StatusWidgetState): Promise<void>;
}

/** The channel name for a given up/down state — the status emoji prefixed straight onto the base
 *  name, with NO separator of our own (Discord inserts its own dash after the emoji, so adding one
 *  here produced a double dash "🔴--server-status"). Pure. Only the leading 🟢/🔴 changes; laggy is
 *  deliberately NOT reflected here (it would flap the name against Discord's rename limit), so the
 *  name is coarse up/down and the embed carries the nuance. */
export function statusChannelName(up: boolean, base: string): string {
  return `${up ? "🟢" : "🔴"}${base}`;
}

/** The short one-line notice posted (then deleted) to fire an unread/push on a realm down transition. */
export function serverDownNotice(realm: string): string {
  return `🔴 ${realm} is down.`;
}

/** The notice on recovery; `outageMs` 0 = unknown duration, so it's omitted. */
export function serverUpNotice(realm: string, outageMs: number): string {
  return outageMs > 0 ? `🟢 ${realm} is up — was down for ${humanSpan(outageMs)}.` : `🟢 ${realm} is up.`;
}

export interface ServerStatusWidgetDeps {
  readonly channel: StatusChannel;
  readonly store: StatusWidgetStore;
  /** Reads the current live realm facts at render time. */
  readonly snapshot: () => LiveRealmStatus;
  /** Optional: rename the channel to reflect up/down (🟢/🔴). Omitted = embed only, no rename. */
  readonly renameChannel?: (name: string) => Promise<DmResult>;
  /** Base name the rename prefixes the status emoji onto (e.g. "server-status"). */
  readonly channelBaseName?: string;
  /** Optional: delete a message by id — used to remove the transient up/down notice after it fires. */
  readonly deleteMessage?: (messageId: string) => Promise<DmResult>;
  /** How long the transient notice lingers before deletion (ms). 0 = delete immediately. */
  readonly noticeLingerMs?: number;
  /** Injectable sleep (for the linger), so tests don't wait on a real timer. */
  readonly sleep?: (ms: number) => Promise<void>;
  readonly logger: Logger;
}

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class ServerStatusWidget {
  readonly #channel: StatusChannel;
  readonly #store: StatusWidgetStore;
  readonly #snapshot: () => LiveRealmStatus;
  readonly #renameChannel: ((name: string) => Promise<DmResult>) | null;
  readonly #channelBaseName: string;
  readonly #deleteMessage: ((messageId: string) => Promise<DmResult>) | null;
  readonly #noticeLingerMs: number;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #logger: Logger;
  #messageId: string | null = null;
  #lastOutage: LastOutage | null = null;
  #channelName: string | null = null; // the channel name last applied by the rename indicator
  #baseline: ResponseBaseline = EMPTY_BASELINE; // the realm's rolling ping baseline
  /** Serialises refreshes so a startup transition can't race the periodic timer into two posts. */
  #queue: Promise<void> = Promise.resolve();

  constructor(deps: ServerStatusWidgetDeps) {
    this.#channel = deps.channel;
    this.#store = deps.store;
    this.#snapshot = deps.snapshot;
    this.#renameChannel = deps.renameChannel ?? null;
    this.#channelBaseName = deps.channelBaseName ?? "server-status";
    this.#deleteMessage = deps.deleteMessage ?? null;
    this.#noticeLingerMs = deps.noticeLingerMs ?? 0;
    this.#sleep = deps.sleep ?? realSleep;
    this.#logger = deps.logger;
  }

  /**
   * Post a short transient notice to the status channel to fire an unread/push on a realm up/down
   * change, then delete it (after `noticeLingerMs`) so only the pinned status embed remains when a
   * reader opens the channel. Independent of the pinned message — it posts and removes its OWN message.
   * The mobile push is sent on message-create and is not recalled by the delete; the linger gives the
   * unread indicator time to register on other clients before cleanup.
   */
  async announce(text: string): Promise<void> {
    const created = await this.#channel.create({ content: text });
    if (!created.ok) {
      this.#logger.error(`server-status notice post failed (${describe(created)})`);
      return;
    }
    if (!this.#deleteMessage) return; // posted (notified) but nothing wired to clean it up
    if (this.#noticeLingerMs > 0) await this.#sleep(this.#noticeLingerMs);
    const deleted = await this.#deleteMessage(created.messageId);
    if (!deleted.ok) {
      this.#logger.error(`server-status notice cleanup failed (${describe(deleted)}) — it will linger`);
    }
  }

  /** Load persisted state (message id, last outage, channel name, ping baseline). Call once on boot. */
  async load(): Promise<void> {
    const state = await this.#store.load();
    if (!state) return;
    this.#messageId = state.messageId;
    this.#channelName = state.channelName;
    this.#lastOutage =
      state.lastOutageEndedAt !== null && state.lastOutageDurationMs !== null
        ? { endedAt: state.lastOutageEndedAt, durationMs: state.lastOutageDurationMs }
        : null;
    this.#baseline = {
      emaMs: state.baselineEmaMs,
      samples: state.baselineSamples,
      updatedAt: state.baselineUpdatedAt,
    };
  }

  /** Record a finished outage — shown on the next render, which persists it. */
  async recordOutageEnd(endedAt: number, durationMs: number): Promise<void> {
    this.#lastOutage = { endedAt, durationMs };
    await this.refresh();
  }

  /** Re-render the widget. Edits the existing message; creates it the first time or if it was deleted. */
  refresh(): Promise<void> {
    this.#queue = this.#queue.then(() => this.#render()).catch((error) => {
      this.#logger.error(`server-status widget refresh threw: ${error instanceof Error ? error.message : String(error)}`);
    });
    return this.#queue;
  }

  async #render(): Promise<void> {
    const live = this.#snapshot();
    // Classify the ping against the CURRENT baseline, THEN fold this reading in — so the sample being
    // judged doesn't first pull the baseline toward itself and mask its own elevation.
    const response = classifyResponse(live.pingMedianMs, live.pingSpreadMs, this.#baseline);
    this.#baseline = foldBaseline(this.#baseline, live.pingMedianMs, live.now);

    const view: ServerStatusView = {
      realm: live.realm,
      up: live.up,
      response,
      playersOnline: live.playersOnline,
      stateSince: live.stateSince,
      watchingSince: live.watchingSince,
      now: live.now,
      lastOutage: this.#lastOutage,
    };

    // The embed and the channel-name indicator are independent surfaces — a failure of one must not
    // skip the other (e.g. Send-Messages missing but Manage-Channels granted, or vice versa).
    await this.#renderEmbed(view);
    await this.#renderChannelName(view);
    // One write per render, carrying the message id, last outage, channel name, and the folded baseline.
    await this.#persist();
  }

  async #renderEmbed(view: ServerStatusView): Promise<void> {
    const message: ChannelMessage = { embeds: [buildServerStatusEmbed(view)] };

    if (this.#messageId) {
      const edited = await this.#channel.edit(this.#messageId, message);
      if (edited.ok) return;
      if (edited.kind === "unreachable" && edited.status === 404) {
        this.#logger.warn("server-status widget message is gone; reposting it");
        this.#messageId = null; // fall through to recreate
      } else {
        this.#logger.error(`server-status widget edit failed (${describe(edited)})`);
        return;
      }
    }

    const created = await this.#channel.create(message);
    if (created.ok) {
      this.#messageId = created.messageId;
    } else {
      this.#logger.error(`server-status widget post failed (${describe(created)})`);
    }
  }

  /** Reflect up/down in the channel name — only when rename is configured AND the name would change,
   *  so a normal refresh renames nothing and Discord's ~2/10min rename limit is not a concern. */
  async #renderChannelName(view: ServerStatusView): Promise<void> {
    if (!this.#renameChannel) return;
    const desired = statusChannelName(view.up, this.#channelBaseName);
    if (desired === this.#channelName) return; // already applied — no rename this refresh
    const renamed = await this.#renameChannel(desired);
    if (renamed.ok) {
      this.#channelName = desired;
    } else {
      // Leave #channelName as-is so the next transition/refresh retries (e.g. a 429 backs off).
      this.#logger.error(`server-status channel rename failed (${describe(renamed)})`);
    }
  }

  #persist(): Promise<void> {
    return this.#store.save({
      messageId: this.#messageId,
      lastOutageEndedAt: this.#lastOutage?.endedAt ?? null,
      lastOutageDurationMs: this.#lastOutage?.durationMs ?? null,
      channelName: this.#channelName,
      baselineEmaMs: this.#baseline.emaMs,
      baselineSamples: this.#baseline.samples,
      baselineUpdatedAt: this.#baseline.updatedAt,
    });
  }
}

function describe(failure: { readonly kind: string; readonly status?: number }): string {
  return failure.status === undefined ? failure.kind : `${failure.kind} ${failure.status}`;
}
