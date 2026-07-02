# สายโจรจำลอง (Scam Call Trainer) — Spec v1

Status: **approved design, pre-implementation** (2026-07-02).
Decisions grilled with the owner: call medium = **text chat + optional browser TTS**, scoring = **deterministic tap-to-flag**, MVP scope = **top 5 official case types**.

Read `STARTER.md` for the project brief, verified data, and house rules. This spec is the contract for the TDD plan in `TDD-PLAN.md`.

## 1. One-liner

A web game where an AI scammer "calls" you. You practice spotting the red flags (พิรุธ) and hanging up in time. You get a score and a shareable card, backed by official AOC 1441 / Royal Thai Police statistics and taxonomy.

## 2. Goals / Non-goals

**Goals (MVP)**

- Inoculation training: teach detection cues for the 5 most damaging phone-scam case types, mapped to the official taxonomy.
- A complete play loop: incoming call → live chat call → hang up → scored debrief → share card.
- Official statistics cited on-page; AOC 1441 referral visible on every screen.
- $0 runtime: Gemini free tier behind a Vercel serverless proxy.

**Non-goals (MVP)**

- No speech-to-text (player replies by typing / quick-reply buttons). TTS is a progressive enhancement only.
- No accounts, no server-side storage, no leaderboard.
- No coverage of non-call scam types (romance, marketplace, gambling) as playable scenarios — they appear on the taxonomy page only.
- No PWA/service worker in MVP.

## 3. Player flow

```
Landing ──เลือกสถานการณ์/สุ่ม──▶ Incoming-call screen ──รับสาย──▶ Call screen ──วางสาย/โดนหลอกจบ──▶ Debrief ──▶ Share card
   │                                                                                          │
   └── Taxonomy & stats page (14 official types, citations) ◀────── "เรียนรู้กลโกงทั้งหมด" ◀──┘
```

1. **Landing** — headline, AOC 2568 damage statistics (405,929 cases / 23,403 ล้านบาท, cited), scenario picker (5 cards + "สุ่มสาย"), button to taxonomy page, PDPA consent gate (see §9) before first play.
2. **Incoming-call screen** — full-screen fake incoming call (spoofed-looking number, scenario-appropriate caller name), รับสาย / ปฏิเสธ buttons. Rejecting shows a gentle nudge that real training means picking up.
3. **Call screen** — chat skinned as a phone call:
   - Top bar: caller name, call timer (drives the "จับโจรได้ใน X วินาที" metric).
   - Message bubbles; scammer messages optionally spoken via TTS (§7).
   - Input: free-text box + 2–3 scenario-driven quick replies.
   - **🚩 flag button**: opens a bottom sheet of cue categories; picking one records a flag attempt (§5).
   - **วางสาย button** (red, prominent): ends the call at any time.
4. **Debrief** — score, grade, timeline of beats showing which red flags you caught/missed with the official-source explanation for each, AOC 1441 banner, replay + share buttons.
5. **Share card** — canvas-rendered PNG: grade, "จับโจรได้ใน X วินาที", flags caught count, scenario name, site URL. No transcript, no PII. Web Share API with download fallback.

## 4. Scenarios and content model

### 4.1 Official taxonomy

A curated data file `data/taxonomy.json` lists **all 14 official online-crime case types** from thaipoliceonline.go.th releases, each with: Thai name, short description, source URL + publisher + access date, and 2568 loss statistics where an official figure exists. This file is curation output (TDD-PLAN task C1) — **no entry ships without a source URL**.

### 4.2 MVP playable scenarios (5)

The 5 call-plausible, highest-damage types. Candidate list (to be confirmed against official releases during curation):

1. แก๊งคอลเซ็นเตอร์แอบอ้างตำรวจ/DSI (คดีฟอกเงิน–พัสดุผิดกฎหมาย)
2. แอบอ้างธนาคาร (บัตร/บัญชีถูกอายัด, ดูดเงิน)
3. แอบอ้างหน่วยงานรัฐ (คืนภาษี/ค่าไฟ, ให้โหลดแอปปลอม)
4. พัสดุตกค้าง (แอบอ้างไปรษณีย์/ขนส่ง)
5. หลอกให้ลงทุน (แนะนำพอร์ต ผลตอบแทนเกินจริง)

### 4.3 Scenario schema

Each scenario is a static JSON file validated by a schema test:

```jsonc
{
  "id": "police-impersonation",
  "title": "ตำรวจปลอมทวงคดี",
  "caseTypeId": "…",            // FK into taxonomy.json
  "callerName": "สภ.เมือง (?)", // shown on incoming-call screen
  "personaBrief": "…",           // fed into the system prompt
  "beats": [                      // ordered escalation script
    {
      "id": "hook",
      "goal": "อ้างตัวเป็นตำรวจ แจ้งว่ามีพัสดุผิดกฎหมาย",
      "redFlags": ["impersonation", "fear-pressure"],
      "quickReplies": ["…"]
    },
    // … escalating beats …
    {
      "id": "damage",
      "goal": "สั่งให้โอนเงินตรวจสอบ/โหลดแอป",
      "redFlags": ["money-transfer", "urgency"],
      "isDamageBeat": true       // reaching the END of this beat = player got scammed
    }
  ],
  "sources": [{ "url": "…", "publisher": "…", "accessed": "…" }]
}
```

**Red-flag cue categories** (fixed vocabulary, one source-backed definition each in `data/cues.json`): `impersonation` (อ้างหน่วยงาน), `fear-pressure` (ขู่ให้กลัว), `urgency` (เร่งรัดห้ามปรึกษาใคร), `personal-info` (ขอข้อมูลส่วนตัว), `money-transfer` (ให้โอนเงิน/บัญชีปลอดภัย), `app-install` (ให้โหลดแอป/กดลิงก์), `call-transfer` (โอนสายให้"เจ้าหน้าที่"), `too-good` (ผลตอบแทนเกินจริง).

## 5. Game mechanics and scoring (pure logic — TDD)

- The call advances through beats. Gemini improvises dialogue for the **current beat only**; a structured response field signals beat completion, and the client advances the state machine.
- **Flagging:** the player taps 🚩 and picks a cue category. The attempt is **correct** if that cue is in the `redFlags` of the current or any past beat and not already claimed; otherwise it's a **false flag**.
- **End conditions:**
  - Player taps วางสาย → call ends, scored.
  - Damage beat completes (player played along to the end) → **โดนหลอก** ending, scored as victim.
  - Quota/API failure → call ends gracefully with hard-stop UX (§8); no score, AOC banner shown.
- **Score formula** (deterministic, unit-tested):
  - +20 per correct flag, −5 per false flag (floor 0 per event).
  - +30 hang-up bonus if the player hangs up before the damage beat begins.
  - Time bonus: scaled by how early (in beats survived, not wall-clock) the player hung up.
  - Victim ending: score capped low regardless of flags.
- **Grades:** score bands → `จับโจรได้` / `รอดหวุดหวิด` / `เกือบโดน` / `โดนหลอกแล้ว 😱`, each with a debrief message and the AOC 1441 referral.
- The debrief always lists **missed** red flags with their official-source explanations — the teaching payload.

## 6. AI integration (yai-aree pattern)

- **Route:** `app/api/call/route.ts` — stateless POST. Client sends `{scenarioId, beatId, transcriptWindow}`; server rebuilds the full system prompt from the scenario file + persona brief + hardened safety preamble. The key never leaves the server.
- **Model:** `gemini-2.5-flash` via plain `fetch` REST, key in `x-goog-api-key` header, `GEMINI_API_KEY` server-only env var on Vercel.
- **Structured output:** response constrained to JSON `{say: string, beatComplete: boolean}`. Non-JSON / schema-miss → one retry, then graceful degrade to a scripted fallback line for that beat (calls never dead-end on a parse error).
- **Caps:** user message ≤ 280 chars (enforced client + server), transcript window = last 10 turns, max ~30 turns per call then the scammer "hangs up" (scored as survived).
- **Hardened system prompt (safety floors, server-side):**
  - Persona exists only inside the named scenario for inoculation training; refuse off-scenario roleplay and any request to generalize, list, or export scam scripts/techniques ("ผมเป็นแค่ตัวละครฝึกซ้อม…" + steer back or end call).
  - Never ask the user for real personal/financial data; if the user volunteers something that looks real, respond with the in-fiction beat WITHOUT echoing the data, and the client shows the PII warning (§9).
  - Output Thai, short spoken-style lines (they may be read aloud by TTS).
- Refusal/steer-back behaviors are pinned by unit tests on the **prompt builder** (the floors are literally present in the assembled prompt) and by mocked-response tests on the route handler.

## 7. TTS (progressive enhancement)

- `speechSynthesis` with a `th-TH` voice when available: scammer lines are spoken as they arrive; a 🔊 toggle in the call top bar (default ON where supported, preference in localStorage).
- Feature-detect; when unsupported or no Thai voice exists, the toggle hides and the game is silently text-only. No STT anywhere in MVP.
- Wrapped in a small adapter module so game logic never touches the API directly (unit-testable with a fake).

## 8. Failure & quota UX

- Gemini 429/exhausted → hard stop: "คู่สายเต็มแล้ว โจรพักเครื่อง ลองใหม่พรุ่งนี้ 😅" + AOC 1441 banner + link to taxonomy page (so the visit still teaches something).
- Network/5xx mid-call → same graceful end; partial score is NOT shown (avoid rewarding a broken call).
- **AOC 1441 referral is rendered in the persistent app shell** — visible on landing, call, debrief, error, and quota states by construction, with a one-tap `tel:1441` styled button.

## 9. Privacy, PDPA, house rules

- Consent/disclaimer gate before the first message is sent to the AI (yai-aree pattern): explains that typed text goes to Google Gemini, instructs **never type real personal data**, stored acceptance in localStorage.
- **PII input guard** (pure function, TDD): blocks sending messages that look like real data — 13-digit Thai ID (with checksum), 10-digit phone numbers, 10+ digit account-like runs — and turns it into a teaching moment ("อย่าพิมพ์ข้อมูลจริงเด็ดขาด — โจรจริงก็จะขอแบบนี้แหละ").
- Persistence is localStorage only: consent, TTS preference, best scores per scenario.
- Umami analytics snippet, website id `3f09453d-0b39-443e-8845-5e65611cc58a`.
- All interactive elements are styled `<button>`s (background + rounded) — never naked links.

## 10. Stack

- **Next.js (App Router) + TypeScript on Vercel** (free plan; Deployment Protection must be disabled manually in the dashboard; re-run `vercel alias set` after each production deploy or use the default domain).
- Tailwind CSS; mobile-first (the fiction is a phone call — design for a phone screen first).
- **Vitest** for all pure logic; Gemini I/O mocked. No test hits the real API.
- Static data (`taxonomy.json`, `cues.json`, scenario files) bundled at build time — no runtime fetches for content.

## 11. Definition of Done

Per `STARTER.md`: live on Vercel with real-AI verification of at least one full play-through per scenario, Umami embedded, then the armory ritual — update `projects.json` by **slug `scam-call-trainer`** (status, url/repo, phases), push, verify the card is live.
