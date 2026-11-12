import type { RaidEvent } from "../watcher/raid-events.js";
import type { Faction } from "../watcher/buff-store.js";
import type { RaidZone } from "../watcher/raid-zone.js";
import type { NotifyMessage } from "./notifier.js";

/** The capital whose buff a faction's turn-in drops. */
export const CITY_FOR: Record<Faction, string> = { alliance: "Stormwind", horde: "Orgrimmar" };

/** Compact clock duration: "42m", "1h22m", "2h" — for status/yells/recaps. */
export function humanClock(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${rem}m`;
}

/**
 * Compact duration at DAY scale: "18d", "3d6h", "5h", "40m" — for waits too long for
 * `humanClock`, which tops out in hours and would render a fortnight as "432h".
 */
export function humanSpan(ms: number): string {
  const days = Math.floor(Math.max(0, ms) / 86_400_000);
  if (days < 1) return humanClock(ms);
  const hours = Math.round((Math.max(0, ms) - days * 86_400_000) / 3_600_000);
  // A remainder that rounds up to a full day belongs on the day count, not as "3d24h".
  if (hours >= 24) return `${days + 1}d`;
  return hours === 0 ? `${days}d` : `${days}d${hours}h`;
}

/** How to stop the alerts, said at the end of every one a subscriber is whispered — so the way out
 *  is never more than one whisper away. */
export const UNSUBSCRIBE_HINT = `Whisper "stop" to unsubscribe.`;

/** `line`, as whispered to a subscriber: with the way to unsubscribe after it. */
export function withUnsubscribeHint(line: string): string {
  return `${line} ${UNSUBSCRIBE_HINT}`;
}

/**
 * A note appended to a time-sensitive whisper that sat in the queue.
 *
 * The realm spam-mutes a burst of whispers, so the bot backs off and a broadcast to a few hundred
 * subscribers can take minutes to drain — measured at 6-14s per whisper once the mute engages,
 * against a configured 1.2s. A player receiving "park now" six minutes after the raid cleared
 * deserves to know it was late and that there is a delivery route that is not rate-limited.
 *
 * Null under the threshold: most whispers arrive in seconds, and a note on those is noise that
 * eats the whisper length limit for nothing.
 */
export function formatWhisperDelayNote(delayMs: number, thresholdMs = 60_000): string | null {
  if (delayMs < thresholdMs) return null;
  return ` (sent ${humanClock(delayMs)} late - lots of subscribers online. Whisper "discord" for instant alerts.)`;
}

/** Human list of the capitals a fresh buff could drop in ("Stormwind or Orgrimmar"). */
function cityList(cities: readonly Faction[]): string {
  const names = cities.map((faction) => CITY_FOR[faction]);
  if (names.length >= 2) return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  return names[0] ?? "a capital";
}


/**
 * A raid reached strength — the buff is ~a clear-time away. `typicalClear` is the reader-facing
 * "usually 30-50m" range (or "~45m" before enough data), so a reader can judge whether to park
 * now or come back. Discord channel post; pings the open sides' roles via the `push` factions arg.
 */
export function formatBuffAlert(
  zone: RaidZone,
  event: RaidEvent,
  cities: readonly Faction[],
  typicalClear?: string,
): NotifyMessage {
  const where = cityList(cities);
  if (event.kind === "raid-forming") {
    const id = event.number != null ? `Raid #${event.number}` : "A raid";
    const clear = typicalClear ? `, usually ${typicalClear} to clear` : "";
    return {
      kind: "entered",
      title: `🐲 ${zone.raidName} raid starting`,
      body: `${id} formed${clear}. Rallying Cry buff drops in ${where} on a clear.`,
    };
  }
  // A confirmed clear (Chronicle Onyxia kill) vs an inferred one (roster departure). Both merge the
  // recap (number + duration) with the park CTA into ONE post — a clear can drop a buff any time,
  // so we still hedge with "may" unless the kill is confirmed.
  const id = event.number != null ? `Raid #${event.number}` : "A raid";
  const after = event.durationMs != null ? ` after ~${humanClock(event.durationMs)}` : "";
  const body =
    event.killConfirmed === true
      ? `${id} cleared${after} - ${zone.boss} down, kill confirmed. Buff should drop in ${where}.`
      : `${id} cleared${after}. Buff may drop in ${where}.`;
  return { kind: "left", title: `🏁 ${zone.raidName} raid has ended`, body };
}

/** A single terse in-game whisper line for a raid-start / raid-ended park alert. */
export function formatBuffWhisper(
  zone: RaidZone,
  event: RaidEvent,
  cities: readonly Faction[],
  typicalClear?: string,
): string {
  const where = cityList(cities);
  if (event.kind === "raid-left") {
    return event.killConfirmed === true
      ? `${zone.raidName} raid cleared - ${zone.boss} down, kill confirmed. Buff should drop in ${where}.`
      : `${zone.raidName} raid cleared. Buff may drop in ${where}.`;
  }
  const id = event.number != null ? `Raid #${event.number}` : "a raid";
  const clear = typicalClear ? `, usually ${typicalClear} to clear` : "";
  return `${zone.raidName} raid starting (${id}${clear}). Rallying Cry buff drops in ${where} on a clear.`;
}

/**
 * The "about to clear" heads-up: a raid still in the lair has been in about as long as raids
 * usually take to clear, so a fresh Rallying Cry should drop soon when they finish — the pre-clear
 * "park NOW" moment, earlier than the reactive "ended" alert. `typicalClear` gives the reader the
 * spread so they can judge; the timing stays soft because clear times vary widely.
 */
export function formatRaidEnding(
  zone: RaidZone,
  raidNumber: number | null,
  cities: readonly Faction[],
  elapsedMs: number,
  typicalClear?: string,
): NotifyMessage {
  const id = raidNumber !== null ? `Raid #${raidNumber}` : "A raid";
  const typical = typicalClear ? ` (typical clear ${typicalClear})` : "";
  return {
    kind: "entered",
    title: `⏰ ${zone.raidName} raid might end soon`,
    body: `${id} has been in ~${humanClock(elapsedMs)}${typical}. Buff may drop soon in ${cityList(cities)}.`,
  };
}

/** The terse in-game whisper twin of the about-to-clear heads-up. */
export function formatRaidEndingWhisper(
  zone: RaidZone,
  raidNumber: number | null,
  cities: readonly Faction[],
  elapsedMs: number,
  typicalClear?: string,
): string {
  const num = raidNumber !== null ? `#${raidNumber} ` : "";
  const typical = typicalClear ? `, typical ${typicalClear}` : "";
  return `${zone.raidName} raid ${num}might end soon (~${humanClock(elapsedMs)} in${typical}). Buff may drop soon in ${cityList(cities)}.`;
}

/**
 * A raid that formed and got a heads-up, but left too soon to have killed its boss — a disband, not a
 * kill. Reports that no buff is coming so a reader who saw the "formed" alert isn't left expecting one;
 * `durationMs` shows how short it was.
 */
export function formatRaidDisbanded(zone: RaidZone, raidNumber: number | null, durationMs?: number): NotifyMessage {
  const id = raidNumber !== null ? `Raid #${raidNumber}` : "A raid";
  const after = durationMs != null ? ` after ~${humanClock(durationMs)}` : "";
  return {
    kind: "info",
    title: `🚫 ${zone.raidName} raid disbanded`,
    body: `${id} left${after} without clearing. No buff coming.`,
  };
}

/** The terse in-game whisper twin of the disband notice. */
export function formatRaidDisbandedWhisper(zone: RaidZone, raidNumber: number | null, durationMs?: number): string {
  const num = raidNumber !== null ? `#${raidNumber} ` : "";
  const after = durationMs != null ? ` (left after ~${humanClock(durationMs)})` : "";
  return `${zone.raidName} raid ${num}disbanded${after}. No buff coming.`;
}

/**
 * A buff just dropped (a listener heard the turn-in yell). Names the buff in full and the city.
 * No timestamp in the body — Discord stamps every message with its post time (= the drop time),
 * so a `<t:R>` here only renders "N hours ago" on scroll-back and contradicts the title. No
 * cooldown/duration line either — we track drops, not the buff on players.
 */
/**
 * The buff-drop channel post. When `savedHead` is set (no raid was in the lair when it dropped — see
 * `drop-origin.ts`), it appends one line explaining the drop came from a head turned in from an
 * earlier kill, so a reader understands why there was no heads-up. A fresh drop just reports the buff.
 */
export function formatBuffDropped(faction: Faction, head: RaidZone, savedHead = false): NotifyMessage {
  const city = CITY_FOR[faction];
  const body = savedHead
    ? `This one's a saved ${head.boss} head from an earlier kill - no raid was in the lair, so there was no heads-up.`
    : "The Rallying Cry of the Dragonslayer is up.";
  return {
    kind: "info",
    title: `🎉 ${head.boss} buff dropped in ${city}`,
    body,
  };
}

/** Plain-text in-game whisper of a buff drop, sent to that side's subscribers when the yell fires,
 *  naming whose head landed it. Just the news — no Discord link: that is for a player who asks
 *  ("discord", listed in help). */
export function formatBuffDroppedWhisper(faction: Faction, head: RaidZone): string {
  return `The Rallying Cry of the Dragonslayer just dropped in ${CITY_FOR[faction]} (${head.boss} head)!`;
}


/**
 * ADVANCE heads-up: an addon on the LFT channel reported an Onyxia head being turned in (OB_INC),
 * so the Rallying Cry should drop in `faction`'s capital within moments — BEFORE the NPC yell. This
 * is the one thing /who and the yell can never give us early. `witness` is who the addon saw turning
 * it in (named for now, while this goes to the ops channel and the source addon has few users).
 */
export function formatHeadIncoming(faction: Faction, witness: string): NotifyMessage {
  const city = CITY_FOR[faction];
  return {
    kind: "info",
    title: `⚡ Onyxia buff incoming in ${city}`,
    body: `A head is being turned in now (${witness}) - the Rallying Cry should drop in ${city} within moments.`,
  };
}

/** Guild-chat (/g) line welcoming a member who just accepted an invite. Everyone reading it is
 *  already in the guild, so it names no guild — short and warm. */
export function formatGuildWelcome(name: string): string {
  return `Welcome to the guild, ${name}! 🎉`;
}

/** A player's feedback/suggestion, as a plain Discord-channel message that names the
 *  sender and their realm. Posted via the bot (not the webhook), so it's plain content
 *  with markdown. */
export function formatFeedbackPost(from: string, text: string, server?: string): string {
  const who = server ? `${from} (${server})` : from;
  return `💬 **Suggestion from ${who}:**\n${text}`;
}

/** The faire's last known place, for the status yell. */
export interface CapitalStatusFaire {
  readonly zone: string;
  /** How long ago it was seen there. */
  readonly ageMs: number;
  /** Seen recently enough to state in the present tense; otherwise the look is dated. */
  readonly fresh: boolean;
}

/** A raid in progress for the status yell: which lair, its number and time in, and the lair's
 *  typical clear range (so a passer-by can judge). */
export interface CapitalStatusRaid {
  readonly zone: RaidZone;
  readonly number: number | null;
  readonly elapsedMs: number;
  readonly typicalClear?: string;
}

/** The most a yell may carry — the server cuts it off past this. */
export const YELL_MAX_CHARS = 255;

/**
 * The periodic status board yelled in a capital: the raids in progress (# and time in, with the
 * typical clear range so a passer-by can judge) and a park nudge — every clear can drop a fresh
 * buff — and where the Darkmoon Faire is, each followed by the subscribe/discord CTA.
 *
 * One raid in reads as a sentence; an Onyxia AND a BWL raid at once are listed tersely, tag by tag,
 * so both fit one yell. A lair with no raid in goes unmentioned — "no raid right now" is not news
 * worth a yell every few minutes. With neither a raid nor a faire to tell of, there is nothing to
 * yell: null. Should the whole board still overrun the yell cap, the faire line gives way to the raids.
 */
export function formatCapitalStatusYell(
  faction: Faction,
  raids: readonly CapitalStatusRaid[],
  /** Where the Darkmoon Faire was last seen. A recent look is stated in the present tense, an older
   *  one with its age — a yell reaches strangers who cannot ask a follow-up, so it never claims the
   *  present on old information. Null/undefined (nothing seen within a week) omits the line; the
   *  yell never shouts an "I do not know". */
  faire?: CapitalStatusFaire | null,
): string | null {
  if (raids.length === 0 && !faire) return null;
  const raidPart = raids.length > 0 ? raidStatusLine(raids) : null;
  // Bracketed like the [Onyxia] tag: in a busy capital the yell scrolls past, and the tag is what
  // a reader picks out. A second topic in the same yell needs the same handle.
  const fairePart = faire
    ? faire.fresh
      ? `[Darkmoon Faire] is in ${faire.zone}.`
      : `[Darkmoon Faire] was last seen in ${faire.zone} ~${humanSpan(faire.ageMs)} ago.`
    : null;
  const cta = `Whisper "subscribe" for pings, "discord" for discord notifications.`;
  const full = [raidPart, fairePart, cta].filter((part): part is string => part !== null).join(" ");
  if (full.length <= YELL_MAX_CHARS || raidPart === null) return full;
  return `${raidPart} ${cta}`;
}

function raidStatusLine(raids: readonly CapitalStatusRaid[]): string {
  const [only] = raids;
  if (raids.length === 1 && only) {
    const id = only.number !== null ? `#${only.number}, ` : "";
    const typical = only.typicalClear ? `, typical clear ${only.typicalClear}` : "";
    const name = only.zone.raidName;
    return `[${name}] ${name} raid in progress (${id}~${humanClock(only.elapsedMs)} in${typical}). The Rallying Cry buff may drop soon.`;
  }
  const each = raids.map((raid) => {
    const id = raid.number !== null ? ` #${raid.number}` : "";
    const typical = raid.typicalClear ? `, typical ${raid.typicalClear}` : "";
    return `[${raid.zone.raidName}] raid${id} ~${humanClock(raid.elapsedMs)} in${typical}.`;
  });
  return `${each.join(" ")} The Rallying Cry buff may drop soon.`;
}

// The realm down/up notification moved OUT of this (buff) channel: it is now a transient,
// self-deleting notice in the dedicated #server-status channel — see serverDownNotice /
// serverUpNotice and ServerStatusWidget.announce in status-widget.ts.
