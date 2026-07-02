"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Debrief } from "@/components/Debrief";
import { FlagSheet } from "@/components/FlagSheet";
import { getCue } from "@/data";
import {
  initialCall,
  reduceCall,
  type CallEvent,
  type CallPhase,
} from "@/lib/callState";
import { checkMessage, PII_WARNINGS } from "@/lib/piiGuard";
import { judgeFlag, scoreCall } from "@/lib/scoring";
import {
  createTts,
  loadTtsPref,
  saveTtsPref,
  type TtsAdapter,
} from "@/lib/tts";
import type { ChatTurn, CueId, Scenario } from "@/lib/types";

const CONSENT_KEY = "scam-call-trainer:consent";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallGame({ scenario }: { scenario: Scenario }) {
  const [phase, setPhase] = useState<CallPhase>(initialCall());
  const [transcript, setTranscript] = useState<ChatTurn[]>([]);
  const [caught, setCaught] = useState<CueId[]>([]);
  const [falseFlags, setFalseFlags] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [quota, setQuota] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [consented, setConsented] = useState<boolean | null>(null);
  const [ttsOn, setTtsOn] = useState(true);

  const startRef = useRef<number | null>(null);
  const endSecondsRef = useRef(0);
  const phaseRef = useRef(phase);
  const ttsRef = useRef<TtsAdapter>({ supported: false, speak: () => {}, cancel: () => {} });
  const [ttsSupported, setTtsSupported] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // phaseRef is the synchronous source of truth (async handlers read it right
  // after dispatching); React state mirrors it for rendering.
  const dispatch = useCallback(
    (event: CallEvent) => {
      const prev = phaseRef.current;
      const next = reduceCall(prev, event, scenario);
      if (next.kind === "ended" && prev.kind !== "ended") {
        endSecondsRef.current = startRef.current
          ? Math.floor((Date.now() - startRef.current) / 1000)
          : 0;
        ttsRef.current.cancel();
      }
      phaseRef.current = next;
      setPhase(next);
    },
    [scenario],
  );

  // TTS init (progressive enhancement — silently text-only when unsupported).
  useEffect(() => {
    setConsented(localStorage.getItem(CONSENT_KEY) === "yes");
    setTtsOn(loadTtsPref(localStorage));
    const init = () => {
      const synth = window.speechSynthesis;
      ttsRef.current = createTts(synth, (text) => new SpeechSynthesisUtterance(text));
      setTtsSupported(ttsRef.current.supported);
    };
    init();
    window.speechSynthesis?.addEventListener("voiceschanged", init);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", init);
  }, []);

  // Call timer.
  useEffect(() => {
    if (phase.kind !== "active") return;
    const t = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(t);
  }, [phase.kind]);

  // Autoscroll chat.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [transcript, pending]);

  const beatIndex = phase.kind === "active" ? phase.beatIndex : 0;
  const beat = scenario.beats[beatIndex];

  const speak = useCallback(
    (text: string) => {
      if (ttsOn) ttsRef.current.speak(text);
    },
    [ttsOn],
  );

  const callApi = useCallback(
    async (turns: ChatTurn[]) => {
      const current = phaseRef.current;
      if (current.kind !== "active") return;
      const beatId = scenario.beats[current.beatIndex].id;
      setPending(true);
      try {
        const res = await fetch("/api/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId: scenario.id, beatId, transcript: turns }),
        });
        if (res.status === 429) {
          setQuota(true);
          dispatch({ type: "apiError" });
          return;
        }
        if (!res.ok) {
          dispatch({ type: "apiError" });
          return;
        }
        const data = (await res.json()) as { say: string; beatComplete: boolean };
        setTranscript((t) => [...t, { role: "scammer", text: data.say }]);
        speak(data.say);
        if (data.beatComplete) dispatch({ type: "beatComplete" });
      } catch {
        dispatch({ type: "apiError" });
      } finally {
        setPending(false);
      }
    },
    [dispatch, scenario, speak],
  );

  const answer = useCallback(() => {
    startRef.current = Date.now();
    dispatch({ type: "answer" });
    void callApi([]);
  }, [callApi, dispatch]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending || phaseRef.current.kind !== "active") return;
      const verdict = checkMessage(trimmed);
      if (!verdict.ok) {
        setToast(PII_WARNINGS[verdict.reason]);
        return;
      }
      setToast(null);
      setInput("");
      const turns: ChatTurn[] = [...transcript, { role: "player", text: trimmed }];
      setTranscript(turns);
      dispatch({ type: "turn" });
      if (phaseRef.current.kind === "active") void callApi(turns);
    },
    [callApi, dispatch, pending, transcript],
  );

  const flag = useCallback(
    (cue: CueId) => {
      setSheetOpen(false);
      if (phaseRef.current.kind !== "active") return;
      const judgement = judgeFlag(
        cue,
        phaseRef.current.beatIndex,
        scenario,
        new Set(caught),
      );
      if (judgement === "correct") {
        setCaught((c) => [...c, cue]);
        setToast(`✅ จับพิรุธได้: ${getCue(cue)?.labelTh ?? cue} (+20)`);
      } else if (judgement === "duplicate") {
        setToast("จับพิรุธข้อนี้ไปแล้ว");
      } else {
        setFalseFlags((f) => f + 1);
        setToast("❌ ยังไม่เจอพิรุธแบบนั้นในสายนี้ (-5)");
      }
    },
    [caught, scenario],
  );

  const hangup = useCallback(() => dispatch({ type: "hangup" }), [dispatch]);

  // ---------- render ----------

  if (consented === false) {
    return (
      <main className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center gap-4 px-4 py-8">
        <h1 className="text-2xl font-extrabold">ก่อนเริ่มซ้อม</h1>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-slate-300">
          <li>
            นี่คือ<strong>เกมฝึกซ้อม</strong> — AI จะสวมบทมิจฉาชีพตามรูปแบบกลโกงที่
            เผยแพร่โดยหน่วยงานทางการ เพื่อสอนให้คุณจับพิรุธ
          </li>
          <li>
            ข้อความที่คุณพิมพ์จะถูกส่งไปประมวลผลที่ Google Gemini —{" "}
            <strong className="text-rose-300">
              ห้ามพิมพ์ข้อมูลจริงของคุณเด็ดขาด
            </strong>{" "}
            (ชื่อ เลขบัตร เบอร์ เลขบัญชี)
          </li>
          <li>ไม่มีการเก็บข้อมูลบนเซิร์ฟเวอร์ คะแนนอยู่ในเครื่องคุณเท่านั้น</li>
          <li>
            เว็บนี้ใช้ Umami เก็บสถิติการใช้งานแบบไม่ระบุตัวตน (ไม่ใช้คุกกี้
            ไม่เก็บข้อมูลส่วนบุคคล)
          </li>
          <li>
            เว็บนี้เป็นโครงการการศึกษาอิสระ{" "}
            <strong>ไม่มีส่วนเกี่ยวข้องกับหน่วยงานรัฐ ตำรวจ หรือธนาคารใดๆ</strong>{" "}
            — ช่องทางแจ้งเหตุจริงคือศูนย์ AOC โทร 1441
          </li>
        </ul>
        <button
          type="button"
          className="w-full rounded-2xl bg-emerald-600 p-4 font-bold text-white active:bg-emerald-500"
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, "yes");
            setConsented(true);
          }}
        >
          เข้าใจแล้ว เริ่มซ้อมเลย
        </button>
      </main>
    );
  }

  if (phase.kind === "ringing") {
    return (
      <main className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-between px-4 py-16">
        <div className="text-center">
          <p className="animate-pulse text-sm font-semibold tracking-widest text-emerald-400">
            สายเรียกเข้า...
          </p>
          <p className="mt-6 text-7xl">📞</p>
          <h1 className="mt-4 text-2xl font-extrabold">{scenario.callerName}</h1>
          <p className="mt-1 text-slate-400">{scenario.callerNumber}</p>
        </div>
        <div className="flex w-full items-center justify-around">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              aria-label="ปฏิเสธสาย"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-3xl active:bg-rose-500"
              onClick={() =>
                setToast("ในชีวิตจริงการไม่รับเบอร์แปลกคือทางที่ดี — แต่ที่นี่คือสนามซ้อม รับสายเลย!")
              }
            >
              ✕
            </button>
            <span className="text-xs text-slate-400">ปฏิเสธ</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              aria-label="รับสาย"
              className="flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-emerald-600 text-3xl active:bg-emerald-500"
              onClick={answer}
            >
              📞
            </button>
            <span className="text-xs text-slate-400">รับสาย</span>
          </div>
        </div>
        {toast && (
          <p className="rounded-xl bg-slate-800 px-4 py-2 text-center text-sm text-amber-200">
            {toast}
          </p>
        )}
      </main>
    );
  }

  if (phase.kind === "ended") {
    if (phase.reason === "error") {
      return (
        <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-6xl">{quota ? "😴" : "📵"}</p>
          <h1 className="text-2xl font-extrabold">
            {quota ? "คู่สายเต็มแล้ว โจรพักเครื่อง" : "สายหลุดกลางคัน"}
          </h1>
          <p className="text-slate-300">
            {quota
              ? "โควตาฟรีของวันนี้หมดแล้ว ลองใหม่พรุ่งนี้ 😅 ระหว่างนี้ไปอ่านกลโกงทางการทั้ง 14 ประเภทกันก่อน"
              : "การเชื่อมต่อมีปัญหา ลองซ้อมใหม่อีกครั้ง"}
          </p>
          <button
            type="button"
            className="rounded-2xl bg-slate-800 px-6 py-3 font-bold active:bg-slate-700"
            onClick={() => window.location.assign(quota ? "/taxonomy" : `/call/${scenario.id}`)}
          >
            {quota ? "📚 อ่านกลโกงทั้ง 14 ประเภท" : "🔁 ลองใหม่"}
          </button>
        </main>
      );
    }
    return (
      <Debrief
        scenario={scenario}
        score={scoreCall({
          scenario,
          endReason: phase.reason,
          beatIndex: phase.beatIndex,
          caught,
          falseFlags,
          seconds: endSecondsRef.current,
        })}
      />
    );
  }

  // active call
  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-md flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="font-bold">{scenario.callerName}</p>
          <p className="text-xs text-emerald-400">{formatClock(elapsed)}</p>
        </div>
        <div className="flex items-center gap-2">
          {ttsSupported && (
            <button
              type="button"
              aria-label="เปิด/ปิดเสียง"
              className={`rounded-full px-3 py-2 text-sm ${ttsOn ? "bg-emerald-700" : "bg-slate-800"}`}
              onClick={() => {
                const next = !ttsOn;
                setTtsOn(next);
                saveTtsPref(localStorage, next);
                if (!next) ttsRef.current.cancel();
              }}
            >
              {ttsOn ? "🔊" : "🔇"}
            </button>
          )}
          <button
            type="button"
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold active:bg-rose-500"
            onClick={hangup}
          >
            📵 วางสาย
          </button>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-2">
          {transcript.map((t, i) => (
            <p
              key={i}
              className={
                t.role === "scammer"
                  ? "max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-2 text-sm"
                  : "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-emerald-700 px-4 py-2 text-sm"
              }
            >
              {t.text}
            </p>
          ))}
          {pending && (
            <p className="max-w-[85%] animate-pulse self-start rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-2 text-sm text-slate-400">
              กำลังพูด...
            </p>
          )}
        </div>
      </div>

      {toast && (
        <p className="mx-4 mb-2 rounded-xl bg-slate-800 px-4 py-2 text-center text-xs text-amber-200">
          {toast}
        </p>
      )}

      <div className="border-t border-slate-800 px-4 py-3">
        {beat?.quickReplies && beat.quickReplies.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {beat.quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                className="shrink-0 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-200 active:bg-slate-700"
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="รายงานพิรุธ"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xl active:bg-amber-400"
            onClick={() => setSheetOpen(true)}
          >
            🚩
          </button>
          <input
            className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm outline-none focus:border-emerald-600"
            placeholder="พิมพ์ตอบ (ห้ามใช้ข้อมูลจริง)"
            value={input}
            maxLength={280}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
          />
          <button
            type="button"
            className="shrink-0 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold active:bg-emerald-500 disabled:opacity-50"
            disabled={pending || !input.trim()}
            onClick={() => send(input)}
          >
            ส่ง
          </button>
        </div>
      </div>

      <FlagSheet open={sheetOpen} onPick={flag} onClose={() => setSheetOpen(false)} />
    </main>
  );
}
