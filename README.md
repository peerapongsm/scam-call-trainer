# สายโจรจำลอง (Scam Call Trainer)

Practice taking a scam call before the real one comes: an AI plays the scammer, you spot the red flags (พิรุธ) and hang up in time. Scored, shareable, grounded in official AOC 1441 / Royal Thai Police scam statistics and case-type taxonomy.

**Status:** implemented — pending Vercel deploy + live-AI verification. See [`docs/SPEC.md`](docs/SPEC.md) (design) and [`docs/TDD-PLAN.md`](docs/TDD-PLAN.md) (build plan).

## How it works

- Pick one of 5 scenarios (or random) based on the highest-damage official phone-scam case types — an "incoming call" appears.
- The scammer improvises via Gemini (`gemini-2.5-flash`) around scripted escalation beats; you chat, tap 🚩 when you spot a red flag, and hang up when you're sure.
- Deterministic scoring (+20 per caught cue, −5 per false flag, early hang-up bonus) → grade → shareable result card ("จับโจรได้ใน X วินาที").
- Optional Thai text-to-speech via the browser's `speechSynthesis` (auto-hidden when unsupported).
- All 14 official case types listed with citations at `/taxonomy`; AOC 1441 referral visible on every screen.

## Safety

Inoculation training only: hardened system prompt refuses off-scenario roleplay and reusable scam-script generation; a PII guard blocks real-looking Thai IDs/phone/account numbers client- and server-side; no data stored server-side (scores live in localStorage).

## Development

```bash
npm install
npm test        # Vitest — pure logic + data schema + mocked API tests
npm run dev     # needs GEMINI_API_KEY in .env.local (see .env.local.example)
npm run build
```

Deploys on Vercel: set `GEMINI_API_KEY` in project env vars, disable Deployment Protection in the dashboard.

Part of [the Armory](https://peerapongsm.github.io/armory/) — a year of building.
