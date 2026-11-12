import type { Faction } from "../watcher/buff-store.js";

export interface FactionGroup<T> {
  readonly cities: Faction[];
  readonly members: T[];
}

/**
 * Group notification recipients by which of the currently-open cities they actually care
 * about, so each group gets one message naming only their own side (alliance → Stormwind,
 * horde → Orgrimmar, both → both). A recipient whose side isn't among `cities` is dropped
 * entirely — this alert isn't for them.
 */
export function groupByRelevantCities<T extends { readonly factions: readonly Faction[] }>(
  recipients: readonly T[],
  cities: readonly Faction[],
): FactionGroup<T>[] {
  const groups = new Map<string, FactionGroup<T>>();
  for (const recipient of recipients) {
    const relevant = cities.filter((city) => recipient.factions.includes(city));
    if (relevant.length === 0) continue;
    const key = relevant.join(",");
    const group = groups.get(key) ?? { cities: relevant, members: [] };
    group.members.push(recipient);
    groups.set(key, group);
  }
  return [...groups.values()];
}
