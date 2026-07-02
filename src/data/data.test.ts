import { describe, expect, it } from "vitest";
import { CASE_TYPES, CUES, SCENARIOS, STATS } from "./index";
import { validateScenario } from "@/lib/scenario";
import { CUE_IDS } from "@/lib/types";
import type { SourceRef } from "@/lib/types";

// House rule (STARTER): official statistics only, everything cited.
// These tests are the guard — the data files cannot ship half-curated.

const OFFICIAL_DOMAIN = /https:\/\/([a-z0-9-]+\.)*(go\.th|or\.th)(\/|$)/;

function expectCited(sources: SourceRef[], label: string) {
  expect(sources.length, `${label} must cite at least one source`).toBeGreaterThan(0);
  for (const s of sources) {
    expect(s.url, `${label} source url`).toBeTruthy();
    expect(s.publisher, `${label} source publisher`).toBeTruthy();
    expect(s.accessed, `${label} source accessed date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (!s.secondary) {
      expect(s.url, `${label} primary source must be an official domain`).toMatch(
        OFFICIAL_DOMAIN,
      );
    }
  }
}

describe("taxonomy.json", () => {
  it("lists all 14 official case types, each cited", () => {
    expect(CASE_TYPES).toHaveLength(14);
    for (const ct of CASE_TYPES) {
      expect(ct.id).toBeTruthy();
      expect(ct.nameTh).toBeTruthy();
      expect(ct.description).toBeTruthy();
      expectCited(ct.sources, `case type ${ct.id}`);
    }
  });

  it("has cited 2568 statistics", () => {
    expect(STATS.year2568.cases).toBeGreaterThan(0);
    expect(STATS.year2568.damageMillionBaht).toBeGreaterThan(0);
    expectCited(STATS.year2568.sources, "stats.year2568");
  });
});

describe("cues.json", () => {
  it("matches the fixed cue vocabulary exactly", () => {
    expect(CUES.map((c) => c.id).sort()).toEqual([...CUE_IDS].sort());
  });

  it("every cue has a label, teaching explanation and citation", () => {
    for (const cue of CUES) {
      expect(cue.labelTh).toBeTruthy();
      expect(cue.explanationTh.length).toBeGreaterThan(20);
      expectCited(cue.sources, `cue ${cue.id}`);
    }
  });
});

describe("scenarios", () => {
  const caseTypeIds = new Set(CASE_TYPES.map((c) => c.id));

  it("ships exactly 5 scenarios", () => {
    expect(SCENARIOS).toHaveLength(5);
  });

  it("every scenario passes schema validation against the real taxonomy", () => {
    for (const s of SCENARIOS) {
      expect(() => validateScenario(s, caseTypeIds)).not.toThrow();
    }
  });

  it("every scenario is cited", () => {
    for (const s of SCENARIOS) {
      expectCited(s.sources, `scenario ${s.id}`);
    }
  });
});
