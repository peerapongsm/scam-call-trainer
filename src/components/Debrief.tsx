"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getCue } from "@/data";
import type { Score } from "@/lib/scoring";
import { shareCard } from "@/lib/shareCard";
import type { Scenario } from "@/lib/types";

const GRADE_INTRO: Record<Score["grade"], string> = {
  caught: "สุดยอด! คุณจับพิรุธได้และวางสายทัน โจรคนนี้ไม่ได้อะไรเลย",
  "narrow-escape": "รอดมาได้! แต่ยังมีพิรุธหลายจุดที่หลุดรอดสายตาไป",
  "close-call": "หวุดหวิดมาก — ถ้าเป็นสายจริง อาจไม่มีโอกาสแก้ตัว",
  scammed: "ถ้าเป็นสายจริง เงินคุณหายไปแล้ว... ซ้อมอีกครั้งให้จับพิรุธได้ไวขึ้น",
};

export function Debrief({
  scenario,
  score,
}: {
  scenario: Scenario;
  score: Score;
}) {
  useEffect(() => {
    const key = `scam-call-trainer:best:${scenario.id}`;
    const prev = Number(localStorage.getItem(key) ?? "-1");
    if (score.points > prev) localStorage.setItem(key, String(score.points));
  }, [scenario.id, score.points]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
      <header className="text-center">
        <p className="text-6xl">
          {score.grade === "caught" ? "🚨" : score.grade === "scammed" ? "😱" : "😮‍💨"}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{score.gradeLabel}</h1>
        <p className="mt-2 text-slate-300">{GRADE_INTRO[score.grade]}</p>
        <p className="mt-3 text-lg">
          <span className="font-bold text-amber-300">{score.points} คะแนน</span>
          {score.grade !== "scammed" && (
            <span className="text-slate-400"> · วางสายใน {score.seconds} วินาที</span>
          )}
        </p>
      </header>

      {score.caught.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
          <h2 className="font-bold text-emerald-300">
            ✅ พิรุธที่คุณจับได้ ({score.caught.length})
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-emerald-100">
            {score.caught.map((id) => (
              <li key={id}>🚩 {getCue(id)?.labelTh ?? id}</li>
            ))}
          </ul>
        </section>
      )}

      {score.missed.length > 0 && (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4">
          <h2 className="font-bold text-rose-300">
            ⚠️ พิรุธที่หลุดรอดไป ({score.missed.length})
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {score.missed.map((id) => {
              const cue = getCue(id);
              if (!cue) return null;
              return (
                <div key={id}>
                  <p className="text-sm font-semibold text-rose-200">
                    🚩 {cue.labelTh}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-300">{cue.explanationTh}</p>
                  {cue.sources[0] && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      ที่มา: {cue.sources[0].publisher}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {score.falseFlags > 0 && (
        <p className="text-center text-sm text-slate-400">
          กดธงผิดไป {score.falseFlags} ครั้ง (-5 คะแนน/ครั้ง) —
          แม่นขึ้นได้ด้วยการอ่านหน้ารวมกลโกง
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="w-full rounded-2xl bg-amber-500 p-4 font-bold text-slate-950 active:bg-amber-400"
          onClick={() =>
            shareCard({
              score,
              scenarioTitle: scenario.title,
              siteUrl: window.location.host,
            })
          }
        >
          📤 แชร์การ์ดผลลัพธ์
        </button>
        <button
          type="button"
          className="w-full rounded-2xl bg-slate-800 p-4 font-bold text-slate-100 active:bg-slate-700"
          onClick={() => window.location.assign(`/call/${scenario.id}`)}
        >
          🔁 ซ้อมสายนี้อีกครั้ง
        </button>
        <Link href="/" className="block">
          <button
            type="button"
            className="w-full rounded-2xl bg-slate-900 p-4 text-slate-300 active:bg-slate-800"
          >
            ← เลือกสายอื่น
          </button>
        </Link>
      </div>
    </main>
  );
}
