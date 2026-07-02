import type { Scenario } from "./types";

export const MAX_TURNS = 30;

export type EndReason = "hangup" | "scammed" | "error" | "maxTurns";

export type CallPhase =
  | { kind: "ringing" }
  | { kind: "active"; beatIndex: number; turns: number }
  | { kind: "ended"; reason: EndReason; beatIndex: number; turns: number };

export type CallEvent =
  | { type: "answer" }
  | { type: "turn" }
  | { type: "beatComplete" }
  | { type: "hangup" }
  | { type: "apiError" };

export function initialCall(): CallPhase {
  return { kind: "ringing" };
}

export function reduceCall(
  state: CallPhase,
  event: CallEvent,
  scenario: Scenario,
): CallPhase {
  if (state.kind === "ended") return state;

  if (state.kind === "ringing") {
    return event.type === "answer" ? { kind: "active", beatIndex: 0, turns: 0 } : state;
  }

  const { beatIndex, turns } = state;
  switch (event.type) {
    case "answer":
      return state;
    case "hangup":
      return { kind: "ended", reason: "hangup", beatIndex, turns };
    case "apiError":
      return { kind: "ended", reason: "error", beatIndex, turns };
    case "turn": {
      const next = turns + 1;
      if (next >= MAX_TURNS) {
        // The scammer gives up and hangs up first — the player survived.
        return { kind: "ended", reason: "maxTurns", beatIndex, turns: next };
      }
      return { kind: "active", beatIndex, turns: next };
    }
    case "beatComplete": {
      const beat = scenario.beats[beatIndex];
      const isLast = beatIndex >= scenario.beats.length - 1;
      if (isLast) {
        return {
          kind: "ended",
          reason: beat?.isDamageBeat ? "scammed" : "maxTurns",
          beatIndex,
          turns,
        };
      }
      return { kind: "active", beatIndex: beatIndex + 1, turns };
    }
  }
}
