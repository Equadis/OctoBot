import { unitRef } from "../protocol/guid.js";
import type { UnitPosition } from "../protocol/movement.js";
import type { SpellCast } from "../protocol/spell-cast.js";
import type { UnitOwner } from "../protocol/unit-owner.js";
import type { WorldPoint } from "../protocol/update-object.js";

/** The creature a warlock's Inferno raises — the Infernal whose Immolation killed both Orgrimmar
 *  listeners. Its entry sits in its GUID, so it is known on sight with nothing to ask. */
export const INFERNAL_ENTRY = 89;
/** The warlock spell that drops one: aimed at a spot up to thirty yards from the caster, landing two
 *  seconds after the cast begins. */
export const INFERNO_SPELL_ID = 1122;

export type Threat =
  | {
      readonly kind: "infernal";
      readonly guid: bigint;
      /** Who raised or holds it, when its object update said. */
      readonly owner: UnitOwner | null;
      readonly distance: number;
    }
  | { readonly kind: "shunned-player"; readonly guid: bigint; readonly distance: number }
  | {
      readonly kind: "inferno-cast";
      /** The player casting it, wherever they stand. */
      readonly guid: bigint;
      /** From us to where it will land. */
      readonly distance: number;
    };

export interface ThreatWatchDeps {
  /** Whether a player is on the wall of shame, by GUID. */
  readonly isShunned: (guid: bigint) => boolean;
  /** Who a unit in view answers to. */
  readonly ownerOf: (guid: bigint) => UnitOwner | null;
  /** The first threat to come within reach — the only one reported; the answer to it is to leave. */
  readonly onThreat: (threat: Threat) => void;
  /** An Infernal came into view — once each, how far off, or null before our own position is known.
   *  For the log: a miss can then be told from one never seen at all. */
  readonly onInfernalSeen: (guid: bigint, distance: number | null) => void;
}

export interface ThreatWatchOptions {
  /** How close a threat may come before the listener leaves. */
  readonly radiusYd: number;
  /** Whether a player on the wall of shame standing close is itself a threat. Off, only their
   *  Inferno — aimed at us, or an Infernal coming — is; the listener stays up beside them. */
  readonly fleeShunnedPlayers: boolean;
}

/**
 * Watches the units around a parked listener for the two kinds that can kill it, while they are
 * still far enough off to log out: an Infernal, and a player on the wall of shame.
 *
 * Only within `radiusYd` — a capital is busy, and a threat across the square is not yet one. Both
 * kinds are remembered while in view, and judged again as they move and once our own position is
 * known, so one walking closer is caught when it crosses the line. A creature walks a whole path on
 * one packet, so its path is judged whole: one that sets off from across the square toward us, or
 * past us, is caught as it sets off rather than when it has already arrived.
 *
 * Best of all is the Inferno cast itself: it is aimed at a spot, so the warlock can stand well off,
 * and the Infernal it drops arrives with nobody yet named as its owner. The cast says both where it
 * will land and who is casting it, two seconds before it does.
 */
export class ThreatWatch {
  readonly #deps: ThreatWatchDeps;
  readonly #radiusYd: number;
  readonly #fleeShunnedPlayers: boolean;
  #self: WorldPoint | null = null;
  /** Where each unit that would be a threat up close was last seen, and where it was heading. */
  readonly #watched = new Map<bigint, UnitPosition>();
  #reported = false;

  constructor(deps: ThreatWatchDeps, options: ThreatWatchOptions) {
    this.#deps = deps;
    this.#radiusYd = options.radiusYd;
    this.#fleeShunnedPlayers = options.fleeShunnedPlayers;
  }

  /** Where we stand. */
  self(pos: WorldPoint): void {
    this.#self = pos;
    for (const position of this.#watched.values()) this.#judge(position);
  }

  /** A unit came into view or moved. */
  moved(position: UnitPosition): void {
    if (!this.#isThreatening(position.guid)) return;
    if (!this.#watched.has(position.guid) && isInfernal(position.guid)) {
      this.#deps.onInfernalSeen(position.guid, this.#self ? distanceBetween(this.#self, position.pos) : null);
    }
    this.#watched.set(position.guid, position);
    this.#judge(position);
  }

  /**
   * Something hit us. An Infernal's blow is the last word: whatever position we never read, it is on
   * top of us — leave now, though mid-fight the server may refuse the logout.
   */
  struckBy(attacker: bigint): void {
    if (this.#reported || !isInfernal(attacker)) return;
    this.#reported = true;
    this.#deps.onThreat({ kind: "infernal", guid: attacker, owner: this.#deps.ownerOf(attacker), distance: 0 });
  }

  /** Someone near us started casting. An Inferno aimed within reach is a threat, whoever casts it. */
  castStarted({ caster, spellId, destination }: SpellCast): void {
    if (this.#reported || spellId !== INFERNO_SPELL_ID || !destination || this.#self === null) return;
    const distance = distanceBetween(this.#self, destination);
    if (distance > this.#radiusYd) return;
    this.#reported = true;
    this.#deps.onThreat({ kind: "inferno-cast", guid: caster, distance });
  }

  /** A unit left view or was destroyed. */
  gone(guid: bigint): void {
    this.#watched.delete(guid);
  }

  /**
   * Report again — the last threat could not be left behind (a refused logout, mid-fight). Whatever
   * is still within reach is judged at once, from where it was last seen; anything later, as it comes.
   */
  rearm(): void {
    this.#reported = false;
    for (const position of this.#watched.values()) this.#judge(position);
  }

  #isThreatening(guid: bigint): boolean {
    if (isInfernal(guid)) return true;
    return unitRef(guid).kind === "player" && this.#fleeShunnedPlayers && this.#deps.isShunned(guid);
  }

  #judge({ guid, pos, destination }: UnitPosition): void {
    if (this.#reported || this.#self === null) return;
    const distance = destination ? distanceToPath(this.#self, pos, destination) : distanceBetween(this.#self, pos);
    if (distance > this.#radiusYd) return;
    this.#reported = true;
    this.#deps.onThreat(
      unitRef(guid).kind === "player"
        ? { kind: "shunned-player", guid, distance }
        : { kind: "infernal", guid, owner: this.#deps.ownerOf(guid), distance },
    );
  }
}

/** A threat in words, for the log: "an Infernal came within 12 yd". */
export function describeThreat(threat: Threat): string {
  const what = {
    infernal: "an Infernal came",
    "inferno-cast": "an Inferno is being cast to land",
    "shunned-player": "a player on the wall of shame came",
  }[threat.kind];
  return `${what} within ${Math.round(threat.distance)} yd`;
}

/** Whether a GUID is an Infernal's — its entry sits in its GUID. */
function isInfernal(guid: bigint): boolean {
  const ref = unitRef(guid);
  return (ref.kind === "creature" || ref.kind === "pet") && ref.entry === INFERNAL_ENTRY;
}

function distanceBetween(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** How near a straight walk from `from` to `to` comes to `point`. */
function distanceToPath(point: WorldPoint, from: WorldPoint, to: WorldPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  if (lengthSq === 0) return distanceBetween(point, from);
  const along = ((point.x - from.x) * dx + (point.y - from.y) * dy + (point.z - from.z) * dz) / lengthSq;
  const t = Math.min(1, Math.max(0, along));
  return distanceBetween(point, { x: from.x + t * dx, y: from.y + t * dy, z: from.z + t * dz });
}
