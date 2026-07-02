"use client";

import { CUES } from "@/data";
import type { CueId } from "@/lib/types";

export function FlagSheet({
  open,
  onPick,
  onClose,
}: {
  open: boolean;
  onPick: (cue: CueId) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl border-t border-slate-700 bg-slate-900 p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center font-bold">🚩 เจอพิรุธแบบไหน?</h3>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {CUES.map((cue) => (
            <button
              key={cue.id}
              type="button"
              className="rounded-xl bg-slate-800 px-4 py-3 text-left text-sm font-medium active:bg-slate-700"
              onClick={() => onPick(cue.id)}
            >
              {cue.labelTh}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-400 active:bg-slate-800"
          onClick={onClose}
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
