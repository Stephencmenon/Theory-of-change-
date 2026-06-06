"use client";

import { useRouter } from "next/navigation";

// Period selector — navigates to /dashboard?period=YYYY-MM. Outputs recompute
// server-side for the chosen month.
export default function PeriodSelector({ period }: { period: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      Period
      <input
        type="month"
        defaultValue={period}
        onChange={(e) => {
          if (e.target.value) router.push(`/dashboard?period=${e.target.value}`);
        }}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
    </label>
  );
}
