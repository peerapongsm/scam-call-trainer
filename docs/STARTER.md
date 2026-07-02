# สายโจรจำลอง (Scam Call Trainer) — Project Starter

**Status: idea + data verified GREEN (2026-07-02, curation-based). No spec/plan yet — do NOT start coding before a spec exists.**

Part of the project-365 "year of building" body of work (idea #17 in the root backlog).
Armory id is assigned at ship time — always read the armory `projects.json` by SLUG `scam-call-trainer`, never by a remembered id (ids get renumbered by parallel sessions).

## Concept (from backlog entry)

- **Issue:** แก๊งคอลเซ็นเตอร์หลอกคนไทยเสียหายมหาศาลทุกปี แต่คนส่วนใหญ่ไม่เคยได้ "ซ้อม" รับสายโจรจริงๆ
- **Solves:** AI สวมบทมิจฉาชีพโทรมาหาคุณ ฝึกจับพิรุธและวางสายให้ทัน ให้คะแนน+การ์ดแชร์ อ้างอิงสถิติความเสียหายจากศูนย์ AOC 1441/ตำรวจ และรูปแบบกลโกงที่เผยแพร่อย่างเป็นทางการ
- **Medium:** web · **Track:** live · **Tags:** viral, ai, scam, safety, thai, persona
- **Planned phases:**
  1. Compile official scam-pattern taxonomy + AOC/police loss statistics for on-page citations
  2. AI scammer persona chat/voice flow with detection scoring
  3. Share card ("จับโจรได้ใน X วินาที") + pitch to media/ธนาคาร awareness campaigns

## Verified data (2026-07-02)

- **AOC 1441 official statistics are citable:** ปี 2568 = **405,929 cases, damage 23,403 ล้านบาท** (PRD/AOC official releases).
- **thaipoliceonline.go.th publishes 14 official case types** → build the scam taxonomy from official releases only.
- Curation path proven (same as gov-service-locator): Thai gov homepages are often JS/cookie-walled, but **WebSearch reaches deep official URLs** — a subagent CAN curate without controller help. Retry blocked fetches with full Chrome UA + `Referer` headers before declaring dead.
- **AI persona = Google Gemini free tier** — pattern proven in yai-aree (project #3):
  - Server-side stateless proxy route (`app/api/.../route.ts`) hides the key; key via `x-goog-api-key` **header** (never URL), server-only env var on Vercel.
  - Model id `gemini-2.5-flash`, call via plain `fetch` REST (no SDK dep).
  - Free-tier quota → hard-stop UX ("เต็มแล้ว ลองพรุ่งนี้"), input length caps, structured JSON responses.

## Safety guardrails (non-negotiable)

- Persona is **inoculation training only**: hardened system prompt must refuse to generate reusable real-scam scripts, refuse off-scenario roleplay, and never collect real personal/financial data from the user.
- **AOC 1441 referral (report hotline) always visible on every screen**, including error/quota/offline states.
- Cite official loss statistics on-page; no fabricated numbers, no invented scam patterns — taxonomy traces to official releases.
- Educational framing: the goal is teaching detection cues (พิรุธ), scored against the official case-type taxonomy.

## Stack note

An AI backend means GitHub Pages static export cannot hide the key → use **Vercel** (like yai-aree: Next.js + stateless `/api` proxy, key in Vercel env, Deployment Protection must be disabled manually in dashboard). Gotcha: a manually-set Vercel alias does NOT move to new deployments automatically — re-run `vercel alias set` after each production deploy, or use the default project domain.

## House rules (project-365, non-negotiable)

- **$0 runtime** (free Gemini tier + Vercel free plan).
- **Umami analytics** snippet, website id `3f09453d-0b39-443e-8845-5e65611cc58a`.
- **UI: styled `<button>` elements (background + rounded), never naked links.** Use the frontend-design skill for UI tasks.
- No PII persistence; anything stored stays on-device (localStorage), consent/disclaimer gate if any user text is sent to the AI (PDPA — see yai-aree pattern).
- If PWA/service worker: HTML navigations network-first, bump cache name every SW change.
- TDD the pure logic (scoring, taxonomy mapping, crisis/refusal floors) with Vitest; mock the Gemini I/O.

## Workflow expected

1. Brainstorm + grill the design with the user → written spec in `docs/`.
2. Written TDD plan (bite-sized tasks) → subagent-driven execution.
3. Verify live (real AI calls) before calling anything done.

## Definition of Done (armory ritual — MANDATORY)

The project is NOT finished until the Armory is updated:
1. In the armory repo (github.com/peerapongsm/armory), edit `projects.json` — find the entry by **slug `scam-call-trainer`**, set `status: "done"`, fill `url`/`repo`, mark `phases[].done`.
2. Web project → Umami snippet must be embedded.
3. Commit + push armory → GitHub Pages rebuild → verify the card is live.
