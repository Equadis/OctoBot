/**
 * Sends a Discord DM to a user via the Bot API — the two-step flow:
 *   1. POST /users/@me/channels  { recipient_id }        -> a DM channel { id }
 *   2. POST /channels/{id}/messages { content }          -> the message
 *
 * Needs a bot token, and the bot must share a server with the recipient (and the
 * recipient must allow DMs from server members) or step 1/2 returns 403. That 403
 * and a 404 are per-user and reported as "unreachable" so the caller can guide the
 * user to join the server / open DMs; 401/429/5xx are "error" (systemic).
 */

/** The most characters Discord accepts in a message's content; a longer one is refused outright. */
export const DISCORD_MESSAGE_LIMIT = 2_000;

export interface DiscordResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type DiscordFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<DiscordResponse>;

/** The shared failure shape of every send/create/edit call. */
export type SendFailure = {
  readonly ok: false;
  readonly kind: "unreachable" | "not-configured" | "error";
  readonly status?: number;
};

export type DmResult = { readonly ok: true } | SendFailure;

/** A create result also carries the new message's id, so the caller can edit it later in place. */
export type CreateResult = { readonly ok: true; readonly messageId: string } | SendFailure;

export interface DiscordEmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline?: boolean;
}

/** The subset of a Discord embed the bot builds — enough for the live server-status widget. */
export interface DiscordEmbed {
  readonly title?: string;
  readonly description?: string;
  /** Sidebar colour as a 24-bit int (0xRRGGBB). */
  readonly color?: number;
  readonly fields?: readonly DiscordEmbedField[];
  readonly footer?: { readonly text: string };
  /** ISO 8601; Discord renders it as a localised "today at hh:mm" under the embed. */
  readonly timestamp?: string;
}

/** A message body: plain content, one or more embeds, or both. */
export interface ChannelMessage {
  readonly content?: string;
  readonly embeds?: readonly DiscordEmbed[];
}

const API = "https://discord.com/api/v10";

const defaultFetch: DiscordFetch = (url, init) => fetch(url, init);

function readChannelId(value: unknown): string | null {
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

export class DiscordDmSender {
  readonly #botToken: string | null;
  readonly #fetch: DiscordFetch;

  constructor(botToken: string | null, fetchImpl: DiscordFetch = defaultFetch) {
    this.#botToken = botToken && botToken.length > 0 ? botToken : null;
    this.#fetch = fetchImpl;
  }

  get isConfigured(): boolean {
    return this.#botToken !== null;
  }

  #headers(token: string): Record<string, string> {
    return { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
  }

  /** Post a plain message to a channel the bot can see (by id). `roleMentions` are role ids
   *  to actually ping — they must be repeated in `allowed_mentions` or Discord suppresses the
   *  ping. Used for the Onyxia notification channel (with @alliance/@horde) and feedback. */
  async postToChannel(channelId: string, content: string, roleMentions: readonly string[] = []): Promise<DmResult> {
    if (!this.#botToken) return { ok: false, kind: "not-configured" };
    const payload =
      roleMentions.length > 0
        ? { content, allowed_mentions: { roles: [...roleMentions] } }
        : { content };
    try {
      const response = await this.#fetch(`${API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: this.#headers(this.#botToken),
        body: JSON.stringify(payload),
      });
      return response.ok ? { ok: true } : classify(response.status);
    } catch {
      return { ok: false, kind: "error" };
    }
  }

  /** Post a message (content and/or embeds) to a channel and return the new message's id, so a
   *  caller keeping a live "widget" can edit that one message in place instead of reposting. */
  async createChannelMessage(channelId: string, message: ChannelMessage): Promise<CreateResult> {
    if (!this.#botToken) return { ok: false, kind: "not-configured" };
    try {
      const response = await this.#fetch(`${API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: this.#headers(this.#botToken),
        body: JSON.stringify(message),
      });
      if (!response.ok) return classify(response.status);
      const messageId = readChannelId(await response.json());
      return messageId ? { ok: true, messageId } : { ok: false, kind: "error" };
    } catch {
      return { ok: false, kind: "error" };
    }
  }

  /** Edit a message posted earlier (by id) in place. A 404 comes back as `unreachable` so the
   *  caller can tell "someone deleted it" (recreate) from a systemic error (leave it). */
  async editChannelMessage(
    channelId: string,
    messageId: string,
    message: ChannelMessage,
  ): Promise<DmResult> {
    if (!this.#botToken) return { ok: false, kind: "not-configured" };
    try {
      const response = await this.#fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
        method: "PATCH",
        headers: this.#headers(this.#botToken),
        body: JSON.stringify(message),
      });
      return response.ok ? { ok: true } : classify(response.status);
    } catch {
      return { ok: false, kind: "error" };
    }
  }

  /** Delete a message (DELETE /channels/{id}/messages/{id}). A bot may delete its OWN messages with
   *  no special permission — used for the transient "server up/down" notice that pings the channel
   *  and is then removed, so only the pinned status embed remains. */
  async deleteChannelMessage(channelId: string, messageId: string): Promise<DmResult> {
    if (!this.#botToken) return { ok: false, kind: "not-configured" };
    try {
      const response = await this.#fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
        method: "DELETE",
        headers: this.#headers(this.#botToken),
        body: "",
      });
      return response.ok ? { ok: true } : classify(response.status);
    } catch {
      return { ok: false, kind: "error" };
    }
  }

  /** Pin a message (PUT /channels/{id}/messages/pins/{id}). Needs the Pin Messages permission in the
   *  channel — without it Discord answers 403, which comes back as `unreachable`. */
  async pinChannelMessage(channelId: string, messageId: string): Promise<DmResult> {
    if (!this.#botToken) return { ok: false, kind: "not-configured" };
    try {
      const response = await this.#fetch(`${API}/channels/${channelId}/messages/pins/${messageId}`, {
        method: "PUT",
        headers: this.#headers(this.#botToken),
        body: "",
      });
      return response.ok ? { ok: true } : classify(response.status);
    } catch {
      return { ok: false, kind: "error" };
    }
  }

  /** Rename a channel (PATCH /channels/{id}). Needs the Manage Channels permission. Discord limits
   *  channel renames to ~2 per 10 minutes; a 429 comes back as `error` with its status so the caller
   *  can back off (the status widget renames only on a confirmed up/down transition, so it rarely does). */
  async renameChannel(channelId: string, name: string): Promise<DmResult> {
    if (!this.#botToken) return { ok: false, kind: "not-configured" };
    try {
      const response = await this.#fetch(`${API}/channels/${channelId}`, {
        method: "PATCH",
        headers: this.#headers(this.#botToken),
        body: JSON.stringify({ name }),
      });
      return response.ok ? { ok: true } : classify(response.status);
    } catch {
      return { ok: false, kind: "error" };
    }
  }

  async send(discordUserId: string, content: string): Promise<DmResult> {
    if (!this.#botToken) return { ok: false, kind: "not-configured" };
    try {
      const channelResponse = await this.#fetch(`${API}/users/@me/channels`, {
        method: "POST",
        headers: this.#headers(this.#botToken),
        body: JSON.stringify({ recipient_id: discordUserId }),
      });
      if (!channelResponse.ok) return classify(channelResponse.status);

      const channelId = readChannelId(await channelResponse.json());
      if (!channelId) return { ok: false, kind: "error" };

      return this.postToChannel(channelId, content);
    } catch {
      return { ok: false, kind: "error" };
    }
  }
}

function classify(status: number): SendFailure {
  if (status === 403 || status === 404) return { ok: false, kind: "unreachable", status };
  return { ok: false, kind: "error", status };
}
