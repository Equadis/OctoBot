/** Allocation validation shared by the browser editor and imported builds.
 * Talent definitions come from the official calculator snapshot. This module
 * validates points; it does not imply that combat talent effects are implemented.
 */
export function validateTalents(data, ranks, level = 60) {
  const errors = [];
  if (!Number.isInteger(level) || level < 1 || level > 60) return ['Level must be an integer from 1 to 60'];
  if (!ranks || typeof ranks !== 'object' || Array.isArray(ranks)) return ['Talent ranks must be an object'];
  const byId = new Map(data.talents.map(talent => [String(talent.id), talent]));
  const byPosition = new Map(data.talents.map(talent => [`${talent.tree}:${talent.position}`, talent]));
  let total = 0;
  for (const [id, rank] of Object.entries(ranks)) {
    const talent = byId.get(id);
    if (!talent) { errors.push(`Unknown talent ID ${id}`); continue; }
    if (!Number.isInteger(rank) || rank < 0 || rank > talent.maxRanks) {
      errors.push(`Invalid rank for ${talent.name}`);
      continue;
    }
    total += rank;
    if (rank === 0) continue;
    const lowerPoints = data.talents.reduce((sum, other) =>
      other.tree === talent.tree && other.row < talent.row && Number.isInteger(ranks[other.id])
        ? sum + ranks[other.id] : sum, 0);
    if (lowerPoints < talent.row * 5) errors.push(`Insufficient lower-tier points for ${talent.name}`);
    if (talent.requires !== null) {
      const parent = byPosition.get(`${talent.tree}:${talent.requires}`);
      if (!parent || (ranks[parent.id] ?? 0) < talent.requiresRanks) {
        errors.push(`Missing prerequisite for ${talent.name}`);
      }
    }
  }
  const budget = Math.max(0, level - 9);
  if (total > budget) errors.push(`Talent budget exceeded: ${total}/${budget}`);
  return errors;
}

/** Transactional editing: rejected changes leave the existing build intact. */
export function setTalentRank(data, ranks, talentId, rank, level = 60) {
  const next = { ...ranks, [talentId]: rank };
  const errors = validateTalents(data, next, level);
  if (errors.length) throw new Error(errors.join('; '));
  if (rank === 0) delete next[talentId];
  return next;
}

export function talentTotals(data, ranks) {
  return data.trees.map(tree => data.talents.reduce((total, talent) =>
    talent.tree === tree.index ? total + (ranks[talent.id] ?? 0) : total, 0));
}
