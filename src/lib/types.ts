export const CUE_IDS = [
  "impersonation",
  "fear-pressure",
  "urgency",
  "personal-info",
  "money-transfer",
  "app-install",
  "call-transfer",
  "too-good",
] as const;

export type CueId = (typeof CUE_IDS)[number];

export interface SourceRef {
  url: string;
  publisher: string;
  accessed: string;
  verified?: boolean;
  secondary?: boolean;
}

export interface Beat {
  id: string;
  goal: string;
  redFlags: CueId[];
  /** Scripted line used when the AI response fails after the retry budget. */
  fallbackLine: string;
  quickReplies?: string[];
  isDamageBeat?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  caseTypeId: string;
  callerName: string;
  /** Fake number shown on the incoming-call screen. */
  callerNumber: string;
  personaBrief: string;
  beats: Beat[];
  sources: SourceRef[];
}

export interface CaseType {
  id: string;
  nameTh: string;
  description: string;
  sources: SourceRef[];
}

export interface Cue {
  id: CueId;
  labelTh: string;
  explanationTh: string;
  sources: SourceRef[];
}

export interface ChatTurn {
  role: "scammer" | "player";
  text: string;
}
