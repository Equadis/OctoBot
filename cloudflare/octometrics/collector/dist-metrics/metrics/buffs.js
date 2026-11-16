/**
 * Capital-city announcement matching for the OctoMetrics collector.
 *
 * The four fragments are checked against real OctoWoW announcements stored in D1 (2026-11-16): every Rallying Cry event matched, and the
 * captured text keeps the server's own placeholders (for example "$n" and "$g his:her;"), so fragments are chosen to avoid them.
 *
 * Matching is tolerant of harmless formatting only: case, runs of whitespace, curly quotes and dashes, colour codes (|cffRRGGBB ... |r) and
 * control characters. It is NOT loosened beyond that: a fragment is a long distinctive phrase that must appear whole, and the text must come
 * from a monster yell packet, so player chat and unrelated NPC lines cannot confirm a drop.
 */
export const RALLY_BUFF = "Rallying Cry of the Dragonslayer";
export const WARCHIEF_BUFF = "Warchief's Blessing";

const RALLY = [
    { faction: "alliance", head: "onyxia", needle: "Onyxia, hangs from the arches" },
    { faction: "alliance", head: "nefarian", needle: "the Lord of Blackrock is slain! Nefarian has been subdued" },
    { faction: "horde", head: "onyxia", needle: "The brood mother, Onyxia, has been slain" },
    { faction: "horde", head: "nefarian", needle: "NEFARIAN IS SLAIN! People of Orgrimmar" },
];
const WARCHIEF = ["The false Warchief, Rend Blackhand, has fallen", "Be bathed in my power! Drink in my might!"];

/** Collapse harmless formatting differences so two renderings of the same line compare equal. */
export function normaliseYell(text) {
    if (typeof text !== "string")
        return "";
    return text
        .normalize("NFKC")
        .replace(/\|c[0-9a-f]{8}/gi, "")
        .replace(/\|r/gi, "")
        .replace(/[‘’‛′]/g, "'")
        .replace(/[“”„″]/g, '"')
        .replace(/[‐-―−]/g, "-")
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
const RALLY_NORMAL = RALLY.map(entry => ({ ...entry, normal: normaliseYell(entry.needle) }));
const WARCHIEF_NORMAL = WARCHIEF.map(normaliseYell);
// A real announcement is a sentence or two; anything enormous is not one.
const MAX_YELL_CHARS = 1200;

/** Which faction's buff, and which head, an announcement belongs to; null when it is not a Rallying Cry announcement. */
export function matchRallyYell(text) {
    const normal = normaliseYell(text);
    if (!normal || normal.length > MAX_YELL_CHARS)
        return null;
    const hit = RALLY_NORMAL.find(entry => normal.includes(entry.normal));
    return hit ? { faction: hit.faction, head: hit.head } : null;
}
/** Kept for callers that only want the faction. */
export function matchBuffYell(text) { return matchRallyYell(text)?.faction ?? null; }
export function isWarchiefBlessingYell(text) {
    const normal = normaliseYell(text);
    return Boolean(normal) && normal.length <= MAX_YELL_CHARS && WARCHIEF_NORMAL.some(fragment => normal.includes(fragment));
}
