import { describe, expect, it } from "vitest";
import { checkMessage, isValidThaiId, MAX_MESSAGE_CHARS } from "./piiGuard";

// Checksum-valid Thai ID (hand-computed): weighted sum of 110170023070 with
// weights 13..2 is 146; 146 mod 11 = 3; check digit = (11-3) mod 10 = 8.
const VALID_ID = "1101700230708";

describe("isValidThaiId", () => {
  it("accepts a checksum-valid id and rejects an off-by-one check digit", () => {
    expect(isValidThaiId(VALID_ID)).toBe(true);
    const bad = VALID_ID.slice(0, 12) + ((Number(VALID_ID[12]) + 1) % 10);
    expect(isValidThaiId(bad)).toBe(false);
  });
});

describe("checkMessage", () => {
  it("blocks a checksum-valid 13-digit Thai ID", () => {
    expect(checkMessage(`เลขบัตรผมคือ ${VALID_ID} ครับ`)).toEqual({
      ok: false,
      reason: "thai-id",
    });
  });

  it("blocks 10-digit phone numbers with and without separators", () => {
    expect(checkMessage("โทรกลับ 0812345678 นะ")).toMatchObject({ reason: "phone" });
    expect(checkMessage("เบอร์ 081-234-5678 ครับ")).toMatchObject({ reason: "phone" });
    expect(checkMessage("เบอร์ 081 234 5678")).toMatchObject({ reason: "phone" });
  });

  it("blocks 10+ digit account-like runs", () => {
    expect(checkMessage("บัญชี 1234567890123456")).toMatchObject({
      reason: "account",
    });
    expect(checkMessage("เลขที่ 9876543210")).toMatchObject({ reason: "account" });
  });

  it("allows normal Thai chat", () => {
    expect(checkMessage("ตำรวจที่ไหนโทรมาแบบนี้ครับ")).toEqual({ ok: true });
  });

  it("allows short numbers, prices and dates", () => {
    expect(checkMessage("1234")).toEqual({ ok: true });
    expect(checkMessage("ค่าปรับ 5,000 บาทเหรอ")).toEqual({ ok: true });
    expect(checkMessage("วันที่ 2/7/2569 เหรอครับ")).toEqual({ ok: true });
    expect(checkMessage("โอ๊ย 30 วินาทีก็รู้แล้วว่าโจร")).toEqual({ ok: true });
  });

  it("enforces the message length cap", () => {
    expect(checkMessage("ก".repeat(MAX_MESSAGE_CHARS + 1))).toEqual({
      ok: false,
      reason: "too-long",
    });
    expect(checkMessage("ก".repeat(MAX_MESSAGE_CHARS))).toEqual({ ok: true });
  });

  it("rejects an invalid-checksum 13-digit run as account-like, not thai-id", () => {
    const bad = VALID_ID.slice(0, 12) + ((Number(VALID_ID[12]) + 1) % 10);
    expect(checkMessage(`เลข ${bad}`)).toMatchObject({ reason: "account" });
  });
});
