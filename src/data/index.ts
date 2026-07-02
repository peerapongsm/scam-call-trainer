import type { CaseType, Cue, Scenario, SourceRef } from "@/lib/types";
import taxonomyJson from "./taxonomy.json";
import cuesJson from "./cues.json";
import policeImpersonation from "./scenarios/police-impersonation.json";
import bankImpersonation from "./scenarios/bank-impersonation.json";
import govRefund from "./scenarios/gov-refund.json";
import parcelScam from "./scenarios/parcel-scam.json";
import investmentScam from "./scenarios/investment-scam.json";

export interface Stats {
  year2568: {
    cases: number | null;
    damageMillionBaht: number | null;
    periodNote: string;
    sources: SourceRef[];
  };
}

export const CASE_TYPES = (taxonomyJson as { caseTypes: CaseType[] }).caseTypes;
export const STATS = (taxonomyJson as unknown as { stats: Stats }).stats;
export const CUES = cuesJson as unknown as Cue[];

export const SCENARIOS = [
  policeImpersonation,
  bankImpersonation,
  govRefund,
  parcelScam,
  investmentScam,
] as unknown as Scenario[];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getCue(id: string): Cue | undefined {
  return CUES.find((c) => c.id === id);
}

export function getCaseType(id: string): CaseType | undefined {
  return CASE_TYPES.find((c) => c.id === id);
}
