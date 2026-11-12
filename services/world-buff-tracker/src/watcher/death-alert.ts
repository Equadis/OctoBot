import type { DeathAccount } from "./death-report.js";

/**
 * A listener's death as a Discord post: who killed it — and whose that was, for a pet, guardian or
 * charmed unit — on top, then the lead-up in a code block.
 *
 * Discord refuses a message over its length limit outright, so the timeline gives way to fit: the
 * oldest lines go first, since the seconds nearest the death explain it best. The full timeline is
 * always in the log.
 */

export const DEATH_ALERT_TITLE = "⚔️ Listener killed";

const FENCE = "```";

export function formatDeathAlert(character: string, death: DeathAccount, maxLength: number): string {
  const headline = `**${character}** died — ${death.verdict}.`;
  // Nearby chat is quoted in the timeline; a backtick in it must not close the code block early.
  const timeline = death.timeline.map((line) => line.replaceAll("`", "'"));
  for (let dropped = 0; dropped < timeline.length; dropped += 1) {
    const kept = timeline.slice(dropped);
    const note = dropped > 0 ? [`… ${dropped} earlier line${dropped === 1 ? "" : "s"} in the log`] : [];
    const body = [headline, FENCE, ...note, ...kept, FENCE].join("\n");
    if (body.length <= maxLength) return body;
  }
  return headline.length <= maxLength ? headline : `${headline.slice(0, maxLength - 1)}…`;
}
