/**
 * The "about to clear" heads-up decision.
 *
 * A raid in the lair has been in long enough to be within `leadMs` of its PREDICTED clear time,
 * so a fresh Rallying Cry should drop soon when they finish — the pre-clear "park now" moment,
 * earlier than the reactive "cleared" alert. The predicted clear time is the learned median
 * (bias-corrected) once enough raids are on record, else the config estimate.
 *
 * Pure, so the trigger is unit-tested. The CALLER must only test a raid that is genuinely still
 * in progress — one that has cleared, or whose roster is already leaving, is past the point of a
 * heads-up and must not be offered one (there is no fresh buff to park for once it is done).
 */
export function raidEndingDue(elapsedMs: number, predictedClearMs: number, leadMs: number): boolean {
  return elapsedMs >= predictedClearMs - leadMs;
}
