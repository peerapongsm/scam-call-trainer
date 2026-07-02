"use client";

import { useRouter } from "next/navigation";

export function RandomCallButton({ scenarioIds }: { scenarioIds: string[] }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="w-full rounded-2xl bg-emerald-600 p-4 font-bold text-white active:bg-emerald-500"
      onClick={() => {
        const id = scenarioIds[Math.floor(Math.random() * scenarioIds.length)];
        router.push(`/call/${id}`);
      }}
    >
      🎲 สุ่มสาย — ไม่รู้ว่าโจรแบบไหนจะโทรมา
    </button>
  );
}
