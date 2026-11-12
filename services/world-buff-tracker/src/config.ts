import type { LogLevel } from "./logger.js";
import { DEFAULT_INTEGRITY_CHECKSUM } from "./crypto/integrity.js";
import { CLIENT_BUILD } from "./protocol/opcodes.js";
import { OCTOWOW_CDN } from "./net/client-resolver.js";
import type { GroupingMode } from "./watcher/raid-events.js";
import type { Faction } from "./watcher/buff-store.js";
import { isFaireLocation, type FaireLocation } from "./darkmoon/location.js";
import { DEFAULT_CORROBORATION, type CorroborationPolicy } from "./darkmoon/corroboration.js";

const GROUPING_MODES: readonly GroupingMode[] = ["auto", "guild", "lair"];

/** How /who and the buff relate to faction on this realm. */
export type RealmType = "crossfaction" | "faction";

function isGroupingMode(value: string): value is GroupingMode {
  return GROUPING_MODES.some((mode) => mode === value);
}

/**
 * How one lair is watched: where it is (/who area), how often it is polled, and the sizes and times
 * its raids are read by. Onyxia's lives in BotConfig's flat raid* fields (see {@link onyxiaWatch});
 * Blackwing Lair's has its own, since a 40-man raid of hours is nothing like a 20-minute Onyxia.
 */
export interface RaidWatchConfig {
  readonly areaId: number;
  readonly areaName: string;
  readonly pollIntervalMs: number;
  readonly minRaidSize: number;
  readonly raidClearSize: number;
  readonly raidStrengthSize: number;
  readonly raidLeftFloor: number;
  readonly raidDurationEstimateMs: number;
  readonly raidLearnMinSamples: number;
  readonly raidEndingLeadMs: number;
  readonly raidFillWindowMs: number;
  readonly raidRosterCap: number;
  readonly raidMinClearMs: number;
  readonly raidDisbandMs: number;
  readonly raidFreshWindowMs: number;
  readonly raidClearSustainedMs: number;
  readonly raidLockoutMs: number;
  readonly raidFormConfirmMs: number;
  /** A clear longer than this is not one raid — a merge or a bug — and is ignored. */
  readonly raidMaxClearMs: number;
}

/** A single Onyxia clear is not 6h+: past that it is a merge or a bug. */
export const ONYXIA_MAX_CLEAR_MS = 6 * 60 * 60_000;

/** Onyxia's watch, gathered from BotConfig's flat raid fields. */
export function onyxiaWatch(config: BotConfig): RaidWatchConfig {
  return {
    areaId: config.watchAreaId,
    areaName: config.watchAreaName,
    pollIntervalMs: config.pollIntervalMs,
    minRaidSize: config.minRaidSize,
    raidClearSize: config.raidClearSize,
    raidStrengthSize: config.raidStrengthSize,
    raidLeftFloor: config.raidLeftFloor,
    raidDurationEstimateMs: config.raidDurationEstimateMs,
    raidLearnMinSamples: config.raidLearnMinSamples,
    raidEndingLeadMs: config.raidEndingLeadMs,
    raidFillWindowMs: config.raidFillWindowMs,
    raidRosterCap: config.raidRosterCap,
    raidMinClearMs: config.raidMinClearMs,
    raidDisbandMs: config.raidDisbandMs,
    raidFreshWindowMs: config.raidFreshWindowMs,
    raidClearSustainedMs: config.raidClearSustainedMs,
    raidLockoutMs: config.raidLockoutMs,
    raidFormConfirmMs: config.raidFormConfirmMs,
    raidMaxClearMs: ONYXIA_MAX_CLEAR_MS,
  };
}

/** What a listener does once it reaches the world (per-character). */
export type OnLoginAction = "sit" | "interact" | "none";

/**
 * A city-parked yell listener: a second account whose only job is to hear its
 * capital's buff yell. Each has its own dedicated credentials as separate secrets,
 * and an optional on-login action (e.g. /sit, or interact with the nearest object).
 */
export interface ListenerConfig {
  readonly account: string;
  readonly password: string;
  readonly characterName: string;
  readonly onLogin: OnLoginAction;
  /** Which capital this listener stands in, so its /yell reaches that side's crowd. Null
   *  when unset — the listener still hears buff yells, it just can't be a yell mouthpiece. */
  readonly faction: Faction | null;
  /** Whether this listener may be its city's /yell mouthpiece. All listeners always join the whisper
   *  pool; this only governs the public city yell. Of a side's yellers in world, the one listed first
   *  in WOW_LISTENERS yells and the rest stand by for while it is away; yeller=false never yells.
   *  Default true. */
  readonly yeller: boolean;
  /** Log every NPC line it hears — says, emotes, whispers — not only the yells every listener logs.
   *  For a listener parked to learn what the NPCs beside it say (e.g. by Thrall). Default false. */
  readonly logNpcChat: boolean;
  /** On-site Darkmoon Faire detection for listeners parked at Elwynn or Mulgore. */
  readonly darkmoonWatchLocation: FaireLocation | null;
}

export interface BotConfig {
  readonly account: string;
  readonly password: string;
  readonly authHost: string;
  readonly authPort: number;
  readonly realm: string;
  readonly characterName: string;
  /** Dev toggle: when false the bot never logs the character in, freeing it for manual play. */
  readonly loginEnabled: boolean;
  /** Extra accounts parked in capitals to hear each faction's buff yell. */
  readonly listeners: readonly ListenerConfig[];
  /** Optional world-server override; when unset the realm list is used. */
  readonly worldHost: string | null;
  readonly worldPort: number | null;
  /** Client-integrity checksum for StrictVersionCheck servers; null disables it. */
  readonly integrityChecksum: Buffer | null;
  /** Client build advertised at logon (OctoWoW's custom build; changes on a client patch). */
  readonly build: number;
  /** Client build in the world auth session — OctoWoW sends stock 5875 here, not the logon build. */
  readonly worldBuild: number;
  /** Re-resolve the build + integrity checksum from the CDN when auth is version-rejected (self-heal on patch). */
  readonly autoResolve: boolean;
  /** OctoWoW client CDN base used for auto-resolve. */
  readonly clientCdn: string;
  /** How much agreement a player-broadcast faire sighting needs before the bot believes it. */
  readonly darkmoonCorroboration: CorroborationPolicy;
  /** Which faire site the watcher character is parked at, enabling first-hand detection of the
   *  faire from the NPCs beside it. Null = not parked at one, and the feature is off. */
  readonly darkmoonWatchLocation: FaireLocation | null;
  /** Silence this long from a parked listener means it cannot hear the capital it is meant to
   *  be standing in — the one failure that produces no symptom of its own. */
  readonly listenerSilenceMs: number;
  /** How close an Infernal, or a player on the wall of shame, may come to a parked listener before
   *  it logs out — near enough to be meant for it, far enough to be gone before it is in reach. */
  readonly listenerThreatRadiusYd: number;
  /** How long a listener that logged out for a threat stays out before logging back in. */
  readonly listenerStandDownMs: number;
  /** Whether a listener also leaves when a player on the wall of shame merely stands close. Off by
   *  default: their Inferno is caught as it is cast, so the listener can stay up beside them. */
  readonly listenerFleeShunnedPlayers: boolean;
  readonly watchAreaId: number;
  readonly watchAreaName: string;
  /** Members a cohort must reach for a raid to count as forming ("about to start") — when the
   *  "get ready to park" alert fires. Kept below the true raid strength for lead time. */
  readonly minRaidSize: number;
  /** Members the raid must reach to be "at strength" — when the duration clock starts and the
   *  clear tracker begins following it. The forming alert fires earlier (at minRaidSize), so
   *  the measured form→clear excludes the fill-up. Defaults to minRaidSize (single-point). */
  readonly raidStrengthSize: number;
  /** Below this many of the raid's ROSTER present, the raid is "leaving" — the clear floor.
   *  Held below the plateau so normal churn (repairs, DCs) isn't read as a departure.
   *  Defaults to minRaidSize. */
  readonly raidLeftFloor: number;
  /** Hysteresis floor: an active raid clears (and re-arms) when it drops below this. */
  readonly raidClearSize: number;
  /** Estimated Onyxia clear time, used to predict a raid's end until learned. */
  readonly raidDurationEstimateMs: number;
  /** Learned-median clear time replaces the estimate once this many raids are recorded. */
  readonly raidLearnMinSamples: number;
  /** Lead time for the "about to clear" heads-up: it fires once a raid still in the lair has been
   *  in to within this much of its predicted clear time, so a fresh Rallying Cry should drop soon.
   *  20 minutes by default: at 10, a quarter of raids had cleared before it fired, and half gave under
   *  ten minutes' warning; at 20, 4% clear first and three in four give ten minutes or more. */
  readonly raidEndingLeadMs: number;
  /** Arrival-cohort separation: a newcomer joins the tracked raid only if they first appeared
   *  within this long of formation (measured raid assembly is ~2-5 min), so the next raid isn't
   *  absorbed into the current one on a continuously-occupied lair. */
  readonly raidFillWindowMs: number;
  /** The tracked roster never grows past this — a backstop against absorbing a second raid. */
  readonly raidRosterCap: number;
  /** Floor on a plausible clear: shorter form→clear samples are churn, not a real raid,
   *  and are dropped so they can't poison the learned median downward. */
  readonly raidMinClearMs: number;
  /** A form→clear shorter than this (and NOT Chronicle-kill-confirmed) is a DISBAND — a raid that
   *  formed but gave up, not a kill. It fires no park-now and records no duration; if we alerted a
   *  forming for it, a stand-down retracts that. Held above the fastest real clear on record. */
  readonly raidDisbandMs: number;
  /** A buff drop with a raid seen in the lair within this long is a fresh, attributable kill; past
   *  it (with full census coverage) the drop is a saved head turned in from an earlier kill, and the
   *  drop post says so and takes no credit. Set above the slowest real turn-in observed (~78m tail),
   *  but the value is deliberately conservative — 40m keeps only the confident-fresh cases, and slow
   *  turn-ins beyond it are labelled "saved head" (an honest under-claim, never a false credit). */
  readonly raidFreshWindowMs: number;
  /** How long the raid's roster must stay gone to count a departure as a real clear rather
   *  than a wipe (they run back). 3 min — most corpse runs are back inside it; a raid whose run-back
   *  takes longer resumes, timer and all, when its members return (see ClearTracker). */
  readonly raidClearSustainedMs: number;
  /** A player counted in one raid cannot found or join a DIFFERENT raid for this long. Onyxia is a
   *  lockout boss — the same character can't be in two raids — so this stops a raid's members,
   *  lingering in the lair after the kill, from re-tripping "raid formed" as a phantom duplicate. */
  readonly raidLockoutMs: number;
  /** After reaching strength, the roster must hold continuously for this long before the "raid
   *  forming" alert fires — filters a group that assembles and leaves without committing. A
   *  disconnect or a drop below the floor and back resets the count. Default 0 = fire immediately. */
  readonly raidFormConfirmMs: number;
  /** Blackwing Lair's watch — its raids alerted like Onyxia's, and what a Nefarian-head drop is read
   *  against. Null when WOW_BWL_ENABLED turns it off: no BWL polls, alerts or status. */
  readonly blackwingLair: RaidWatchConfig | null;
  /** How often the buff-status board is yelled in each capital; 0, the default, never. The one-off
   *  raid event yells — forming, ending soon, cleared, disbanded — are not this. */
  readonly statusYellMs: number;
  /** A time-sensitive whisper still queued past this is dropped unsent (default 5 min), so a
   *  throttled queue never delivers a "park now" long after the raid it was about cleared. */
  readonly whisperMaxAgeMs: number;
  /** After the realm answers again post-outage, wait this long confirming it stays up before posting
   *  "back up" — so a flappy crash-recovery doesn't announce recovery prematurely (default 5 min). */
  readonly realmStableMs: number;
  /** Whether to post realm "down"/"back up" notices to the community channel at all (default true).
   *  A kill-switch for a flapping realm: set WOW_REALM_STATUS=false to silence them instantly. */
  readonly realmStatusEnabled: boolean;
  /** Realm counts as recovered only once its keepalive ping's median is at/under this (ms). */
  readonly realmMaxPingMs: number;
  /** ...and its spread (max-min over the window) is at/under this (ms) — steady, not spiking. */
  readonly realmPingSpreadMs: number;
  /** How long a sent park-alert suppresses a repeat for the same city+kind, so a redeploy,
   *  a wipe (count dipping and recovering) or roster churn can't re-broadcast the same
   *  cycle. Reset early when a fresh buff actually drops for that city. */
  readonly broadcastDedupMs: number;
  /** Server Rallying Cry cooldown per faction (ms); park alerts are suppressed for a side still
   *  within it. 0 = no cooldown (a buff can drop on any clear). */
  readonly buffCooldownMs: number;
  /** crossfaction (Octo: /who is mixed, gate both cities) or faction (split per side). */
  readonly realmType: RealmType;
  /** How to tell concurrent raids apart: auto (guild raids + a pickup pool), guild, or lair. */
  readonly raidGrouping: GroupingMode;
  /** Legacy selector for the count/temporal detector. Both are now only shadow-logged for
   *  comparison — the FORMING and CLEAR alerts are driven by the ClearTracker's roster state
   *  (formation at strength, sustained-departure clear), so this no longer selects a driver. */
  readonly raidDetector: "count" | "temporal";
  /** Post a "bot online" message on startup. Off by default to stay quiet. */
  readonly announceStartup: boolean;
  /** Whether the in-game whisper interface (commands + subscriber alerts) is active. */
  readonly whispersEnabled: boolean;
  /** Gate broadcast whispers on a live presence sweep — before fanning a broadcast out, briefly
   *  friend each target to learn who is online and skip the offline ones (they'd only burn a
   *  throttle slot on an undeliverable whisper). Fail-open, so off-by-default is purely a rollout
   *  choice. Off unless WOW_PRESENCE_ENABLED is set. */
  readonly presenceEnabled: boolean;
  /** One-off live check: on boot, sweep every subscriber once and log the online/offline split
   *  WITHOUT whispering — proves the add→read→remove pipeline against the real server before the
   *  gate is turned on. Off unless WOW_PRESENCE_PROBE is set. */
  readonly presenceProbe: boolean;
  /** How long a name's online/offline verdict from a presence sweep stays fresh, so clustered
   *  broadcasts (a drop then its about-to-clear) reuse one sweep instead of re-churning the friends
   *  list (default 90s). */
  readonly presenceCacheMs: number;
  /** Delay between outgoing whispers (ms) to stay under the server's chat throttle. */
  readonly whisperThrottleMs: number;
  /** Discord bot token for posting to the notification/feedback channels; null disables them. */
  readonly discordBotToken: string | null;
  /** The community Discord server invite link, shared by the in-game "discord" command. Null = unset. */
  readonly discordServerInvite: string | null;
  /** Global chat channel the LISTENERS join to READ addon world-buff broadcasts (Turtle's "LFT").
   *  Null = disabled (default). Flag-gated OFF because reading a channel is unconfirmed protocol —
   *  set WOW_LFT_CHANNEL=LFT to enable the observe hook and capture the real messages. */
  readonly lftChannel: string | null;
  /** Channel the "feedback" command posts player suggestions to (via the bot). Null = not set,
   *  and feedback is still saved + acknowledged, just not posted to Discord. */
  readonly discordFeedbackChannelId: string | null;
  /** Channel the bot posts Onyxia buff notifications to (via the bot token). */
  readonly discordOnyxiaChannelId: string | null;
  /** Channel the bot posts OPERATIONAL/error notices to (bot stopped, auth failure, self-heal,
   *  store outage). Null = those stay log-only. Kept separate from the public buff channel. */
  readonly discordErrorsChannelId: string | null;
  /** Channel for STAGED / test alerts — features being validated before they go to the public buff
   *  channel (e.g. the LFT head-incoming advance warning). Null falls back to the errors channel. */
  readonly discordTestsChannelId: string | null;
  /** Channel the bot keeps a live SERVER-STATUS widget in: one message, edited in place, showing the
   *  realm up/down + health at a glance. Distinct from the community down/up event posts (which stay
   *  in the Onyxia channel with their role pings). Null = the widget is off. */
  readonly discordServerStatusChannelId: string | null;
  /** Channel holding the live Darkmoon Faire board, edited in place. Null = no board. */
  readonly discordDarkmoonChannelId: string | null;
  /** Channel holding the pinned wall of shame: every player who killed a bot listener. Null = no wall. */
  readonly discordWallOfShameChannelId: string | null;
  /** Channel the Blackwing Lair raid alerts and Nefarian-head drops are posted to. Null = the Onyxia
   *  channel, where every Rallying Cry goes otherwise. */
  readonly discordBwlChannelId: string | null;
  /** How often the live server-status widget re-renders (to keep uptime/latency fresh), in ms. The
   *  realm up/down transitions refresh it immediately; this is the idle cadence between them. */
  readonly statusWidgetRefreshMs: number;
  /** How long the transient "server up/down" notice stays in the status channel before the bot
   *  deletes it, in ms. It fires the unread/push, then is removed so only the pinned status embed
   *  remains when a reader opens the channel. A few seconds makes the notification register reliably
   *  across clients; 0 deletes it immediately (at the risk of some clients never showing it). */
  readonly statusNoticeLingerMs: number;
  /** Also reflect up/down in the #server-status channel's NAME (🟢/🔴 prefix), not just the embed —
   *  a glance in the sidebar. Needs the bot to have Manage Channels there; the embed alone doesn't.
   *  Off by default. Renamed only on a confirmed up/down transition, so it stays under Discord's
   *  ~2-renames-per-10-min channel limit. */
  readonly statusChannelRenameEnabled: boolean;
  /** Base name the status channel is renamed around (the status emoji is prefixed): "server-status"
   *  becomes "🟢server-status" / "🔴server-status". Only the leading emoji ever changes. */
  readonly statusChannelName: string;
  /** Role pinged for alliance (Stormwind) notifications, and horde (Orgrimmar) notifications —
   *  a Discord-side opt-in, unrelated to any in-game character's chosen side. */
  readonly discordAllianceRoleId: string | null;
  readonly discordHordeRoleId: string | null;
  /** MongoDB connection string for the subscriber store; null keeps subscribers in memory. */
  readonly mongodbUri: string | null;
  /** MongoDB database name for the subscriber store. */
  readonly mongodbDb: string;
  readonly pollIntervalMs: number;
  /** How long to wait for a /who reply before giving up. Under peak server load /who
   *  can be slow, so this is tunable — raise it if the watcher logs repeated timeouts. */
  readonly whoTimeoutMs: number;
  /** The least time between any two /who the bot sends, whichever characters send them. The
   *  server also throttles /who per IP, so lookups fired at once from several characters (a packed
   *  lair's class slices) trip it and it stops replying; spacing them keeps it answering. */
  readonly whoSliceDelayMs: number;
  /** The least time between two /who from one character. OctoWoW silently drops a /who sent within
   *  about 30s of the same character's last, so the lookup only times out. Default 31s. */
  readonly whoMinGapMs: number;
  /** Max distance (yards) a GameObject may be for an "interact" listener to `use` it (sit on
   *  the bench). Tunable because the server range-checks the use, so it needs the character
   *  parked within reach of the bench. */
  readonly interactMaxYd: number;
  /** If set, an "interact" listener only `use`s a GameObject of THIS entry (the stone bench),
   *  ignoring closer non-bench clutter. Null = use whatever object is nearest. */
  readonly interactEntry: number | null;
  /** Guild the bot represents — credited in the intro whisper. */
  readonly guildName: string;
  /** Whether a player can get a guild invite from the bot: the "invite" command, its help line, and
   *  the offer to a guild question. Off by default — only on while WOW_GUILD_INVITE says so. */
  readonly guildInviteEnabled: boolean;
  /** Community name used in the intro whisper. */
  readonly community: string;
  /** Chronicle early-confirm: during a departure we detect, a fresh community Onyxia-kill log by
   *  one of the raid's roster confirms the clear and lets us skip the sustained wait (never a
   *  trigger on its own). Needs MongoDB for the dedup ledger; off without it. */
  readonly chronicleEnabled: boolean;
  readonly logLevel: LogLevel;
}

const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

/** Read and validate configuration from an environment map. Throws listing all problems. */
export function loadConfig(env: NodeJS.ProcessEnv): BotConfig {
  const errors: string[] = [];

  const required = (key: string): string => {
    const value = env[key]?.trim();
    if (!value) {
      errors.push(`${key} is required`);
      return "";
    }
    return value;
  };

  const intWithDefault = (key: string, fallback: number, min: number): number => {
    const raw = env[key]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min) {
      errors.push(`${key} must be an integer >= ${min}`);
      return fallback;
    }
    return value;
  };

  const account = required("WOW_ACCOUNT");
  const password = required("WOW_PASSWORD");
  const authHost = env.WOW_AUTH_HOST?.trim() || "play.octowow.st";
  const authPort = intWithDefault("WOW_AUTH_PORT", 3724, 1);
  const realm = env.WOW_REALM?.trim() || "N'Zoth";
  const characterName = required("WOW_CHARACTER");

  // Dev toggle: WOW_LOGIN_ENABLED=false/0/none keeps the bot logged out so you can
  // play the character yourself without it fighting you for the one allowed session.
  const loginRaw = env.WOW_LOGIN_ENABLED?.trim().toLowerCase();
  const loginEnabled = loginRaw !== "false" && loginRaw !== "0" && loginRaw !== "none";

  // Per-listener enum parsers (shared by the fields below).
  const parseOnLogin = (raw: string | undefined, ctx: string): OnLoginAction => {
    const value = raw?.trim().toLowerCase();
    if (value === "sit" || value === "interact" || value === "none") return value;
    if (value) errors.push(`${ctx} must be "sit", "interact", or "none"`);
    return "none";
  };
  const parseFaction = (raw: string | undefined, ctx: string): Faction | null => {
    const value = raw?.trim().toLowerCase();
    if (value === "alliance" || value === "horde") return value;
    if (value) errors.push(`${ctx} must be "alliance" or "horde"`);
    return null;
  };

  // Yell listeners: capital-parked characters that hear their side's buff yell and share the whisper
  // load. Configured as ONE JSON array in WOW_LISTENERS — each object is a character:
  //   [{"account":"A","password":"p","character":"Char","faction":"horde","onLogin":"sit","yeller":true}]
  // account/password/character are required; faction ("alliance"|"horde") defaults null, onLogin
  // ("sit"|"interact"|"none") defaults "none", yeller (bool) defaults true, logNpcChat (bool) defaults
  // false. Unset = no listeners (watcher only). JSON so a password may contain any character and
  // fields are self-labelling.
  const listeners: ListenerConfig[] = [];
  const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
  const optString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
  const listenersRaw = env.WOW_LISTENERS?.trim();
  if (listenersRaw) {
    let parsed: unknown = [];
    try {
      parsed = JSON.parse(listenersRaw);
    } catch (error) {
      errors.push(`WOW_LISTENERS is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!Array.isArray(parsed)) {
      errors.push('WOW_LISTENERS must be a JSON array of listener objects, e.g. [{"account":"…","password":"…","character":"…"}]');
    } else {
      parsed.forEach((entry, i) => {
        const nth = i + 1;
        if (!isObject(entry)) {
          errors.push(`WOW_LISTENERS entry ${nth} must be an object`);
          return;
        }
        const requiredString = (key: string): string => {
          const value = entry[key];
          if (typeof value === "string" && value.trim()) return value.trim();
          errors.push(`WOW_LISTENERS entry ${nth} needs a non-empty "${key}"`);
          return "";
        };
        // faction/onLogin: reject a present-but-non-string value; an absent one defaults.
        if (entry.faction !== undefined && optString(entry.faction) === undefined)
          errors.push(`WOW_LISTENERS entry ${nth} "faction" must be a string ("alliance" or "horde")`);
        if (entry.onLogin !== undefined && optString(entry.onLogin) === undefined)
          errors.push(`WOW_LISTENERS entry ${nth} "onLogin" must be a string ("sit", "interact", or "none")`);
        let yeller = true;
        if (typeof entry.yeller === "boolean") yeller = entry.yeller;
        else if (entry.yeller !== undefined) errors.push(`WOW_LISTENERS entry ${nth} "yeller" must be true or false`);
        let logNpcChat = false;
        if (typeof entry.logNpcChat === "boolean") logNpcChat = entry.logNpcChat;
        else if (entry.logNpcChat !== undefined) {
          errors.push(`WOW_LISTENERS entry ${nth} "logNpcChat" must be true or false`);
        }
        const listenerFaireRaw = entry.darkmoonWatchLocation;
        const listenerFaireSite =
          typeof listenerFaireRaw === "string" ? listenerFaireRaw.trim().toLowerCase() : null;
        if (listenerFaireRaw !== undefined && (listenerFaireSite === null || !isFaireLocation(listenerFaireSite))) {
          errors.push(`WOW_LISTENERS entry ${nth} "darkmoonWatchLocation" must be "elwynn" or "mulgore"`);
        }
        listeners.push({
          account: requiredString("account"),
          password: entry.password === undefined ? password : requiredString("password"),
          characterName: requiredString("character"),
          faction: parseFaction(optString(entry.faction), `WOW_LISTENERS entry ${nth} "faction"`),
          onLogin: parseOnLogin(optString(entry.onLogin), `WOW_LISTENERS entry ${nth} "onLogin"`),
          yeller,
          logNpcChat,
          darkmoonWatchLocation:
            listenerFaireSite !== null && isFaireLocation(listenerFaireSite) ? listenerFaireSite : null,
        });
      });
    }
  }

  const worldHost = env.WOW_WORLD_HOST?.trim() || null;
  const worldPortRaw = env.WOW_WORLD_PORT?.trim();
  const worldPort = worldPortRaw ? intWithDefault("WOW_WORLD_PORT", 0, 1) : null;

  // Client-integrity checksum: defaults to the verified 1.12.1 value; "none" disables.
  const rawChecksum = env.WOW_INTEGRITY_CHECKSUM?.trim();
  let integrityChecksum: Buffer | null = null;
  if (rawChecksum !== "none") {
    const hex = rawChecksum && rawChecksum.length > 0 ? rawChecksum : DEFAULT_INTEGRITY_CHECKSUM;
    if (!/^[0-9a-fA-F]{40}$/.test(hex)) {
      errors.push("WOW_INTEGRITY_CHECKSUM must be 40 hex chars (20 bytes) or 'none'");
    } else {
      integrityChecksum = Buffer.from(hex, "hex");
    }
  }

  const build = intWithDefault("WOW_BUILD", CLIENT_BUILD, 1);
  const worldBuild = intWithDefault("WOW_WORLD_BUILD", 5875, 1);

  const autoResolveRaw = env.WOW_AUTO_RESOLVE?.trim().toLowerCase();
  const autoResolve =
    autoResolveRaw !== "false" && autoResolveRaw !== "0" && autoResolveRaw !== "none";
  const clientCdn = env.WOW_CLIENT_CDN?.trim() || OCTOWOW_CDN;

  const watchAreaId = intWithDefault("WATCH_AREA_ID", 2159, 1);
  const watchAreaName = env.WATCH_AREA_NAME?.trim() || "Onyxia's Lair";
  const minRaidSize = intWithDefault("WOW_MIN_RAID_SIZE", 15, 1);
  const raidClearSize = intWithDefault(
    "WOW_RAID_CLEAR_SIZE",
    Math.max(1, Math.floor(minRaidSize / 3)),
    1,
  );
  if (raidClearSize >= minRaidSize) {
    errors.push("WOW_RAID_CLEAR_SIZE must be less than WOW_MIN_RAID_SIZE");
  }
  // "At strength": the duration clock starts here (>= forming, so the alert stays early).
  const raidStrengthSize = intWithDefault("WOW_RAID_STRENGTH_SIZE", minRaidSize, 1);
  if (raidStrengthSize < minRaidSize) {
    errors.push("WOW_RAID_STRENGTH_SIZE must be >= WOW_MIN_RAID_SIZE");
  }
  // The "leaving" floor for clear detection — held below the plateau, so it can't exceed strength.
  const raidLeftFloor = intWithDefault("WOW_RAID_LEFT_FLOOR", minRaidSize, 1);
  if (raidLeftFloor > raidStrengthSize) {
    errors.push("WOW_RAID_LEFT_FLOOR must be <= WOW_RAID_STRENGTH_SIZE");
  }

  const raidDurationEstimateMs = intWithDefault("WOW_RAID_DURATION_MINUTES", 45, 1) * 60_000;
  const raidLearnMinSamples = intWithDefault("WOW_RAID_LEARN_MIN_SAMPLES", 15, 1);
  const raidEndingLeadMs = intWithDefault("WOW_RAID_ENDING_LEAD_MINUTES", 20, 1) * 60_000;
  const raidFillWindowMs = intWithDefault("WOW_RAID_FILL_WINDOW_MINUTES", 5, 1) * 60_000;
  const raidRosterCap = intWithDefault("WOW_RAID_ROSTER_CAP", 30, 1);
  const raidMinClearMs = intWithDefault("WOW_RAID_MIN_CLEAR_MINUTES", 10, 1) * 60_000;
  const raidDisbandMs = intWithDefault("WOW_RAID_DISBAND_MINUTES", 20, 1) * 60_000;
  const raidFreshWindowMs = intWithDefault("WOW_DROP_FRESH_WINDOW_MINUTES", 40, 1) * 60_000;
  const raidClearSustainedMs = intWithDefault("WOW_RAID_CLEAR_SUSTAINED_MINUTES", 3, 1) * 60_000;
  const raidLockoutMs = intWithDefault("WOW_RAID_LOCKOUT_HOURS", 2, 1) * 60 * 60_000;
  const raidFormConfirmMs = intWithDefault("WOW_RAID_FORM_CONFIRM_MINUTES", 0, 0) * 60_000;

  // Blackwing Lair, watched on its own: a 40-man raid that takes hours, so every size and time has
  // its own WOW_BWL_* knob and default. On unless WOW_BWL_ENABLED turns it off.
  const bwlRaw = env.WOW_BWL_ENABLED?.trim().toLowerCase();
  const bwlEnabled = bwlRaw !== "false" && bwlRaw !== "0" && bwlRaw !== "none";
  const blackwingLair = ((): RaidWatchConfig | null => {
    if (!bwlEnabled) return null;
    const minutes = (key: string, fallback: number, min: number): number => intWithDefault(key, fallback, min) * 60_000;
    const bwlMinRaidSize = intWithDefault("WOW_BWL_MIN_RAID_SIZE", 20, 1);
    const bwlClearSize = intWithDefault("WOW_BWL_RAID_CLEAR_SIZE", Math.max(1, Math.floor(bwlMinRaidSize / 3)), 1);
    if (bwlClearSize >= bwlMinRaidSize) errors.push("WOW_BWL_RAID_CLEAR_SIZE must be less than WOW_BWL_MIN_RAID_SIZE");
    const bwlStrengthSize = intWithDefault("WOW_BWL_RAID_STRENGTH_SIZE", bwlMinRaidSize, 1);
    if (bwlStrengthSize < bwlMinRaidSize) errors.push("WOW_BWL_RAID_STRENGTH_SIZE must be >= WOW_BWL_MIN_RAID_SIZE");
    const bwlLeftFloor = intWithDefault("WOW_BWL_RAID_LEFT_FLOOR", bwlMinRaidSize, 1);
    if (bwlLeftFloor > bwlStrengthSize) errors.push("WOW_BWL_RAID_LEFT_FLOOR must be <= WOW_BWL_RAID_STRENGTH_SIZE");
    const bwlDisbandMs = minutes("WOW_BWL_RAID_DISBAND_MINUTES", 60, 1);
    const bwlMinClearMs = minutes("WOW_BWL_RAID_MIN_CLEAR_MINUTES", 30, 1);
    const bwlMaxClearMs = intWithDefault("WOW_BWL_RAID_MAX_CLEAR_HOURS", 10, 1) * 60 * 60_000;
    if (bwlMaxClearMs <= bwlMinClearMs) errors.push("WOW_BWL_RAID_MAX_CLEAR_HOURS must exceed WOW_BWL_RAID_MIN_CLEAR_MINUTES");
    return {
      areaId: intWithDefault("WOW_BWL_AREA_ID", 2677, 1),
      areaName: env.WOW_BWL_AREA_NAME?.trim() || "Blackwing Lair",
      // Slower than Onyxia's poll: a BWL raid lasts hours, and every /who spends the per-IP budget.
      pollIntervalMs: intWithDefault("WOW_BWL_POLL_INTERVAL_SECONDS", 60, 5) * 1000,
      minRaidSize: bwlMinRaidSize,
      raidClearSize: bwlClearSize,
      raidStrengthSize: bwlStrengthSize,
      raidLeftFloor: bwlLeftFloor,
      raidDurationEstimateMs: minutes("WOW_BWL_RAID_DURATION_MINUTES", 150, 1),
      raidLearnMinSamples: intWithDefault("WOW_BWL_RAID_LEARN_MIN_SAMPLES", 10, 1),
      raidEndingLeadMs: minutes("WOW_BWL_RAID_ENDING_LEAD_MINUTES", 20, 1),
      raidFillWindowMs: minutes("WOW_BWL_RAID_FILL_WINDOW_MINUTES", 15, 1),
      raidRosterCap: intWithDefault("WOW_BWL_RAID_ROSTER_CAP", 45, 1),
      raidMinClearMs: bwlMinClearMs,
      raidDisbandMs: bwlDisbandMs,
      raidFreshWindowMs: minutes("WOW_BWL_DROP_FRESH_WINDOW_MINUTES", 40, 1),
      raidClearSustainedMs: minutes("WOW_BWL_RAID_CLEAR_SUSTAINED_MINUTES", 5, 1),
      raidLockoutMs: intWithDefault("WOW_BWL_RAID_LOCKOUT_HOURS", 4, 1) * 60 * 60_000,
      raidFormConfirmMs: minutes("WOW_BWL_RAID_FORM_CONFIRM_MINUTES", 0, 0),
      raidMaxClearMs: bwlMaxClearMs,
    };
  })();
  // How long a parked listener may hear NO npc chat before it is reported as deaf. Capitals are
  // never really silent — criers and roaming vendors yell through the day — so a listener that
  // hears nothing for hours is not where it needs to be. Generous by default: the quietest
  // correctly-parked character measured here heard roughly one yell an hour.
  const listenerSilenceMs = intWithDefault("WOW_LISTENER_SILENCE_HOURS", 6, 1) * 60 * 60_000;
  // An Infernal's Immolation only reaches a few yards, and a capital square is wide: 40 yards is near
  // enough to be meant for the listener and leaves time to log out (instant in a city) first.
  const listenerThreatRadiusYd = intWithDefault("WOW_LISTENER_THREAT_RADIUS_YARDS", 40, 5);
  const listenerStandDownMs = intWithDefault("WOW_LISTENER_STAND_DOWN_MINUTES", 5, 1) * 60_000;
  const fleeShunnedRaw = env.WOW_LISTENER_FLEE_SHUNNED_PLAYERS?.trim().toLowerCase();
  const listenerFleeShunnedPlayers = fleeShunnedRaw === "true" || fleeShunnedRaw === "1";
  // Off by default: a city-wide yell every few minutes, the same words each time, wore on players.
  const statusYellMs = intWithDefault("WOW_STATUS_YELL_MINUTES", 0, 0) * 60_000;
  // A time-sensitive whisper (park alert, buff drop) still queued past this is dropped unsent — a
  // heavily-throttled queue would otherwise deliver a "park now" minutes after the raid cleared.
  const whisperMaxAgeMs = intWithDefault("WOW_WHISPER_MAX_AGE_MINUTES", 5, 1) * 60_000;
  const realmStableMs = intWithDefault("WOW_REALM_STABLE_MINUTES", 5, 1) * 60_000;
  // Realm is "back up" only once its keepalive ping is reasonable AND steady over the stability
  // window: median RTT at/under maxPingMs, spread (max-min) at/under pingSpreadMs. A raid can't run
  // on a laggy server, so recovery waits for a healthy ping with no cap.
  const realmMaxPingMs = intWithDefault("WOW_REALM_MAX_PING_MS", 300, 1);
  const realmPingSpreadMs = intWithDefault("WOW_REALM_PING_SPREAD_MS", 200, 1);
  // Dedup window: how long a (city, kind) park-alert stays muted if no fresh drop is heard, so a
  // redeploy/wipe/roster-churn re-emitting the same event doesn't re-alert. A drop reopens it
  // sooner (new cycle); this is only the ceiling, separate from the buff cooldown below.
  const broadcastDedupMs = intWithDefault("WOW_BROADCAST_DEDUP_MINUTES", 120, 1) * 60_000;
  // Server Rallying Cry cooldown PER FACTION, in minutes: after a buff drops, a fresh one can't drop
  // for that side until this elapses, so park alerts (forming / about-to-clear / clear) are
  // suppressed for it meanwhile. 0 = NO cooldown (OctoWoW's default — a buff drops on any clear).
  const buffCooldownMs = intWithDefault("WOW_BUFF_COOLDOWN_MINUTES", 0, 0) * 60_000;

  const realmRaw = env.WOW_REALM_TYPE?.trim().toLowerCase();
  const realmType: RealmType = realmRaw === "faction" ? "faction" : "crossfaction";
  if (realmRaw && realmRaw !== "faction" && realmRaw !== "crossfaction") {
    errors.push('WOW_REALM_TYPE must be "crossfaction" or "faction"');
  }

  const groupingRaw = env.WOW_RAID_GROUPING?.trim().toLowerCase();
  const raidGrouping: GroupingMode = groupingRaw && isGroupingMode(groupingRaw) ? groupingRaw : "auto";
  if (groupingRaw && !isGroupingMode(groupingRaw)) {
    errors.push(`WOW_RAID_GROUPING must be one of ${GROUPING_MODES.join(", ")}`);
  }

  const detectorRaw = env.WOW_RAID_DETECTOR?.trim().toLowerCase();
  const raidDetector: "count" | "temporal" = detectorRaw === "temporal" ? "temporal" : "count";
  if (detectorRaw && detectorRaw !== "count" && detectorRaw !== "temporal") {
    errors.push('WOW_RAID_DETECTOR must be "count" or "temporal"');
  }

  const announceStartupRaw = env.WOW_ANNOUNCE_STARTUP?.trim().toLowerCase();
  const announceStartup = announceStartupRaw === "true" || announceStartupRaw === "1";

  const whispersRaw = env.WOW_WHISPERS?.trim().toLowerCase();
  const whispersEnabled = whispersRaw !== "false" && whispersRaw !== "0" && whispersRaw !== "none";
  const realmStatusRaw = env.WOW_REALM_STATUS?.trim().toLowerCase();
  const realmStatusEnabled = realmStatusRaw !== "false" && realmStatusRaw !== "0" && realmStatusRaw !== "none";
  const presenceRaw = env.WOW_PRESENCE_ENABLED?.trim().toLowerCase();
  const presenceEnabled = presenceRaw === "true" || presenceRaw === "1";
  const presenceProbeRaw = env.WOW_PRESENCE_PROBE?.trim().toLowerCase();
  const presenceProbe = presenceProbeRaw === "true" || presenceProbeRaw === "1";
  const presenceCacheMs = intWithDefault("WOW_PRESENCE_CACHE_SECONDS", 90, 1) * 1_000;
  const whisperThrottleMs = intWithDefault("WOW_WHISPER_THROTTLE_MS", 1200, 200);
  const discordBotToken = env.DISCORD_BOT_TOKEN?.trim() || null;
  const discordServerInvite = env.DISCORD_SERVER_INVITE_URL?.trim() || null;
  const lftChannel = env.WOW_LFT_CHANNEL?.trim() || null;
  const discordFeedbackChannelId = env.DISCORD_FEEDBACK_CHANNEL_ID?.trim() || null;
  const discordOnyxiaChannelId = env.DISCORD_ONYXIA_CHANNEL_ID?.trim() || null;
  const discordErrorsChannelId = env.DISCORD_ERRORS_CHANNEL_ID?.trim() || null;
  const discordTestsChannelId = env.DISCORD_TESTS_CHANNEL_ID?.trim() || null;
  const discordServerStatusChannelId = env.DISCORD_SERVER_STATUS_CHANNEL_ID?.trim() || null;
  const discordDarkmoonChannelId = env.DISCORD_DARKMOON_CHANNEL_ID?.trim() || null;
  const discordWallOfShameChannelId = env.DISCORD_WALL_OF_SHAME_CHANNEL_ID?.trim() || null;
  const discordBwlChannelId = env.DISCORD_BWL_CHANNEL_ID?.trim() || null;
  if (discordBwlChannelId && !/^[0-9]+$/.test(discordBwlChannelId)) {
    errors.push("DISCORD_BWL_CHANNEL_ID must be a numeric Discord channel id");
  }
  const statusWidgetRefreshMs = intWithDefault("WOW_STATUS_REFRESH_SECONDS", 300, 30) * 1000;
  const statusNoticeLingerMs = intWithDefault("WOW_STATUS_NOTICE_LINGER_SECONDS", 5, 0) * 1000;
  const statusRenameRaw = env.WOW_STATUS_CHANNEL_RENAME?.trim().toLowerCase();
  const statusChannelRenameEnabled = statusRenameRaw === "true" || statusRenameRaw === "1";
  const statusChannelName = env.WOW_STATUS_CHANNEL_NAME?.trim() || "server-status";
  const discordAllianceRoleId = env.DISCORD_ALLIANCE_ROLE_ID?.trim() || null;
  const discordHordeRoleId = env.DISCORD_HORDE_ROLE_ID?.trim() || null;
  for (const [name, value] of [
    ["DISCORD_ALLIANCE_ROLE_ID", discordAllianceRoleId],
    ["DISCORD_HORDE_ROLE_ID", discordHordeRoleId],
  ] as const) {
    if (value && !/^\d+$/.test(value)) errors.push(`${name} must be a numeric Discord role id`);
  }
  if (discordDarkmoonChannelId && !/^\d+$/.test(discordDarkmoonChannelId)) {
    errors.push("DISCORD_DARKMOON_CHANNEL_ID must be a numeric Discord channel id");
  }
  if (discordWallOfShameChannelId && !/^\d+$/.test(discordWallOfShameChannelId)) {
    errors.push("DISCORD_WALL_OF_SHAME_CHANNEL_ID must be a numeric Discord channel id");
  }

  // Where the watcher's character is parked, when it is parked at a faire site. Set it and the bot
  // sees the faire first-hand from the NPCs standing next to it. Unset (the default) = not at a
  // faire site, and on-site detection is off. Configuration rather than something detected, because
  // a unit update says what is NEARBY, never which zone we are standing in.
  const darkmoonWatchRaw = env.DARKMOON_WATCH_LOCATION?.trim().toLowerCase();
  const darkmoonWatchLocation =
    darkmoonWatchRaw && isFaireLocation(darkmoonWatchRaw) ? darkmoonWatchRaw : null;
  if (darkmoonWatchRaw && darkmoonWatchLocation === null) {
    errors.push(`DARKMOON_WATCH_LOCATION must be "elwynn" or "mulgore"`);
  }

  // Tamper resistance for the LFT sighting feed, which is player-typed text anyone can forge.
  // Quorum counts DISTINCT SENDERS, so lowering it to 1 restores "believe whoever spoke last" —
  // which is what PizzaWorldBuffs itself does, and is only safe in a client trusting its own user.
  const darkmoonQuorum = intWithDefault("DARKMOON_QUORUM", DEFAULT_CORROBORATION.quorum, 1);
  if (darkmoonQuorum > 50) errors.push("DARKMOON_QUORUM must be 1-50");
  const darkmoonChangeCooldownHours = intWithDefault(
    "DARKMOON_CHANGE_COOLDOWN_HOURS",
    DEFAULT_CORROBORATION.changeCooldownMs / 3_600_000,
    0,
  );
  // Well under the weekly gap between moves, or the faire's real move is what it would block.
  if (darkmoonChangeCooldownHours > 24) {
    errors.push("DARKMOON_CHANGE_COOLDOWN_HOURS must be 0-24 (well under the weekly move)");
  }
  const darkmoonCorroboration: CorroborationPolicy = {
    quorum: darkmoonQuorum,
    changeCooldownMs: darkmoonChangeCooldownHours * 3_600_000,
  };

  const mongodbUri = env.MONGODB_URI?.trim() || null;
  const mongodbDb = env.MONGODB_DB?.trim() || "onyxiabot";

  const pollIntervalMs = intWithDefault("POLL_INTERVAL_SECONDS", 20, 5) * 1000;
  const whoTimeoutMs = intWithDefault("WOW_WHO_TIMEOUT_MS", 8_000, 1_000);
  const whoSliceDelayMs = intWithDefault("WOW_WHO_SLICE_DELAY_MS", 1_500, 0);
  const whoMinGapMs = intWithDefault("WOW_WHO_MIN_GAP_SECONDS", 31, 0) * 1000;
  const interactMaxYd = intWithDefault("WOW_INTERACT_MAX_YD", 8, 1);
  const interactEntryRaw = env.WOW_INTERACT_ENTRY?.trim();
  const interactEntry = interactEntryRaw && /^\d+$/.test(interactEntryRaw) ? Number(interactEntryRaw) : null;

  const guildName = env.WOW_GUILD_NAME?.trim() || "Rage Quit";
  const guildInviteRaw = env.WOW_GUILD_INVITE?.trim().toLowerCase();
  const guildInviteEnabled = guildInviteRaw === "true" || guildInviteRaw === "1";
  const community = env.WOW_COMMUNITY?.trim() || "OctoWoW";

  // Chronicle early-confirm: on by default (a no-op without Mongo), disabled with false/0/none.
  const chronicleRaw = env.CHRONICLE_ENABLED?.trim().toLowerCase();
  const chronicleEnabled = chronicleRaw !== "false" && chronicleRaw !== "0" && chronicleRaw !== "none";

  const logLevelRaw = (env.LOG_LEVEL?.trim() || "info") as LogLevel;
  const logLevel: LogLevel = LOG_LEVELS.includes(logLevelRaw) ? logLevelRaw : "info";
  if (env.LOG_LEVEL && !LOG_LEVELS.includes(logLevelRaw)) {
    errors.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration:\n  - ${errors.join("\n  - ")}`);
  }

  return {
    account,
    password,
    authHost,
    authPort,
    realm,
    characterName,
    loginEnabled,
    listeners,
    worldHost,
    worldPort,
    integrityChecksum,
    build,
    worldBuild,
    autoResolve,
    clientCdn,
    darkmoonCorroboration,
    darkmoonWatchLocation,
    listenerSilenceMs,
    listenerThreatRadiusYd,
    listenerStandDownMs,
    listenerFleeShunnedPlayers,
    watchAreaId,
    watchAreaName,
    minRaidSize,
    raidStrengthSize,
    raidLeftFloor,
    raidClearSize,
    raidDurationEstimateMs,
    raidLearnMinSamples,
    raidEndingLeadMs,
    raidFillWindowMs,
    raidRosterCap,
    raidMinClearMs,
    raidDisbandMs,
    raidFreshWindowMs,
    raidClearSustainedMs,
    raidLockoutMs,
    raidFormConfirmMs,
    blackwingLair,
    statusYellMs,
    whisperMaxAgeMs,
    realmStableMs,
    realmStatusEnabled,
    realmMaxPingMs,
    realmPingSpreadMs,
    broadcastDedupMs,
    buffCooldownMs,
    realmType,
    raidGrouping,
    raidDetector,
    announceStartup,
    whispersEnabled,
    presenceEnabled,
    presenceProbe,
    presenceCacheMs,
    whisperThrottleMs,
    discordBotToken,
    discordServerInvite,
    lftChannel,
    discordFeedbackChannelId,
    discordOnyxiaChannelId,
    discordErrorsChannelId,
    discordTestsChannelId,
    discordServerStatusChannelId,
    discordDarkmoonChannelId,
    discordWallOfShameChannelId,
    discordBwlChannelId,
    statusWidgetRefreshMs,
    statusNoticeLingerMs,
    statusChannelRenameEnabled,
    statusChannelName,
    discordAllianceRoleId,
    discordHordeRoleId,
    mongodbUri,
    mongodbDb,
    pollIntervalMs,
    whoTimeoutMs,
    whoSliceDelayMs,
    whoMinGapMs,
    interactMaxYd,
    interactEntry,
    guildName,
    guildInviteEnabled,
    community,
    chronicleEnabled,
    logLevel,
  };
}

/** Split a realm-list "host:port" address; falls back to the default world port. */
export function parseAddress(address: string, defaultPort = 8085): { host: string; port: number } {
  const lastColon = address.lastIndexOf(":");
  if (lastColon === -1) return { host: address, port: defaultPort };
  const host = address.slice(0, lastColon);
  const port = Number(address.slice(lastColon + 1));
  return { host, port: Number.isInteger(port) && port > 0 ? port : defaultPort };
}
