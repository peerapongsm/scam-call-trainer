export function AocBanner() {
  return (
    <div className="sticky bottom-0 z-50 border-t border-amber-500/30 bg-slate-900/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <p className="text-xs leading-snug text-slate-300">
          ถูกมิจฉาชีพหลอก? แจ้งศูนย์ AOC ได้ตลอด 24 ชม.
        </p>
        <a href="tel:1441" className="shrink-0">
          <button
            type="button"
            className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-slate-950 active:bg-amber-400"
          >
            📞 โทร 1441
          </button>
        </a>
      </div>
    </div>
  );
}
