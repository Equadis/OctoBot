import {
  UNIT_FIELD_CHARMEDBY,
  UNIT_FIELD_CREATEDBY,
  UNIT_FIELD_SUMMONEDBY,
  type UnitOwnerChange,
} from "./update-object.js";

/**
 * Who each unit in view answers to, kept from the object update stream.
 *
 * Three 1.12 unit fields name an owner: CHARMEDBY (Mind Control, Enslave Demon — how a warlock holds
 * the Infernal its Inferno drops), SUMMONEDBY (a pet or totem) and CREATEDBY (a guardian). The server
 * sends them when a unit comes into view and again when they change, never on request, so they have
 * to be kept from the start: by the time a unit does something worth explaining, it is too late to ask.
 *
 * An owner that lets go is remembered as a former one. An Infernal that breaks free of its warlock
 * clears CHARMEDBY and turns on everyone near it — the moment its owner's name matters most.
 *
 * Only units with an owner are kept, each until it leaves view or is destroyed; `maxUnits` bounds the
 * rest, oldest first, in case the server never says either.
 */

export type OwnerRelation = "controlled" | "summoned" | "created";

export interface UnitOwner {
  readonly relation: OwnerRelation;
  readonly guid: bigint;
  /** False once the unit is free of this owner — a broken charm, a released pet. */
  readonly current: boolean;
}

/** Strongest claim first: a charm overrides whoever summoned or made the unit. */
const RELATION_FIELDS: readonly (readonly [OwnerRelation, number])[] = [
  ["controlled", UNIT_FIELD_CHARMEDBY],
  ["summoned", UNIT_FIELD_SUMMONEDBY],
  ["created", UNIT_FIELD_CREATEDBY],
];

interface KnownUnit {
  /** The owner-field words as they stand, by field index. An absent word is zero. */
  readonly words: Map<number, number>;
  /** The last owner each relation named, kept after its field clears. */
  readonly last: Map<OwnerRelation, bigint>;
}

export interface UnitOwnerTableOptions {
  /** Most units remembered at once. */
  readonly maxUnits?: number;
}

export class UnitOwnerTable {
  readonly #maxUnits: number;
  readonly #units = new Map<bigint, KnownUnit>();

  constructor(options: UnitOwnerTableOptions = {}) {
    this.#maxUnits = options.maxUnits ?? 1_000;
  }

  apply(change: UnitOwnerChange): void {
    if (change.kind === "out-of-range") {
      this.forget(change.guid);
      return;
    }
    let unit = this.#units.get(change.guid);
    if (!unit) {
      // Never owned (as far as we saw) and still not: the common case, and nothing to keep.
      if (![...change.words.values()].some((word) => word !== 0)) return;
      unit = { words: new Map(), last: new Map() };
      this.#admit(change.guid, unit);
    }
    if (change.kind === "create") unit.words.clear();
    for (const [index, word] of change.words) unit.words.set(index, word);
    for (const [relation, field] of RELATION_FIELDS) {
      const owner = guidAt(unit.words, field);
      if (owner !== 0n) unit.last.set(relation, owner);
    }
  }

  /** The unit left view or was destroyed. */
  forget(guid: bigint): void {
    this.#units.delete(guid);
  }

  /** Who the unit answers to now, or — once free — last answered to; null when it never had anyone. */
  ownerOf(guid: bigint): UnitOwner | null {
    const unit = this.#units.get(guid);
    if (!unit) return null;
    for (const [relation, field] of RELATION_FIELDS) {
      const owner = guidAt(unit.words, field);
      if (owner !== 0n) return { relation, guid: owner, current: true };
    }
    for (const [relation] of RELATION_FIELDS) {
      const owner = unit.last.get(relation);
      if (owner !== undefined) return { relation, guid: owner, current: false };
    }
    return null;
  }

  #admit(guid: bigint, unit: KnownUnit): void {
    if (this.#units.size >= this.#maxUnits) {
      const oldest = this.#units.keys().next();
      if (!oldest.done) this.#units.delete(oldest.value);
    }
    this.#units.set(guid, unit);
  }
}

/** The 64-bit GUID a field holds, low word first. */
function guidAt(words: ReadonlyMap<number, number>, field: number): bigint {
  return (BigInt(words.get(field + 1) ?? 0) << 32n) | BigInt(words.get(field) ?? 0);
}
