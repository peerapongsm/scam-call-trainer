import { describe, expect, it } from "vitest";
import { damageBeatIndex, validateScenario } from "./scenario";
import { FIXTURE_CASE_TYPE_IDS, makeFixtureScenario } from "./fixtures";

const ids = FIXTURE_CASE_TYPE_IDS;

describe("validateScenario", () => {
  it("accepts a valid scenario", () => {
    const s = validateScenario(makeFixtureScenario(), ids);
    expect(s.id).toBe("fixture");
    expect(damageBeatIndex(s)).toBe(2);
  });

  it("rejects a beat without a goal", () => {
    const s = makeFixtureScenario();
    s.beats[1] = { ...s.beats[1], goal: "" };
    expect(() => validateScenario(s, ids)).toThrow(/missing goal/);
  });

  it("rejects an unknown cue", () => {
    const s = makeFixtureScenario();
    // @ts-expect-error intentionally invalid cue
    s.beats[0].redFlags = ["totally-made-up"];
    expect(() => validateScenario(s, ids)).toThrow(/unknown cue/);
  });

  it("rejects zero damage beats", () => {
    const s = makeFixtureScenario();
    s.beats = s.beats.map((b) => ({ ...b, isDamageBeat: false }));
    expect(() => validateScenario(s, ids)).toThrow(/exactly one damage beat/);
  });

  it("rejects two damage beats and non-final damage beats", () => {
    const s = makeFixtureScenario();
    s.beats[1] = { ...s.beats[1], isDamageBeat: true };
    expect(() => validateScenario(s, ids)).toThrow(/must be the last beat/);
  });

  it("rejects an unknown caseTypeId", () => {
    const s = makeFixtureScenario({ caseTypeId: "nope" });
    expect(() => validateScenario(s, ids)).toThrow(/not found in taxonomy/);
  });

  it("rejects a scenario without sources", () => {
    const s = makeFixtureScenario({ sources: [] });
    expect(() => validateScenario(s, ids)).toThrow(/at least one source/);
  });

  it("rejects a beat without a fallback line", () => {
    const s = makeFixtureScenario();
    s.beats[0] = { ...s.beats[0], fallbackLine: "" };
    expect(() => validateScenario(s, ids)).toThrow(/missing fallbackLine/);
  });

  it("rejects a scenario with fewer than 2 distinct cues", () => {
    const s = makeFixtureScenario();
    s.beats = s.beats.map((b) => ({ ...b, redFlags: ["urgency" as const] }));
    expect(() => validateScenario(s, ids)).toThrow(/2 distinct cue categories/);
  });
});
