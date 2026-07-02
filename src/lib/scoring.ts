import { damageBeatIndex } from "./scenario";
import type { CueId, Scenario } from "./types";
import type { EndReason } from "./callState";

export const POINTS = {
  correctFlag: 20,
  falseFlag: -5,
  earlyHangupBonus: 30,
  perBeatSurvivedBonus: 5,
} as const;

export type Grade = "caught" | "narrow-escape" | "close-call" | "scammed";

export const GRADE_LABELS: Record<Grade, string> = {
  caught: "จับโจรได้ 🚨",
  "narrow-escape": "รอดหวุดหวิด 😮‍💨",
  "close-call": "เกือบโดน 😅",
  scammed: "โดนหลอกแล้ว 😱",
};

const GRADE_BANDS: Array<{ min: number; grade: Grade }> = [
  { min: 80, grade: "caught" },
  { min: 50, grade: "narrow-escape" },
  { min: 25, grade: "close-call" },
  { min: 0, grade: "scammed" },
];

/** Highest score a victim ending can receive — always below the close-call band. */
export const VICTIM_SCORE_CAP = 20;

export type FlagJudgement = "correct" | "false" | "duplicate";

/**
 * Judge a flag attempt: correct if the cue appears in the current or any past
 * beat and has not been claimed yet.
 */
export function judgeFlag(
  cue: CueId,
  beatIndex: number,
  scenario: Scenario,
  alreadyCaught: ReadonlySet<CueId>,
): FlagJudgement {
  const active = new Set<CueId>();
  scenario.beats
    .slice(0, beatIndex + 1)
    .forEach((b) => b.redFlags.forEach((c) => active.add(c)));
  if (!active.has(cue)) return "false";
  return alreadyCaught.has(cue) ? "duplicate" : "correct";
}

export interface CallResult {
  scenario: Scenario;
  endReason: EndReason;
  /** Beat index when the call ended. */
  beatIndex: number;
  caught: CueId[];
  falseFlags: number;
  seconds: number;
}

export interface Score {
  points: number;
  grade: Grade;
  gradeLabel: string;
  caught: CueId[];
  missed: CueId[];
  falseFlags: number;
  seconds: number;
}

export function scoreCall(result: CallResult): Score {
  const { scenario, endReason, beatIndex, caught, falseFlags, seconds } = result;
  const damageIndex = damageBeatIndex(scenario);

  let points = 0;
  for (let i = 0; i < caught.length; i++) {
    points += POINTS.correctFlag;
  }
  for (let i = 0; i < falseFlags; i++) {
    points = Math.max(0, points + POINTS.falseFlag);
  }

  const survived = endReason === "hangup" || endReason === "maxTurns";
  if (endReason === "hangup" && beatIndex < damageIndex) {
    points += POINTS.earlyHangupBonus;
  }
  if (survived) {
    // Beat-based time bonus: the earlier you got out, the more you earn.
    const beatsAvoided = Math.max(0, scenario.beats.length - 1 - beatIndex);
    points += beatsAvoided * POINTS.perBeatSurvivedBonus;
  }
  if (endReason === "scammed") {
    points = Math.min(points, VICTIM_SCORE_CAP);
  }

  const grade = GRADE_BANDS.find((b) => points >= b.min)!.grade;

  const reachable = new Set<CueId>();
  scenario.beats
    .slice(0, beatIndex + 1)
    .forEach((b) => b.redFlags.forEach((c) => reachable.add(c)));
  const missed = [...reachable].filter((c) => !caught.includes(c));

  return {
    points,
    grade,
    gradeLabel: GRADE_LABELS[grade],
    caught,
    missed,
    falseFlags,
    seconds,
  };
}
