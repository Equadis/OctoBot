/**
 * Guild / PUG classification of ONE tracked raid's roster.
 *
 * Inputs are the raid's own roster (stable cohort, unique character names) — never the whole zone —
 * so another raid's guild can't leak in. Percentages divide by the roster size; a member whose guild
 * is not known (no /who detail yet, truncated list) is "unknown", NEVER counted as unguilded.
 * Unguilded characters are independent members: they fill the denominator and belong to no guild.
 *
 * Rules (thresholds configurable, see DEFAULT_GUILD_RULES):
 *   guild      one guild >= guildShare (60%)            -> "Nightfall"
 *   guild-led  one guild in [ledShare, guildShare)       -> "Nightfall-led PUG"
 *   collab     no guild >= guildShare, the two largest each >= collabEachShare (25%)
 *              and together >= collabCombinedShare (65%) -> "Nightfall + Stormguard"
 *   pug        none of the above, roster complete enough -> "PUG"
 *   unknown    roster too small, or too few members' guilds known -> "Unknown"
 *
 * A label is a heuristic summary of /who data, not verified instance membership.
 */
export interface GuildRules {
  readonly guildShare: number;
  readonly ledShare: number;
  readonly collabEachShare: number;
  readonly collabCombinedShare: number;
  /** Fewest roster members before any label other than Unknown is given. */
  readonly minRoster: number;
  /** Fraction of the roster whose guild must be known (has been seen in /who) to label confidently. */
  readonly minKnownShare: number;
  /** Consecutive agreeing readings before a label changes (anti-flicker). */
  readonly stableReadings: number;
}

export const DEFAULT_GUILD_RULES: GuildRules = Object.freeze({
  guildShare: 0.6,
  ledShare: 0.5,
  collabEachShare: 0.25,
  collabCombinedShare: 0.65,
  minRoster: 10,
  minKnownShare: 0.8,
  stableReadings: 3,
});

export type GuildKind = "guild" | "guild-led" | "collab" | "pug" | "unknown";

export interface GuildShare {
  readonly name: string;
  readonly count: number;
  /** count / roster size (0..1). */
  readonly share: number;
}

export interface GuildComposition {
  readonly kind: GuildKind;
  /** Display text: "Nightfall", "Nightfall-led PUG", "Nightfall + Stormguard", "PUG", "Unknown". */
  readonly label: string;
  readonly rosterSize: number;
  /** Roster members whose guild is known (seen in /who). */
  readonly known: number;
  /** Aggregate guild counts, largest first (named guilds only). Never character names. */
  readonly guilds: readonly GuildShare[];
  readonly unguilded: number;
  /** Why the result is Unknown, when it is. */
  readonly reason?: string;
}

export interface RosterMember {
  readonly name: string;
  /** undefined = guild not known (never listed); "" = listed with no guild. */
  readonly guild: string | undefined;
}

export function classifyGuilds(roster: readonly RosterMember[], rules: GuildRules = DEFAULT_GUILD_RULES): GuildComposition {
  const unique = new Map<string, string | undefined>();
  for (const member of roster) {
    const known = unique.get(member.name);
    // A reconnect never counts twice; prefer a known guild over an unknown one.
    if (known === undefined) unique.set(member.name, member.guild);
  }
  const rosterSize = unique.size;
  const counts = new Map<string, number>();
  let known = 0;
  let unguilded = 0;
  for (const guild of unique.values()) {
    if (guild === undefined) continue;
    known += 1;
    const name = guild.trim();
    if (name.length === 0) unguilded += 1;
    else counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const guilds = [...counts.entries()]
    .map(([name, count]) => ({ name, count, share: rosterSize === 0 ? 0 : count / rosterSize }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const base = { rosterSize, known, guilds, unguilded };
  if (rosterSize < rules.minRoster) return { ...base, kind: "unknown", label: "Unknown", reason: "roster too small to label" };
  if (known / rosterSize < rules.minKnownShare) {
    return { ...base, kind: "unknown", label: "Unknown", reason: "guild known for too few roster members (partial /who)" };
  }
  const [a, b] = guilds;
  // Shares are of the whole roster, so unknown members can only lower a guild's share (conservative).
  if (a && a.share >= rules.guildShare) return { ...base, kind: "guild", label: a.name };
  if (a && a.share >= rules.ledShare) return { ...base, kind: "guild-led", label: `${a.name}-led PUG` };
  if (a && b && a.share >= rules.collabEachShare && b.share >= rules.collabEachShare && a.share + b.share >= rules.collabCombinedShare) {
    return { ...base, kind: "collab", label: `${a.name} + ${b.name}` };
  }
  return { ...base, kind: "pug", label: "PUG" };
}

/**
 * Keeps a raid's label from flapping when one or two players join or leave: a different candidate
 * must win `stableReadings` consecutive readings before it replaces the committed label. The first
 * label commits only after the same number of agreeing readings (until then: Unknown).
 */
export class GuildLabelStabilizer {
  readonly #rules: GuildRules;
  #committed: GuildComposition | null = null;
  #candidateLabel: string | null = null;
  #streak = 0;

  constructor(rules: GuildRules = DEFAULT_GUILD_RULES) {
    this.#rules = rules;
  }

  /** Restore the already committed label, without changing classification rules. */
  restore(reading: GuildComposition): void {
    this.#committed = reading; this.#candidateLabel = null; this.#streak = 0;
  }

  update(reading: GuildComposition): GuildComposition {
    if (this.#committed !== null && reading.label === this.#committed.label) {
      this.#candidateLabel = null;
      this.#streak = 0;
      this.#committed = reading; // same label: refresh the counts
      return reading;
    }
    if (reading.label === this.#candidateLabel) this.#streak += 1;
    else {
      this.#candidateLabel = reading.label;
      this.#streak = 1;
    }
    if (this.#streak >= this.#rules.stableReadings || (this.#committed === null && reading.kind === "unknown")) {
      this.#committed = reading;
      this.#candidateLabel = null;
      this.#streak = 0;
      return reading;
    }
    if (this.#committed !== null) return this.#committed;
    // Nothing committed yet and not enough agreeing readings: stay Unknown rather than guess.
    return { ...reading, kind: "unknown", label: "Unknown", reason: "label not yet stable across readings" };
  }
}

/** Guild thresholds from the environment (percent values), falling back to the defaults. */
export function guildRulesFromEnv(env: Readonly<Record<string, string | undefined>>): GuildRules {
  const pct = (key: string, fallback: number): number => {
    const n = Number(env[key]);
    return Number.isFinite(n) && n > 0 && n <= 100 ? n / 100 : fallback;
  };
  const int = (key: string, fallback: number): number => {
    const n = Number(env[key]);
    return Number.isInteger(n) && n >= 1 ? n : fallback;
  };
  const d = DEFAULT_GUILD_RULES;
  return {
    guildShare: pct("WOW_GUILD_RAID_PERCENT", d.guildShare),
    ledShare: pct("WOW_GUILD_LED_PERCENT", d.ledShare),
    collabEachShare: pct("WOW_GUILD_COLLAB_EACH_PERCENT", d.collabEachShare),
    collabCombinedShare: pct("WOW_GUILD_COLLAB_COMBINED_PERCENT", d.collabCombinedShare),
    minRoster: int("WOW_GUILD_MIN_ROSTER", d.minRoster),
    minKnownShare: pct("WOW_GUILD_MIN_KNOWN_PERCENT", d.minKnownShare),
    stableReadings: int("WOW_GUILD_STABLE_READINGS", d.stableReadings),
  };
}
