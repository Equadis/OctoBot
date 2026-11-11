/** Shared contracts; existence of a class ID is not an implemented engine. */
export type ClassId = 'warrior' | 'rogue' | 'shaman' | 'mage' | 'druid' |
  'warlock' | 'hunter' | 'paladin' | 'priest';
export type Status = 'not-started' | 'in-development' | 'implemented-unverified' | 'validated';
export type School = 'physical' | 'holy' | 'fire' | 'nature' | 'frost' | 'shadow' | 'arcane';
export interface Evidence {
  url: string;
  retrievedAt: string;
  status: 'confirmed' | 'conflicting' | 'unknown';
  notes: string;
}
export interface Ruleset {
  id: string;
  revision: string;
  mechanics: Record<string, Evidence>;
  /** An adapter must reject an unresolved mechanic required by a build. */
  unresolved: string[];
}
export interface Encounter {
  durationUs: number;
  durationVariationUs: number;
  targetLevel: number;
  targetArmour: number;
  resistances: Record<Exclude<School, 'physical'>, number>;
  targets: number;
}
export interface Build {
  schemaVersion: 1;
  classId: ClassId;
  rulesetId: string;
  rulesetRevision: string;
  engineRevision: string;
  name: string;
  character: { race: string; level: number };
  /** Engine-owned data must be validated before use, never silently ignored. */
  configuration: Record<string, unknown>;
  encounter: Encounter;
  iterations: number;
  seed: number;
}
export interface AbilityResult {
  id: string;
  name: string;
  school: School;
  damage: number;
  attempts: number;
  hits: number;
  criticals: number;
  misses: number;
  dodges: number;
  resists: number;
  glances: number;
}
export interface CombatEvent {
  timeUs: number;
  type: string;
  abilityId?: string;
  amount?: number;
  resourceAfter?: number;
}
export interface IterationResult {
  index: number;
  durationUs: number;
  damage: number;
  abilities: AbilityResult[];
  resources: Record<string, { gained: number; spent: number; wasted: number }>;
  auras: Record<string, { activeUs: number; activations: number }>;
  log?: CombatEvent[];
}
export interface Engine {
  classId: ClassId;
  revision: string;
  status: Status;
  supportedRulesets: string[];
  validate(build: Build, ruleset: Ruleset): string[];
  deriveStats(build: Build, ruleset: Ruleset): Record<string, number>;
  simulate(build: Build, ruleset: Ruleset, options: {
    index: number; seed: number; captureLog: boolean;
  }): IterationResult;
}
/** jobId prevents a cancelled worker's messages being attached to another run. */
export type WorkerRequest = { type: 'run'; jobId: string; build: Build };
export type WorkerResponse =
  | { type: 'progress'; jobId: string; completed: number; total: number }
  | { type: 'complete'; jobId: string; iterations: IterationResult[] }
  | { type: 'error'; jobId: string; message: string };
