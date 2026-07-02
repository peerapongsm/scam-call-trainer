import { describe, expect, it, vi } from "vitest";
import { GEMINI_URL, handleCallRequest, type CallDeps } from "./callApi";
import { makeFixtureScenario } from "./fixtures";
import { MAX_MESSAGE_CHARS } from "./piiGuard";

const scenario = makeFixtureScenario();
const API_KEY = "test-secret-key-do-not-leak";

function geminiOk(say: string, beatComplete = false): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: { parts: [{ text: JSON.stringify({ say, beatComplete }) }] },
        },
      ],
    }),
    { status: 200 },
  );
}

function deps(fetchFn: CallDeps["fetchFn"], apiKey: string | undefined = API_KEY): CallDeps {
  return {
    getScenario: (id) => (id === scenario.id ? scenario : undefined),
    apiKey,
    fetchFn,
  };
}

function validBody(overrides: object = {}) {
  return {
    scenarioId: scenario.id,
    beatId: "hook",
    transcript: [
      { role: "scammer", text: "สวัสดีครับ ผมโทรจาก สภ." },
      { role: "player", text: "ใครนะครับ" },
    ],
    ...overrides,
  };
}

describe("handleCallRequest", () => {
  it("happy path returns the scammer reply", async () => {
    const fetchFn = vi.fn().mockResolvedValue(geminiOk("คุณมีคดีนะครับ", true));
    const res = await handleCallRequest(validBody(), deps(fetchFn));
    expect(res).toEqual({
      status: 200,
      body: { say: "คุณมีคดีนะครับ", beatComplete: true },
    });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(GEMINI_URL);
    expect(init.headers["x-goog-api-key"]).toBe(API_KEY);
  });

  it("rejects an oversized player message", async () => {
    const fetchFn = vi.fn();
    const res = await handleCallRequest(
      validBody({
        transcript: [{ role: "player", text: "ก".repeat(MAX_MESSAGE_CHARS + 1) }],
      }),
      deps(fetchFn),
    );
    expect(res.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects PII in the player message server-side", async () => {
    const res = await handleCallRequest(
      validBody({ transcript: [{ role: "player", text: "บัตร 1101700230708" }] }),
      deps(vi.fn()),
    );
    expect(res).toMatchObject({ status: 400, body: { message: "blocked: thai-id" } });
  });

  it("rejects unknown scenario and unknown beat", async () => {
    expect(
      (await handleCallRequest(validBody({ scenarioId: "nope" }), deps(vi.fn()))).status,
    ).toBe(400);
    expect(
      (await handleCallRequest(validBody({ beatId: "nope" }), deps(vi.fn()))).status,
    ).toBe(400);
  });

  it("maps upstream 429 to a structured quota response without retrying", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("quota", { status: 429 }));
    const res = await handleCallRequest(validBody(), deps(fetchFn));
    expect(res).toEqual({ status: 429, body: { error: "quota" } });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries once on junk, then returns the beat's scripted fallback", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "ไม่ใช่ JSON" }] } }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("boom", { status: 500 }));
    const res = await handleCallRequest(validBody(), deps(fetchFn));
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(res).toEqual({
      status: 200,
      body: {
        say: scenario.beats[0].fallbackLine,
        beatComplete: false,
        fallback: true,
      },
    });
  });

  it("recovers when the retry succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(geminiOk("ฮัลโหล ได้ยินไหมครับ"));
    const res = await handleCallRequest(validBody(), deps(fetchFn));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ say: "ฮัลโหล ได้ยินไหมครับ" });
  });

  it("returns config error when the key is missing", async () => {
    const res = await handleCallRequest(validBody(), deps(vi.fn(), ""));
    expect(res).toEqual({ status: 500, body: { error: "config" } });
  });

  it("never leaks the API key in any response body", async () => {
    const branches = await Promise.all([
      handleCallRequest(validBody(), deps(vi.fn().mockResolvedValue(geminiOk("ครับ")))),
      handleCallRequest(validBody({ scenarioId: "nope" }), deps(vi.fn())),
      handleCallRequest(
        validBody(),
        deps(vi.fn().mockResolvedValue(new Response("q", { status: 429 }))),
      ),
      handleCallRequest(
        validBody(),
        deps(vi.fn().mockResolvedValue(new Response("e", { status: 500 }))),
      ),
      handleCallRequest(validBody(), deps(vi.fn(), "")),
    ]);
    for (const res of branches) {
      expect(JSON.stringify(res.body)).not.toContain(API_KEY);
    }
  });
});
