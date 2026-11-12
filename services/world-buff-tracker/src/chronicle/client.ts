import { parseChronicleResponse } from "./parse.js";
import type { ChronicleLog } from "./types.js";

const RECENT_URL = "https://octo.chronicleclassic.com/api/v1/raidlogs/recent?instance_name=Onyxia%27s%20Lair";

/**
 * Chronicle only answers requests that look like they came from its own site — drop the
 * Sec-Fetch-* pair and it returns "Forbidden, only browser requests". These headers are
 * load-bearing; `client.test.ts` asserts they're sent so a well-meaning "cleanup" can't
 * silently break the fetch.
 */
const HEADERS: Record<string, string> = {
  Origin: "https://octo.chronicleclassic.com",
  Referer: "https://octo.chronicleclassic.com/recent",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "User-Agent": "Mozilla/5.0 (compatible; turtle-onyxia-bot)",
};

/** The slice of a fetch Response we use — so tests inject a fake without a real HTTP round trip. */
export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}
export type FetchLike = (url: string, init: { headers: Record<string, string> }) => Promise<FetchResponseLike>;

export interface ChronicleClient {
  /** Recent Onyxia raid logs across all realms (the caller filters to its realm). Throws on a
   *  non-OK response so the poller can log and try again; malformed JSON yields [] (see parse). */
  fetchRecentOnyxia(): Promise<ChronicleLog[]>;
}

export class HttpChronicleClient implements ChronicleClient {
  readonly #fetch: FetchLike;
  readonly #url: string;

  constructor(fetchFn: FetchLike = (url, init) => fetch(url, init), url: string = RECENT_URL) {
    this.#fetch = fetchFn;
    this.#url = url;
  }

  async fetchRecentOnyxia(): Promise<ChronicleLog[]> {
    const res = await this.#fetch(this.#url, { headers: HEADERS });
    if (!res.ok) throw new Error(`chronicle: HTTP ${res.status}`);
    return parseChronicleResponse(await res.json());
  }
}
