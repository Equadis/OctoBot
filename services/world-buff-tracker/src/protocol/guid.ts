/**
 * What kind of unit a 1.12 GUID refers to.
 *
 * The top 16 bits are the high-guid type; a creature or pet also carries its entry in bits 24–47,
 * which is all a creature query needs to put a name to it. A player's high part is zero.
 */

export type UnitRef =
  | { readonly kind: "player" }
  | { readonly kind: "creature"; readonly entry: number }
  | { readonly kind: "pet"; readonly entry: number }
  | { readonly kind: "other" };

const HIGHGUID_PLAYER = 0x0000n;
const HIGHGUID_UNIT = 0xf130n;
const HIGHGUID_PET = 0xf140n;

export function unitRef(guid: bigint): UnitRef {
  const high = guid >> 48n;
  const entry = Number((guid >> 24n) & 0xff_ffffn);
  if (high === HIGHGUID_PLAYER && guid !== 0n) return { kind: "player" };
  if (high === HIGHGUID_UNIT) return { kind: "creature", entry };
  if (high === HIGHGUID_PET) return { kind: "pet", entry };
  return { kind: "other" };
}
