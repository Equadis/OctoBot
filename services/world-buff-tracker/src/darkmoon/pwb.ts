import type { FaireLocation } from "./location.js";

/**
 * Decoder for the Darkmoon Faire location that PizzaWorldBuffs gossips on Turtle's hidden
 * "LFT" channel — the same channel the bot already reads for `OB_INC:` head warnings
 * (see `watcher/lft-signals.ts`), so this costs us no new connection.
 *
 *   PWB_DMF:10401:M-3600-Someplayer
 *   └ prefix  └ version  └ location · seconds ago · witness
 *
 * PWB sets the location when a player mouseovers one of ~22 faire NPCs while standing in
 * Elwynn Forest or Mulgore, then every client rebroadcasts what it knows every 10-60s, so
 * during a faire week the whole server's sightings converge within minutes. PWB itself has
 * NO schedule logic — it only ever answers "last seen in X, N ago". The calendar
 * (`schedule.ts`) supplies the WHEN; this supplies the WHERE, from the server.
 *
 * Trust rules are ported from PWB's own `shouldAcceptDmfLocation`, deliberately — a bot that
 * disagrees with the addon every player is running is a bot that looks broken:
 *
 *   - version < 10401 is dropped. PWB 1.4.0 also matched "Darkmoon Faire Carnie", who is
 *     present in the capitals even when no faire is running, so those clients emit sightings
 *     for a faire that isn't there.
 *   - a sighting older than 7 days is dropped; the faire is only up for one week, so an older
 *     one describes a faire that has already packed up.
 *
 * Like every LFT line this is player-sendable and therefore forgeable. We accept it on the
 * same terms PWB does (freshest wins) because the blast radius is one wrong whisper, and a
 * single genuine sighting corrects it — but nothing here is ever treated as proof of anything
 * that costs a player something.
 */

const PREFIX = "PWB_DMF:";

/** PWB versions below this emitted false sightings from the Carnie bug. */
export const MIN_TRUSTED_PWB_VERSION = 10401;

/** A sighting older than the faire's own one-week visit can only describe a faire that has left. */
export const MAX_SIGHTING_AGE_MS = 7 * 86_400_000;

export interface DmfBroadcast {
  /** Sender's PWB version as major*10000 + minor*100 + patch. */
  readonly version: number;
  readonly location: FaireLocation;
  /** How long before the message was sent the faire was seen, in ms. */
  readonly ageMs: number;
  /** The player who actually laid eyes on it. Forgeable; kept for logging only. */
  readonly witness: string;
}

/**
 * PWB encodes the zone as the FIRST LETTER of the zone name as the witness's client localises
 * it, so only an enUS (or esES "Mulgore") client produces a letter anyone can read back — an
 * esES witness in "Bosque de Elwynn" broadcasts "B", which PWB's own lookup table cannot map
 * either. Unknown letters are dropped rather than guessed.
 */
function locationFor(code: string): FaireLocation | null {
  if (code === "E") return "elwynn";
  if (code === "M") return "mulgore";
  return null;
}

/** Parse a `PWB_DMF:` line, or null if it is not one / is malformed / is unreadable. */
export function parseDmfBroadcast(text: string): DmfBroadcast | null {
  if (!text.startsWith(PREFIX)) return null;
  const rest = text.slice(PREFIX.length); // "10401:M-3600-Someplayer"
  const versionEnd = rest.indexOf(":");
  if (versionEnd === -1) return null;
  const version = Number(rest.slice(0, versionEnd));
  if (!Number.isInteger(version) || version < 0) return null;

  // Strict where PWB's Lua pattern is greedy: a witness is a character name, so it can never
  // contain the "-" separators, and a malformed line is dropped rather than half-read.
  const match = /^([A-Za-z])-(\d+)-([^-]+)$/.exec(rest.slice(versionEnd + 1));
  if (!match) return null;
  const [, code, secondsAgo, witness] = match;

  const location = locationFor(code);
  if (location === null) return null;

  const ageMs = Number(secondsAgo) * 1000;
  if (!Number.isSafeInteger(ageMs)) return null;

  return { version, location, ageMs, witness };
}

/** Whether a decoded broadcast clears PWB's own trust bar and is worth acting on. */
export function isTrustedBroadcast(broadcast: DmfBroadcast): boolean {
  if (broadcast.version < MIN_TRUSTED_PWB_VERSION) return false;
  return broadcast.ageMs <= MAX_SIGHTING_AGE_MS;
}

/** When the faire was actually seen, from a broadcast received at `receivedAt`. */
export function sightedAt(broadcast: DmfBroadcast, receivedAt: number): number {
  return receivedAt - broadcast.ageMs;
}
