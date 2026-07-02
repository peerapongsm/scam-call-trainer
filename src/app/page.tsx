import Link from "next/link";
import { SCENARIOS, STATS } from "@/data";
import { RandomCallButton } from "@/components/RandomCallButton";

function formatNumber(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("th-TH");
}

export default function LandingPage() {
  const stats = STATS.year2568;
  const statSource = stats.sources[0];
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <p className="text-5xl">📱</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          สายโจรจำลอง
        </h1>
        <p className="mt-2 text-slate-300">
          AI สวมบทมิจฉาชีพโทรหาคุณ — ซ้อมจับพิรุธ วางสายให้ทัน
          ก่อนเจอของจริง
        </p>
      </header>

      <section className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-center">
        <p className="text-sm text-rose-200">
          ปี 2568 เฉพาะคนวัยทำงาน (20–49 ปี) แจ้งความออนไลน์{" "}
          <strong className="text-rose-100">{formatNumber(stats.cases)} เคส</strong>{" "}
          ความเสียหายรวม{" "}
          <strong className="text-rose-100">
            {formatNumber(stats.damageMillionBaht)} ล้านบาท
          </strong>
        </p>
        {statSource && (
          <p className="mt-1 text-xs text-rose-300/70">
            ที่มา: {statSource.publisher} ({stats.periodNote})
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">เลือกสายที่จะซ้อมรับ</h2>
        {SCENARIOS.map((s) => (
          <Link key={s.id} href={`/call/${s.id}`} className="block">
            <button
              type="button"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left active:bg-slate-800"
            >
              <span className="font-bold">{s.title}</span>
              <span className="mt-1 block text-sm text-slate-400">
                สายเรียกเข้าจาก: {s.callerName}
              </span>
            </button>
          </Link>
        ))}
        <RandomCallButton scenarioIds={SCENARIOS.map((s) => s.id)} />
      </section>

      <section className="text-center">
        <Link href="/taxonomy">
          <button
            type="button"
            className="rounded-full bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 active:bg-slate-700"
          >
            📚 เรียนรู้กลโกงทางการทั้ง 14 ประเภท
          </button>
        </Link>
      </section>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        เกมนี้เป็นการฝึกซ้อมเพื่อสร้างภูมิคุ้มกัน (inoculation training)
        เท่านั้น ไม่มีการเก็บข้อมูลส่วนตัว
        และห้ามพิมพ์ข้อมูลจริงของคุณระหว่างซ้อม
      </p>
    </main>
  );
}
