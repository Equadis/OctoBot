/**
 * Collapses a buff yell heard by more than one listener into a single drop.
 *
 * With two bots parked in the same capital, both hear the same "Rallying Cry" yell within seconds
 * and both call recordBuff — which would post to Discord twice and whisper every subscriber twice.
 * A faction's buff cannot legitimately re-drop within minutes (a raid takes ~25-40m to clear and
 * Onyxia respawns on a timer), so the FIRST report inside the window wins and the rest are dropped.
 *
 * In-memory and synchronous on purpose: the duplicate arrives milliseconds later, so an async
 * check against the buff store could let both reports pass before either write lands.
 */
export class RecentBuffs {
  readonly #last = new Map<string, number>();

  constructor(private readonly windowMs: number) {}

  /**
   * Record a heard buff for `faction` at `nowMs`. Returns true if this is a fresh drop to act on,
   * false if it duplicates one already recorded within the window (ignore it).
   */
  fresh(faction: string, nowMs: number): boolean {
    const previous = this.#last.get(faction);
    if (previous !== undefined && nowMs - previous < this.windowMs) return false;
    this.#last.set(faction, nowMs);
    return true;
  }
}
