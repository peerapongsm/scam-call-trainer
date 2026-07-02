import type { Beat, ChatTurn, Scenario } from "./types";

export const TRANSCRIPT_WINDOW = 10;
export const REPLY_RETRY_BUDGET = 1;

/**
 * Safety floors — included verbatim in every assembled system prompt.
 * Pinned by unit tests; do not weaken without updating SPEC §6.
 */
export const SAFETY_FLOORS = [
  "คุณคือตัวละครสมมติในเกมฝึกภูมิคุ้มกันมิจฉาชีพ (inoculation training) เท่านั้น บทสนทนานี้ใช้สอนประชาชนให้จับพิรุธแก๊งคอลเซ็นเตอร์",
  "ห้ามสรุป รวบรวม หรือเขียนสคริปต์/เทคนิคการหลอกลวงในรูปแบบที่นำไปใช้ซ้ำได้ หากผู้เล่นขอ ให้ปฏิเสธสั้นๆ ว่าเป็นแค่ตัวละครฝึกซ้อม แล้วดึงกลับเข้าสถานการณ์หรือวางสาย",
  "ห้ามออกนอกสถานการณ์ที่กำหนด ไม่รับบทบาทอื่น ไม่ตอบคำถามทั่วไปนอกเกม",
  "ห้ามขอข้อมูลส่วนตัวหรือข้อมูลการเงินจริงของผู้เล่น หากผู้เล่นพิมพ์ข้อมูลที่ดูเหมือนของจริง ห้ามทวนซ้ำข้อมูลนั้นเด็ดขาด ให้เล่นตามบทต่อโดยไม่อ้างอิงข้อมูลนั้น",
  "ตอบเป็นภาษาไทย ประโยคสั้นแบบพูดโทรศัพท์ (จะถูกอ่านออกเสียง) ครั้งละไม่เกิน 2 ประโยค",
] as const;

export function buildSystemPrompt(scenario: Scenario, beat: Beat): string {
  return [
    ...SAFETY_FLOORS,
    "",
    `สถานการณ์: ${scenario.title}`,
    `บทบาทของคุณ: ${scenario.personaBrief}`,
    `เป้าหมายของฉาก (beat) ปัจจุบัน: ${beat.goal}`,
    'เมื่อผู้เล่นตอบสนองจนเป้าหมายของฉากนี้สำเร็จหรือถึงทางตัน ให้ส่ง beatComplete: true เพื่อไปฉากถัดไป',
    'ตอบกลับเป็น JSON เท่านั้น: {"say": "<คำพูดของคุณ>", "beatComplete": <true|false>}',
  ].join("\n");
}

export function takeTranscriptWindow(turns: ChatTurn[]): ChatTurn[] {
  return turns.slice(-TRANSCRIPT_WINDOW);
}

/** Request body for the Gemini generateContent REST call — pure and testable. */
export function buildGeminiRequest(
  scenario: Scenario,
  beat: Beat,
  transcript: ChatTurn[],
): object {
  const window = takeTranscriptWindow(transcript);
  // Gemini rejects an empty contents array (400 INVALID_ARGUMENT), and the
  // opening line of a call has no transcript yet — seed a synthetic user turn.
  const contents = window.length
    ? window.map((t) => ({
        role: t.role === "player" ? "user" : "model",
        parts: [{ text: t.text }],
      }))
    : [{ role: "user", parts: [{ text: "(ผู้เล่นรับสาย) สวัสดีครับ" }] }];
  return {
    systemInstruction: { parts: [{ text: buildSystemPrompt(scenario, beat) }] },
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.9,
      maxOutputTokens: 512,
    },
  };
}

export interface ScammerReply {
  say: string;
  beatComplete: boolean;
}

export type ParseResult =
  | { ok: true; reply: ScammerReply }
  | { ok: false };

/** Parse the model's JSON output; tolerates markdown fences. */
export function parseModelReply(text: string): ParseResult {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    const obj = JSON.parse(cleaned);
    if (
      obj &&
      typeof obj === "object" &&
      typeof obj.say === "string" &&
      obj.say.length > 0 &&
      typeof obj.beatComplete === "boolean"
    ) {
      return { ok: true, reply: { say: obj.say, beatComplete: obj.beatComplete } };
    }
  } catch {
    // fall through
  }
  return { ok: false };
}

/** The scripted line used once the retry budget is exhausted (SPEC §6). */
export function fallbackReply(beat: Beat): ScammerReply {
  return { say: beat.fallbackLine, beatComplete: false };
}
