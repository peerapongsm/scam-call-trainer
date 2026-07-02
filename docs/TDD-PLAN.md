# TDD Plan — สายโจรจำลอง (Scam Call Trainer)

Executes `SPEC.md`. Tasks are bite-sized and ordered by dependency; each logic task lists its tests **first** — write them, watch them fail, then implement. UI tasks follow the frontend-design skill and are verified by playing the flow, not by unit tests. Tasks marked ⚡ are independent once their prerequisites land and can run as parallel subagents.

Conventions: Vitest, pure modules under `src/lib/`, static content under `src/data/`, no test touches the network (Gemini I/O mocked).

---

## Phase 0 — Scaffold

### T0. Project scaffold
Next.js (App Router) + TypeScript + Tailwind + Vitest wired (`npm test` runs green on a placeholder test). Umami snippet in the root layout. Persistent app shell with the AOC 1441 banner component (styled `tel:1441` button) so every later screen inherits it. `.env.local.example` documenting `GEMINI_API_KEY`.
**Done when:** `npm run dev` renders shell + AOC banner; `npm test` and `npm run build` pass.

---

## Phase 1 — Content curation (no code dependencies) ⚡

### C1. Official taxonomy — `src/data/taxonomy.json`
Subagent curation via WebSearch of official releases (thaipoliceonline.go.th 14 case types; AOC/PRD statistics). Retry blocked fetches with full Chrome UA + `Referer` before declaring a source dead. Every entry: Thai name, description, source URL, publisher, access date; 2568 stats where official figures exist.
**Tests (schema, written first):** all 14 entries present; every entry has non-empty `sources[].url` on an official (`*.go.th` / verified official) domain; stats entries carry a source.

### C2. Cue vocabulary — `src/data/cues.json`
The 8 red-flag categories (§4.3) with Thai label, one-line teaching explanation, and an official-source citation each.
**Tests:** fixed set of 8 ids matches the TypeScript union; every cue has label + explanation + source.

### C3. Five scenario files — `src/data/scenarios/*.json` (after C1, C2)
Confirm the top-5 call-plausible types against curated damage figures, then author each scenario: persona brief, 4–6 escalating beats, exactly one `isDamageBeat` final beat, red flags drawn only from the cue vocabulary, quick replies, sources.
**Tests (schema):** valid `caseTypeId` FK into taxonomy; every `redFlags` entry exists in cues; exactly one damage beat, positioned last; every beat has a goal; ≥2 distinct cue categories per scenario.

---

## Phase 2 — Pure game logic (each ⚡ after T0)

### G1. Types + scenario loader — `src/lib/scenario.ts`
Typed schema, load + validate scenario JSON (the C-task schema tests import this validator — write it against a fixture first).
**Tests:** valid fixture parses; missing beat goal / unknown cue / zero-or-two damage beats each reject with a useful message.

### G2. Call state machine — `src/lib/callState.ts`
States: `ringing → active(beatIndex) → ended(reason)`, reasons `hangup | scammed | error | maxTurns`. Events: `answer`, `beatComplete`, `hangup`, `apiError`, `turn` (with max-turn cap → survived ending).
**Tests:** happy path advances beats in order; `beatComplete` on the damage beat → `ended(scammed)`; hang-up from any active beat → `ended(hangup)`; events after `ended` are no-ops; turn 30 cap ends the call as survived; `apiError` → `ended(error)`.

### G3. Flag judging + score — `src/lib/scoring.ts`
`judgeFlag(attempt, history)` → correct / false / duplicate, and `score(callResult)` → `{points, grade, caught, missed, falseFlags, seconds}` per §5.
**Tests:** flag matching current beat, past beat, future-beat cue (false), duplicate cue (no double credit); +20/−5 arithmetic with floor 0; hang-up-before-damage bonus; beat-based time bonus monotonicity (earlier hang-up ≥ later, all else equal); victim ending caps the score below the `เกือบโดน` band regardless of flags; each grade band boundary; `missed` lists exactly the unclaimed cues from beats reached.

### G4. PII input guard — `src/lib/piiGuard.ts`
**Tests:** blocks a checksum-valid 13-digit Thai ID, 10-digit phone (with/without dashes/spaces), 10+ digit account-like runs; allows normal Thai chat, short numbers (OTP-length fakes like "1234"), prices, dates; enforces the 280-char cap; returns the reason code driving the teaching message.

### G5. Prompt builder + response parsing — `src/lib/prompt.ts`
Assembles the system prompt (safety preamble + persona brief + current-beat goal + transcript window) and parses/validates the `{say, beatComplete}` model output.
**Tests:** assembled prompt contains all §6 safety floors verbatim (refusal, no-real-PII, no-script-export, Thai spoken style); transcript window trims to last 10 turns; parser accepts valid JSON, rejects schema-miss/non-JSON with a retry-then-fallback signal; fallback line for the beat is returned after the retry budget is spent.

---

## Phase 3 — Server route

### S1. `app/api/call/route.ts` (after G5)
Stateless POST per §6: rebuild prompt server-side, call Gemini REST (`gemini-2.5-flash`, key via `x-goog-api-key` header from server env), enforce server-side input caps, map 429 → quota hard-stop payload.
**Tests (fetch mocked):** happy path returns `{say, beatComplete}`; oversized message → 400; unknown scenario/beat → 400; upstream 429 → structured quota response; upstream junk → retry once then fallback line; the API key appears in no response body or error under any branch.

---

## Phase 4 — UI (after Phase 2; frontend-design skill; verify by playing)

### U1. Landing + taxonomy pages ⚡
Landing: headline, cited AOC 2568 stats, 5 scenario cards + สุ่มสาย, consent gate (localStorage). Taxonomy page: all 14 types with citations.

### U2. Incoming-call + call screen
Full-screen incoming call; call UI per §3 (timer, bubbles, quick replies, free-text with PII guard wired, 🚩 cue bottom-sheet, วางสาย). Drives `callState` + `/api/call`. Quota/error states render the §8 hard-stop.

### U3. Debrief + share card ⚡ (after G3)
Score, grade, beat timeline with caught/missed cues and their sourced explanations, replay. Canvas-rendered share PNG + Web Share API with download fallback; best score in localStorage.

### U4. TTS adapter ⚡
`src/lib/tts.ts` adapter around `speechSynthesis` (feature-detect, `th-TH` voice pick, speak/cancel, preference persistence). 🔊 toggle in call top bar; hidden when unsupported.
**Tests (fake synthesis):** no-voice → adapter reports unsupported; speak queues scammer lines only; toggle persists; cancel on hang-up.

---

## Phase 5 — Ship

### V1. Live verification (skill: verify)
Real Gemini key in Vercel env: one full play-through per scenario (5 calls) — beats advance, flags judge correctly, both endings reachable, PII guard fires, quota UX verified by simulating the quota response, TTS spot-checked on a supporting browser, AOC banner confirmed on every state.

### V2. Deploy
Vercel production deploy; **manually disable Deployment Protection in the dashboard**; set/refresh alias (or use the default domain — remember the alias does not follow new deploys). Confirm Umami is receiving events.

### V3. Armory ritual (MANDATORY)
In `github.com/peerapongsm/armory` `projects.json`, find by **slug `scam-call-trainer`**: `status: "done"`, fill `url`/`repo`, mark phases done. Commit, push, verify the live card after the Pages rebuild.

---

## Execution notes

- Suggested subagent batches: after T0 → {C1, C2} ∥ {G2, G3, G4, G5}; then C3 + G1 interlock (validator + fixtures); then S1 ∥ U1; then U2; then {U3, U4}; then ship serially.
- Any test that needs "now" gets it injected — no `Date.now()` inside `src/lib/`.
- If curation finds the candidate top-5 list wrong, C3 updates the scenario list and this plan's assumption — the schema tests don't care which 5 ship.
