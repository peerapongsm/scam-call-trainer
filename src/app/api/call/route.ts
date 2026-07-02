import { NextResponse } from "next/server";
import { handleCallRequest } from "@/lib/callApi";
import { getScenarioById } from "@/data";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "bad-request", message: "invalid JSON" },
      { status: 400 },
    );
  }
  const res = await handleCallRequest(body, {
    getScenario: getScenarioById,
    apiKey: process.env.GEMINI_API_KEY,
    fetchFn: fetch,
  });
  return NextResponse.json(res.body, { status: res.status });
}
