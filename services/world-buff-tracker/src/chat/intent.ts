/**
 * Best-effort intent detection for free-text whispers, so Bufftracker understands
 * natural phrasing ("sign me up", "when's the buff?", "what's your discord?") rather
 * than only exact commands. Used as a fallback AFTER the exact-command parser misses,
 * so a bare command word ("subscribe", "horde") never reaches here.
 *
 * Order matters: more specific / negating intents are tested first (e.g. "unsubscribe"
 * before "subscribe", since it contains it; "profile" before "status" since "my status"
 * is about the caller, not the raid). Keep every pattern NARROW — a false match acts on
 * a player, and the worst of them (flipping a side, unsubscribing) makes them miss a buff.
 */
export type Intent =
  | "subscribe"
  | "unsubscribe"
  | "feedback"
  | "discord"
  | "guild"
  | "darkmoon"
  | "buff"
  | "status"
  | "thanks"
  | "help";

const PATTERNS: readonly (readonly [Intent, RegExp])[] = [
  [
    "unsubscribe",
    /\b(unsub\w*|opt\s?-?out|remove me|take me off|leave me alone|no more|unfollow|cancel|quit|mute|disable)\b|\bstop\b|\bturn (it|them|the (alerts?|pings?|notifications?)) off\b/,
  ],
  [
    "subscribe",
    /\b(subscribe|sub me|sign me up|sign up|add me|notify me|alert me|ping me|count me in|opt\s?-?in|keep me posted|let me know|wake me|register me|enroll\w*|hook me up|i want (in|alerts?|pings?))\b/,
  ],
  [
    "feedback",
    /\b(feedback|suggest\w*|feature request|report a bug|there'?s a bug|you should (add|make|change|have|include|support)|could you (add|make|change|support)|can you (add|support))\b/,
  ],
  ["discord", /\bdiscord\b/],
  [
    "guild",
    /\b(guild|invite me|how (do i|to) join|joining|recruit\w*|rage\s?quit|who (made|runs|built|created|owns) (you|this|it|the bot)|what guild|your guild|apply|application)\b/,
  ],
  // Ahead of "buff": the faire hands out its own buffs, so "darkmoon buff" is a faire question,
  // not a Rallying Cry one. "fair" is deliberately absent — "fair enough" is not a faire question.
  ["darkmoon", /\bdark\s?moon\w*\b|\bdmf\b|\bfaire\b/],
  [
    "buff",
    /\b(buff|rallying cry|world ?buff|the head|onyxia buff|eta|cooldown|cd|next (buff|one|drop))\b|when.{0,20}(drop|up|next|fresh)|(drop|up).{0,20}when|time left/,
  ],
  [
    "status",
    /\b(status|any raid|raid (going|now|up|status)|raiding|current raid|anything (happening|going)|what.?s (up|going)|in the lair|is onyxia (up|going|happening|running)|anyone (in|on|at|doing|running) ony\w*)\b|raid\s*\?/,
  ],
  [
    "thanks",
    /\b(thank(s| you)?|thx|ty|cheers|appreciate it|much love|legend|you rock|good bot|nice bot|great bot|helpful|awesome)\b/,
  ],
  [
    "help",
    /\b(help|who (are|r) (you|u)|what (are|is) (you|this|it)|what (do|can) you do|how (do i use|does this work|to use)|commands?|list (of )?commands|options|what can i (say|ask|whisper))\b|^\s*\?\s*$/,
  ],
];

export function parseIntent(text: string): Intent | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  for (const [intent, re] of PATTERNS) if (re.test(t)) return intent;
  return null;
}
