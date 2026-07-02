import { describe, expect, it } from "vitest";
import {
  initialCall,
  MAX_TURNS,
  reduceCall,
  type CallEvent,
  type CallPhase,
} from "./callState";
import { makeFixtureScenario } from "./fixtures";

const scenario = makeFixtureScenario();

function run(events: CallEvent[], from: CallPhase = initialCall()): CallPhase {
  return events.reduce((s, e) => reduceCall(s, e, scenario), from);
}

describe("reduceCall", () => {
  it("answers into the first beat", () => {
    expect(run([{ type: "answer" }])).toEqual({
      kind: "active",
      beatIndex: 0,
      turns: 0,
    });
  });

  it("advances beats in order on beatComplete", () => {
    const s = run([{ type: "answer" }, { type: "beatComplete" }]);
    expect(s).toEqual({ kind: "active", beatIndex: 1, turns: 0 });
  });

  it("ends as scammed when the damage (last) beat completes", () => {
    const s = run([
      { type: "answer" },
      { type: "beatComplete" },
      { type: "beatComplete" },
      { type: "beatComplete" },
    ]);
    expect(s).toMatchObject({ kind: "ended", reason: "scammed", beatIndex: 2 });
  });

  it("hang-up from any active beat ends the call", () => {
    const s = run([{ type: "answer" }, { type: "beatComplete" }, { type: "hangup" }]);
    expect(s).toMatchObject({ kind: "ended", reason: "hangup", beatIndex: 1 });
  });

  it("ignores events after ended", () => {
    const ended = run([{ type: "answer" }, { type: "hangup" }]);
    expect(reduceCall(ended, { type: "beatComplete" }, scenario)).toBe(ended);
    expect(reduceCall(ended, { type: "turn" }, scenario)).toBe(ended);
  });

  it("caps the call at MAX_TURNS as survived", () => {
    let s = run([{ type: "answer" }]);
    for (let i = 0; i < MAX_TURNS; i++) s = reduceCall(s, { type: "turn" }, scenario);
    expect(s).toMatchObject({ kind: "ended", reason: "maxTurns", turns: MAX_TURNS });
  });

  it("apiError ends the call with error reason", () => {
    const s = run([{ type: "answer" }, { type: "apiError" }]);
    expect(s).toMatchObject({ kind: "ended", reason: "error" });
  });

  it("does not answer twice or advance from ringing", () => {
    expect(run([{ type: "beatComplete" }])).toEqual({ kind: "ringing" });
    const active = run([{ type: "answer" }, { type: "answer" }]);
    expect(active).toEqual({ kind: "active", beatIndex: 0, turns: 0 });
  });
});
