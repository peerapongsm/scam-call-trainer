import { CUE_IDS, type CueId, type Scenario } from "./types";

const CUE_SET = new Set<string>(CUE_IDS);

export class ScenarioValidationError extends Error {}

function fail(scenarioId: string, message: string): never {
  throw new ScenarioValidationError(`scenario "${scenarioId}": ${message}`);
}

/**
 * Validates raw scenario JSON against the SPEC §4.3 schema.
 * `caseTypeIds` are the known taxonomy ids the scenario may reference.
 */
export function validateScenario(
  raw: unknown,
  caseTypeIds: ReadonlySet<string>,
): Scenario {
  const s = raw as Partial<Scenario>;
  const id = typeof s?.id === "string" && s.id ? s.id : "<missing id>";

  for (const field of [
    "id",
    "title",
    "caseTypeId",
    "callerName",
    "callerNumber",
    "personaBrief",
  ] as const) {
    if (typeof s?.[field] !== "string" || !s[field]) {
      fail(id, `missing or empty "${field}"`);
    }
  }
  if (!caseTypeIds.has(s.caseTypeId!)) {
    fail(id, `caseTypeId "${s.caseTypeId}" not found in taxonomy`);
  }
  if (!Array.isArray(s.sources) || s.sources.length === 0) {
    fail(id, "must cite at least one source");
  }
  for (const src of s.sources) {
    if (!src?.url || !src?.publisher || !src?.accessed) {
      fail(id, "every source needs url, publisher and accessed date");
    }
  }
  if (!Array.isArray(s.beats) || s.beats.length < 2) {
    fail(id, "needs at least 2 beats");
  }

  const cuesUsed = new Set<CueId>();
  let damageBeats = 0;
  s.beats.forEach((beat, i) => {
    if (!beat?.id || typeof beat.id !== "string") fail(id, `beat ${i} missing id`);
    if (!beat.goal || typeof beat.goal !== "string") {
      fail(id, `beat "${beat.id}" missing goal`);
    }
    if (!beat.fallbackLine || typeof beat.fallbackLine !== "string") {
      fail(id, `beat "${beat.id}" missing fallbackLine`);
    }
    if (!Array.isArray(beat.redFlags)) {
      fail(id, `beat "${beat.id}" missing redFlags array`);
    }
    for (const cue of beat.redFlags) {
      if (!CUE_SET.has(cue)) fail(id, `beat "${beat.id}" has unknown cue "${cue}"`);
      cuesUsed.add(cue);
    }
    if (beat.isDamageBeat) {
      damageBeats += 1;
      if (i !== s.beats!.length - 1) {
        fail(id, `damage beat "${beat.id}" must be the last beat`);
      }
    }
  });

  if (damageBeats !== 1) {
    fail(id, `must have exactly one damage beat, found ${damageBeats}`);
  }
  if (cuesUsed.size < 2) {
    fail(id, "must cover at least 2 distinct cue categories");
  }

  return s as Scenario;
}

export function damageBeatIndex(scenario: Scenario): number {
  return scenario.beats.findIndex((b) => b.isDamageBeat);
}
