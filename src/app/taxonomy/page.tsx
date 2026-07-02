import Link from "next/link";
import { CASE_TYPES, CUES } from "@/data";

export const metadata = {
  title: "กลโกงทางการ 14 ประเภท — สายโจรจำลอง",
};

export default function TaxonomyPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
      <header>
        <Link href="/">
          <button
            type="button"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300 active:bg-slate-700"
          >
            ← กลับหน้าแรก
          </button>
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold">
          ประเภทคดีอาชญากรรมออนไลน์ตามทางการ
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          อ้างอิงจากประกาศอย่างเป็นทางการ (thaipoliceonline.go.th /
          ศูนย์ AOC 1441) — แหล่งที่มากำกับทุกรายการ
        </p>
      </header>

      <section className="flex flex-col gap-3">
        {CASE_TYPES.map((ct, i) => (
          <article
            key={ct.id}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
          >
            <h2 className="font-bold">
              {i + 1}. {ct.nameTh}
            </h2>
            <p className="mt-1 text-sm text-slate-300">{ct.description}</p>
            <p className="mt-2 text-xs text-slate-500">
              ที่มา:{" "}
              {ct.sources.map((s, j) => (
                <a
                  key={j}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-600 hover:text-slate-300"
                >
                  {s.publisher}
                  {j < ct.sources.length - 1 ? ", " : ""}
                </a>
              ))}
            </p>
          </article>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold">พิรุธที่ต้องจับให้ได้</h2>
        <div className="mt-3 flex flex-col gap-2">
          {CUES.map((cue) => (
            <div
              key={cue.id}
              className="rounded-xl border border-amber-500/20 bg-slate-900 p-3"
            >
              <p className="font-semibold text-amber-300">🚩 {cue.labelTh}</p>
              <p className="mt-1 text-sm text-slate-300">{cue.explanationTh}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
