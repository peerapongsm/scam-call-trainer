export const MAX_MESSAGE_CHARS = 280;

export type PiiVerdict =
  | { ok: true }
  | { ok: false; reason: "too-long" | "thai-id" | "phone" | "account" };

/** Thai national ID checksum (mod-11 on the first 12 digits). */
export function isValidThaiId(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  const sum = digits
    .slice(0, 12)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
}

/**
 * Blocks messages that look like real personal data (SPEC §9).
 * Digit runs are matched across spaces and dashes ("081-234-5678").
 */
export function checkMessage(text: string): PiiVerdict {
  if (text.length > MAX_MESSAGE_CHARS) return { ok: false, reason: "too-long" };

  const runs = text.match(/[\d](?:[\s\-.]?\d)*/g) ?? [];
  for (const run of runs) {
    const digits = run.replace(/\D/g, "");
    if (digits.length === 13 && isValidThaiId(digits)) {
      return { ok: false, reason: "thai-id" };
    }
    if (digits.length === 10 && digits.startsWith("0")) {
      return { ok: false, reason: "phone" };
    }
    if (digits.length >= 10) {
      return { ok: false, reason: "account" };
    }
  }
  return { ok: true };
}

export const PII_WARNINGS: Record<Exclude<PiiVerdict, { ok: true }>["reason"], string> = {
  "too-long": "ข้อความยาวเกินไป (จำกัด 280 ตัวอักษร)",
  "thai-id":
    "อย่าพิมพ์เลขบัตรประชาชนจริงเด็ดขาด! โจรจริงก็จะขอแบบนี้แหละ — ใช้เลขมั่วๆ แทน",
  phone:
    "อย่าพิมพ์เบอร์โทรจริง! นี่คือสิ่งที่มิจฉาชีพต้องการ — ใช้เบอร์ปลอมในการซ้อม",
  account:
    "อย่าพิมพ์เลขบัญชี/เลขบัตรจริง! ห้ามให้ข้อมูลการเงินทางโทรศัพท์เด็ดขาด",
};
