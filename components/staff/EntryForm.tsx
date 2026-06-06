"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";

type Metric = { id: string; name: string; unit: string };

export default function EntryForm({
  programId,
  metrics,
}: {
  programId: string;
  metrics: Metric[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    const res = await postJson(`/api/programs/${programId}/entry`, {
      entries: metrics.map((m) => ({ metricId: m.id, actualValue: values[m.id] ?? "" })),
    });
    setBusy(false);
    if (!res.ok) {
      if (res.fields) setFields(res.fields);
      else setError(`${res.error}${res.nextAction ? " " + res.nextAction : ""}`);
      return;
    }
    router.refresh(); // page re-renders into read-only mode
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
      {metrics.map((m) => (
        <div key={m.id}>
          <label htmlFor={m.id} className="block text-sm font-medium text-gray-700">
            {m.name} <span className="text-gray-400">({m.unit})</span>
          </label>
          <input
            id={m.id}
            inputMode="decimal"
            value={values[m.id] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields[m.id] && <p className="mt-1 text-sm text-flag-red">{fields[m.id]}</p>}
        </div>
      ))}
      {metrics.length === 0 && (
        <p className="text-sm text-gray-500">No active metrics to enter.</p>
      )}
      {error && <p className="text-sm text-flag-red">{error}</p>}
      <button
        type="submit"
        disabled={busy || metrics.length === 0}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
