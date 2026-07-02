import { checkMessage } from "./piiGuard";
import {
  buildGeminiRequest,
  fallbackReply,
  parseModelReply,
  REPLY_RETRY_BUDGET,
  type ScammerReply,
} from "./prompt";
import type { ChatTurn, Scenario } from "./types";

export const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export interface CallRequestBody {
  scenarioId: string;
  beatId: string;
  transcript: ChatTurn[];
}

export type CallResponse =
  | { status: 200; body: ScammerReply & { fallback?: boolean } }
  | { status: 400; body: { error: "bad-request"; message: string } }
  | { status: 429; body: { error: "quota" } }
  | { status: 500; body: { error: "config" } };

export interface CallDeps {
  getScenario: (id: string) => Scenario | undefined;
  apiKey: string | undefined;
  fetchFn: typeof fetch;
}

function extractText(geminiJson: unknown): string | undefined {
  const j = geminiJson as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return j?.candidates?.[0]?.content?.parts?.[0]?.text;
}

export async function handleCallRequest(
  raw: unknown,
  deps: CallDeps,
): Promise<CallResponse> {
  const body = raw as Partial<CallRequestBody>;
  if (!body || typeof body.scenarioId !== "string" || typeof body.beatId !== "string") {
    return { status: 400, body: { error: "bad-request", message: "missing fields" } };
  }
  const scenario = deps.getScenario(body.scenarioId);
  if (!scenario) {
    return { status: 400, body: { error: "bad-request", message: "unknown scenario" } };
  }
  const beat = scenario.beats.find((b) => b.id === body.beatId);
  if (!beat) {
    return { status: 400, body: { error: "bad-request", message: "unknown beat" } };
  }
  const transcript = Array.isArray(body.transcript) ? body.transcript : [];
  if (
    transcript.some(
      (t) =>
        !t ||
        (t.role !== "player" && t.role !== "scammer") ||
        typeof t.text !== "string",
    )
  ) {
    return { status: 400, body: { error: "bad-request", message: "bad transcript" } };
  }
  // Server-side enforcement of the client-side guard (caps + PII).
  const lastPlayer = [...transcript].reverse().find((t) => t.role === "player");
  if (lastPlayer) {
    const verdict = checkMessage(lastPlayer.text);
    if (!verdict.ok) {
      return {
        status: 400,
        body: { error: "bad-request", message: `blocked: ${verdict.reason}` },
      };
    }
  }
  if (!deps.apiKey) {
    return { status: 500, body: { error: "config" } };
  }

  const request = buildGeminiRequest(scenario, beat, transcript);

  for (let attempt = 0; attempt <= REPLY_RETRY_BUDGET; attempt++) {
    let res: Response;
    try {
      res = await deps.fetchFn(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": deps.apiKey,
        },
        body: JSON.stringify(request),
      });
    } catch {
      continue; // network error → consume an attempt
    }
    if (res.status === 429) {
      return { status: 429, body: { error: "quota" } };
    }
    if (!res.ok) {
      continue;
    }
    let text: string | undefined;
    try {
      text = extractText(await res.json());
    } catch {
      text = undefined;
    }
    if (text) {
      const parsed = parseModelReply(text);
      if (parsed.ok) {
        return { status: 200, body: parsed.reply };
      }
    }
  }

  // Retry budget spent — never dead-end the call (SPEC §6).
  return { status: 200, body: { ...fallbackReply(beat), fallback: true } };
}
