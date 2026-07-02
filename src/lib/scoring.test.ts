import { describe, expect, it } from "vitest";
import {
  judgeFlag,
  POINTS,
  scoreCall,
  VICTIM_SCORE_CAP,
  type CallResult,
} from "./scoring";
import { makeFixtureScenario } from "./fixtures";
import type { CueId } from "./types";

const scenario = makeFixtureScenario();
// fixture beats: 0 hook [impersonation], 1 threat [fear-pressure, urgency],
// 2 damage [money-transfer]
const none = new Set<CueId>();

describe("judgeFlag", () => {
  it("accepts a cue from the current beat", () => {
    expect(judgeFlag("impersonation", 0, scenario, none)).toBe("correct");
  });

  it("accepts a cue from a past beat", () => {
    expect(judgeFlag("impersonation", 2, scenario, none)).toBe("correct");
  });

  it("rejects a cue that only appears in a future beat", () => {
    expect(judgeFlag("money-transfer", 0, scenario, none)).toBe("false");
  });

  it("rejects a cue that never appears", () => {
    expect(judgeFlag("too-good", 2, scenario, none)).toBe("false");
  });

  it("does not double-credit an already-caught cue", () => {
    const caught = new Set<CueId>(["impersonation"]);
    expect(judgeFlag("impersonation", 1, scenario, caught)).toBe("duplicate");
  });
});

function result(overrides: Partial<CallResult>): CallResult {
  return {
    scenario,
    endReason: "hangup",
    beatIndex: 1,
    caught: [],
    falseFlags: 0,
    seconds: 42,
    ...overrides,
  };
}

describe("scoreCall", () => {
  it("awards +20 per correct flag and -5 per false flag", () => {
    const s = scoreCall(result({ caught: ["impersonation", "urgency"], falseFlags: 1 }));
    // 40 - 5 + early hangup 30 + 1 beat avoided * 5
    expect(s.points).toBe(
      2 * POINTS.correctFlag + POINTS.falseFlag + POINTS.earlyHangupBonus + 5,
    );
  });

  it("never goes below zero from false flags", () => {
    const s = scoreCall(
      result({ endReason: "error", caught: [], falseFlags: 10, beatIndex: 0 }),
    );
    expect(s.points).toBe(0);
  });

  it("gives the early hang-up bonus only before the damage beat", () => {
    const early = scoreCall(result({ beatIndex: 1 }));
    const late = scoreCall(result({ beatIndex: 2 }));
    expect(early.points - late.points).toBe(POINTS.earlyHangupBonus + 5);
  });

  it("time bonus: earlier hang-up never scores less than later (all else equal)", () => {
    const at0 = scoreCall(result({ beatIndex: 0 })).points;
    const at1 = scoreCall(result({ beatIndex: 1 })).points;
    const at2 = scoreCall(result({ beatIndex: 2 })).points;
    expect(at0).toBeGreaterThanOrEqual(at1);
    expect(at1).toBeGreaterThanOrEqual(at2);
  });

  it("caps the victim ending below the close-call band regardless of flags", () => {
    const s = scoreCall(
      result({
        endReason: "scammed",
        beatIndex: 2,
        caught: ["impersonation", "fear-pressure", "urgency", "money-transfer"],
      }),
    );
    expect(s.points).toBeLessThanOrEqual(VICTIM_SCORE_CAP);
    expect(s.grade).toBe("scammed");
  });

  it("maps score bands to grades", () => {
    expect(
      scoreCall(result({ caught: ["impersonation", "fear-pressure", "urgency"] }))
        .grade,
    ).toBe("caught"); // 60 + 30 + 5 = 95
    expect(scoreCall(result({ caught: ["impersonation"] })).grade).toBe(
      "narrow-escape",
    ); // 20 + 30 + 5 = 55
    expect(
      scoreCall(
        result({
          endReason: "maxTurns",
          beatIndex: 2,
          caught: ["urgency", "impersonation"],
        }),
      ).grade,
    ).toBe("close-call"); // 40 + 0 + 0
    expect(
      scoreCall(result({ endReason: "error", beatIndex: 0, caught: [] })).grade,
    ).toBe("scammed"); // 0
  });

  it("lists missed cues from beats reached only", () => {
    const s = scoreCall(result({ beatIndex: 1, caught: ["urgency"] }));
    expect(s.missed.sort()).toEqual(["fear-pressure", "impersonation"]);
    expect(s.missed).not.toContain("money-transfer"); // damage beat never reached
  });

  it("maxTurns (scammer gave up) still earns the survival time bonus but no early hang-up bonus", () => {
    const s = scoreCall(result({ endReason: "maxTurns", beatIndex: 1 }));
    expect(s.points).toBe(5); // 1 beat avoided * 5, no +30
  });
});
