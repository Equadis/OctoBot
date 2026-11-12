import type { Logger } from "../logger.js";
import type { Faction } from "../watcher/buff-store.js";
import type { Subscriber } from "../subscribers/store.js";
import { describeError } from "../errors.js";
import { groupByRelevantCities } from "./faction-routing.js";
import { withUnsubscribeHint } from "./format.js";
import type { AlertWhisper } from "../chat/whisper-queue.js";
import type { NotifyMessage } from "./notifier.js";

/**
 * Fans one raid alert out to every channel — the Discord post, the in-capital yells, and the
 * subscriber whispers — in one place, so the announce functions only RENDER (pick formatters) and the
 * HOW of sending lives here. See RAID_ARCHITECTURE.md (AlertDelivery layer).
 *
 * Rendering stays at the call site because the formatter is event-specific; delivery takes the already
 * rendered Discord message plus per-city/per-group text closures and does the identical
 * push → (if whispers on) per-city yell → grouped subscriber whisper it used to do inline.
 */
export interface CityAlert {
  /** Short label for the log line (e.g. the event kind). */
  readonly label: string;
  /** The Discord channel post, `cities` role-pinged — or none, to keep this alert off Discord. */
  readonly discord?: NotifyMessage;
  /** The cities/factions this alert concerns. */
  readonly cities: readonly Faction[];
  /** In-capital yell text for one city — or none, to leave the capitals quiet for this alert. */
  readonly yellFor?: (city: Faction) => string;
  /** Subscriber whisper line for a relevant-city group (each subscriber hears only their side) — or
   *  none, to whisper no one of this alert. */
  readonly whisperFor?: (cities: readonly Faction[]) => string;
  /** Drop a whisper still queued past this (a stale "park now"). */
  readonly whisperMaxAgeMs?: number;
  /** When the event happened (ms epoch): a whisper's lateness and staleness run from here. */
  readonly happenedAt?: number;
}

export interface AlertDeliveryDeps {
  /** Post to the community Discord channel, role-pinging the given sides. */
  readonly push: (message: NotifyMessage, factions?: readonly Faction[]) => Promise<void>;
  /** Yell `text` in `city`'s capital (no-op if no listener is parked there). */
  readonly yell: (city: Faction, text: string) => void;
  /** Whether the in-game whisper interface is active at all. */
  readonly whispersEnabled: boolean;
  /** Every current subscriber. */
  readonly subscribers: () => Promise<readonly Subscriber[]>;
  /** Enqueue a whisper broadcast (presence-gated, split across the listener pool). */
  readonly broadcastWhisper: (names: readonly string[], message: string, faction: Faction | null, alert?: AlertWhisper) => void;
  readonly logger: Pick<Logger, "info" | "error">;
}

export class AlertDelivery {
  readonly #deps: AlertDeliveryDeps;

  constructor(deps: AlertDeliveryDeps) {
    this.#deps = deps;
  }

  /** Discord post + per-capital yell + per-side subscriber whisper, for an alert about some cities —
   *  whichever of the three the alert carries. */
  async sendCityAlert(alert: CityAlert): Promise<void> {
    const { push, yell, whispersEnabled, subscribers, broadcastWhisper, logger } = this.#deps;
    const { discord, yellFor, whisperFor } = alert;
    logger.info(`ALERT ${alert.label} (${alert.cities.join("/")}): ${discord ? discord.body : "not posted to Discord"}`);
    if (discord) await push(discord, alert.cities);
    if (!whispersEnabled) return;

    if (yellFor) for (const city of alert.cities) yell(city, yellFor(city));

    if (!whisperFor) return;
    let subs: readonly Subscriber[];
    try {
      subs = await subscribers();
    } catch (error) {
      logger.error(`subscribers: ${describeError(error)}`);
      return;
    }
    if (subs.length === 0) return;
    for (const { cities, members } of groupByRelevantCities(subs, alert.cities)) {
      broadcastWhisper(members.map((s) => s.name), withUnsubscribeHint(whisperFor(cities)), cities[0] ?? null, {
        cities,
        maxAgeMs: alert.whisperMaxAgeMs,
        since: alert.happenedAt,
      });
    }
  }

  /** Whisper just one side's subscribers (used by a buff DROP — no Discord/yell here; the caller
   *  handles the channel post). `timing` carries its max age and when its event happened. */
  async sendFactionWhisper(faction: Faction, line: string, timing: Pick<AlertWhisper, "maxAgeMs" | "since"> = {}): Promise<void> {
    const { whispersEnabled, subscribers, broadcastWhisper, logger } = this.#deps;
    if (!whispersEnabled) return;
    let subs: readonly Subscriber[];
    try {
      subs = await subscribers();
    } catch (error) {
      logger.error(`subscribers: ${describeError(error)}`);
      return;
    }
    const targets = subs.filter((s) => s.factions.includes(faction));
    if (targets.length === 0) return;
    broadcastWhisper(targets.map((s) => s.name), withUnsubscribeHint(line), faction, timing);
  }
}
