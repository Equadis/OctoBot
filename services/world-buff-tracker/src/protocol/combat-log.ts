import { PacketReader } from "../net/byte-buffer.js";

/**
 * The combat log — what hit whom, with what, for how much.
 *
 * A parked listener has no use for combat until it dies; then the last few seconds of it are the
 * only account of who killed it. Each parser reads just the leading fields that answer that (the
 * source, the target, the spell and the damage) and ignores the rest, so a trailing-field
 * difference between cores cannot break it.
 *
 * Documented stock 1.12 layouts, unconfirmed against a live OctoWoW capture:
 *   SMSG_ATTACKSTART:            u64 attacker, u64 victim
 *   SMSG_ATTACKERSTATEUPDATE:    u32 hitInfo, packed attacker, packed target, u32 damage, ...
 *   SMSG_SPELLNONMELEEDAMAGELOG: packed target, packed caster, u32 spellId, u32 damage, ...
 *   SMSG_PERIODICAURALOG:        packed target, packed caster, u32 spellId, u32 count,
 *                                then per aura u32 auraType and, for a damage aura, u32 damage, ...
 *   SMSG_ENVIRONMENTALDAMAGELOG: u64 target, u8 type, u32 damage, ...
 */

export type EnvironmentalCause = "fatigue" | "drowning" | "falling" | "lava" | "slime" | "fire" | "void";

export type CombatEvent =
  | { readonly kind: "attack-start"; readonly attacker: bigint; readonly target: bigint }
  | { readonly kind: "melee"; readonly attacker: bigint; readonly target: bigint; readonly damage: number }
  | {
      readonly kind: "spell";
      readonly attacker: bigint;
      readonly target: bigint;
      readonly spellId: number;
      readonly damage: number;
    }
  | {
      readonly kind: "periodic";
      readonly attacker: bigint;
      readonly target: bigint;
      readonly spellId: number;
      readonly damage: number;
    }
  | {
      readonly kind: "environmental";
      readonly target: bigint;
      readonly cause: EnvironmentalCause | "unknown";
      readonly damage: number;
    };

export function parseAttackStart(body: Buffer): CombatEvent {
  const reader = new PacketReader(body);
  const attacker = reader.u64LE();
  return { kind: "attack-start", attacker, target: reader.u64LE() };
}

export function parseAttackerStateUpdate(body: Buffer): CombatEvent {
  const reader = new PacketReader(body);
  reader.u32LE(); // hitInfo
  const attacker = reader.packedGuid();
  const target = reader.packedGuid();
  return { kind: "melee", attacker, target, damage: reader.u32LE() };
}

export function parseSpellDamageLog(body: Buffer): CombatEvent {
  const reader = new PacketReader(body);
  const target = reader.packedGuid();
  const attacker = reader.packedGuid();
  const spellId = reader.u32LE();
  return { kind: "spell", attacker, target, spellId, damage: reader.u32LE() };
}

/** Aura types whose tick carries damage (SPELL_AURA_PERIODIC_DAMAGE and _PERCENT). */
const DAMAGE_AURA_TYPES: ReadonlySet<number> = new Set([3, 89]);

/** A damage-over-time tick, or null for a periodic aura that does not deal damage (a heal, a
 *  mana drain) — those say nothing about what killed anyone. */
export function parsePeriodicAuraLog(body: Buffer): CombatEvent | null {
  const reader = new PacketReader(body);
  const target = reader.packedGuid();
  const attacker = reader.packedGuid();
  const spellId = reader.u32LE();
  if (reader.u32LE() === 0) return null; // no aura records
  if (!DAMAGE_AURA_TYPES.has(reader.u32LE())) return null;
  return { kind: "periodic", attacker, target, spellId, damage: reader.u32LE() };
}

const ENVIRONMENTAL_CAUSES: readonly EnvironmentalCause[] = [
  "fatigue",
  "drowning",
  "falling",
  "lava",
  "slime",
  "fire",
  "void",
];

export function parseEnvironmentalDamage(body: Buffer): CombatEvent {
  const reader = new PacketReader(body);
  const target = reader.u64LE();
  const cause = ENVIRONMENTAL_CAUSES[reader.u8()] ?? "unknown";
  return { kind: "environmental", target, cause, damage: reader.u32LE() };
}
