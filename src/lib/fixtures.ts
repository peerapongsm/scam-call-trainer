import type { Scenario } from "./types";

/** Minimal valid scenario used by unit tests. */
export function makeFixtureScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "fixture",
    title: "สายทดสอบ",
    caseTypeId: "case-a",
    callerName: "สภ.ทดสอบ",
    callerNumber: "02-000-0000",
    personaBrief: "ตำรวจปลอมทวงคดี",
    sources: [
      { url: "https://example.go.th/x", publisher: "ทดสอบ", accessed: "2026-07-02" },
    ],
    beats: [
      {
        id: "hook",
        goal: "อ้างตัวเป็นตำรวจ",
        redFlags: ["impersonation"],
        fallbackLine: "สวัสดีครับ ผมโทรจาก สภ. นะครับ",
      },
      {
        id: "threat",
        goal: "ขู่ว่ามีคดี",
        redFlags: ["fear-pressure", "urgency"],
        fallbackLine: "คุณมีส่วนพัวพันคดีฟอกเงินนะครับ",
      },
      {
        id: "damage",
        goal: "สั่งให้โอนเงิน",
        redFlags: ["money-transfer"],
        fallbackLine: "โอนเงินมาตรวจสอบที่บัญชีปลอดภัยครับ",
        isDamageBeat: true,
      },
    ],
    ...overrides,
  };
}

export const FIXTURE_CASE_TYPE_IDS: ReadonlySet<string> = new Set(["case-a"]);
