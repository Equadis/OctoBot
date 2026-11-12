import type { WorldPoint } from "../protocol/update-object.js";

/**
 * A listener's "anchor": where it is parked, framed by the fixed doodads (GameObjects) around it.
 * Doodads never move, so their world positions are a stable reference — if the character later
 * sits far from all of them, it has been moved from its spot (a GM move, or death releasing it to
 * a graveyard). Captured once when the character is parked, then compared against on later reads.
 */
export interface Anchor {
  /** The character's own position when it was parked. */
  readonly parked: WorldPoint;
  /** The reference doodads' positions — the nearest few to the parked spot. */
  readonly doodads: readonly WorldPoint[];
}

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** The `n` doodads nearest the parked position (the tight reference cluster around the spot). */
export function nearestDoodads(parked: WorldPoint, doodads: readonly WorldPoint[], n: number): WorldPoint[] {
  return [...doodads].sort((a, b) => distance(parked, a) - distance(parked, b)).slice(0, Math.max(0, n));
}

/** Build an anchor from a parked position and the doodads seen there — keeping the `n` nearest. */
export function anchorFrom(parked: WorldPoint, doodads: readonly WorldPoint[], n = 3): Anchor {
  return { parked, doodads: nearestDoodads(parked, doodads, n) };
}

/**
 * Has the character moved off its anchor? True when its current position is farther than
 * `thresholdYd` from EVERY reference doodad — parked, it sits among them, so being beyond the
 * threshold from all of them means it is no longer where it belongs. With no reference doodads we
 * can't judge, so it returns false (never a false alarm from a missing anchor).
 */
export function hasMoved(current: WorldPoint, anchor: Anchor, thresholdYd: number): boolean {
  if (anchor.doodads.length === 0) return false;
  return anchor.doodads.every((doodad) => distance(current, doodad) > thresholdYd);
}
