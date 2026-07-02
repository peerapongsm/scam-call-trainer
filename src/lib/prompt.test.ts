import { describe, expect, it } from "vitest";
import {
  buildGeminiRequest,
  buildSystemPrompt,
  fallbackReply,
  parseModelReply,
  SAFETY_FLOORS,
  takeTranscriptWindow,
  TRANSCRIPT_WINDOW,
} from "./prompt";
import { makeFixtureScenario } from "./fixtures";
import type { ChatTurn } from "./types";

const scenario = makeFixtureScenario();
const beat = scenario.beats[0];

describe("buildSystemPrompt", () => {
  it("contains every safety floor verbatim", () => {
    const prompt = buildSystemPrompt(scenario, beat);
    for (const floor of SAFETY_FLOORS) {
      expect(prompt).toContain(floor);
    }
  });

  it("contains the persona brief and current beat goal", () => {
    const prompt = buildSystemPrompt(scenario, beat);
    expect(prompt).toContain(scenario.personaBrief);
    expect(prompt).toContain(beat.goal);
  });
});

describe("takeTranscriptWindow", () => {
  it("trims to the last N turns", () => {
    const turns: ChatTurn[] = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 ? "player" : "scammer",
      text: `t${i}`,
    }));
    const window = takeTranscriptWindow(turns);
    expect(window).toHaveLength(TRANSCRIPT_WINDOW);
    expect(window[window.length - 1].text).toBe("t24");
    expect(window[0].text).toBe(`t${25 - TRANSCRIPT_WINDOW}`);
  });
});

describe("buildGeminiRequest", () => {
  it("maps roles and requests JSON output", () => {
    const req = buildGeminiRequest(scenario, beat, [
      { role: "scammer", text: "สวัสดีครับ" },
      { role: "player", text: "ใครครับ" },
    ]) as {
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      generationConfig: { responseMimeType: string };
    };
    expect(req.contents.map((c) => c.role)).toEqual(["model", "user"]);
    expect(req.generationConfig.responseMimeType).toBe("application/json");
  });

  it("seeds a synthetic user turn when the transcript is empty (Gemini rejects empty contents)", () => {
    const req = buildGeminiRequest(scenario, beat, []) as {
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    };
    expect(req.contents).toHaveLength(1);
    expect(req.contents[0].role).toBe("user");
    expect(req.contents[0].parts[0].text.length).toBeGreaterThan(0);
  });
});

describe("parseModelReply", () => {
  it("accepts valid JSON", () => {
    expect(parseModelReply('{"say": "สวัสดีครับ", "beatComplete": false}')).toEqual({
      ok: true,
      reply: { say: "สวัสดีครับ", beatComplete: false },
    });
  });

  it("accepts JSON wrapped in markdown fences", () => {
    const r = parseModelReply('```json\n{"say": "ครับ", "beatComplete": true}\n```');
    expect(r).toMatchObject({ ok: true, reply: { beatComplete: true } });
  });

  it("rejects non-JSON and schema misses", () => {
    expect(parseModelReply("สวัสดีครับ ผมตำรวจ").ok).toBe(false);
    expect(parseModelReply('{"say": ""}').ok).toBe(false);
    expect(parseModelReply('{"say": "x"}').ok).toBe(false);
    expect(parseModelReply('{"beatComplete": true}').ok).toBe(false);
  });

  it("provides the beat's scripted fallback line", () => {
    expect(fallbackReply(beat)).toEqual({
      say: beat.fallbackLine,
      beatComplete: false,
    });
  });
});
