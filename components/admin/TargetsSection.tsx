"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";

type MetricTarget = { id: string; targetValue: number; effectiveFrom: string };
type MetricRow = {
  id: string;
  name: string;
  programName: string;
  targets: MetricTarget[];
  latestEntryPeriod: string | null;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function TargetsSection({ metrics }: { metrics: MetricRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(metrics[0]?.id ?? "");
  const [targetValue, setTargetValue] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(currentMonth());
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = metrics.find((m) => m.id === selectedId) ?? null;

  async function addTarget(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    setNotice(null);
    const res = await postJson("/api/admin/targets", {
      metricId: selectedId,
      targetValue: Number(targetValue),
      effectiveFrom,
    });
    setBusy(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      // Backdating block (422) and other business errors come without `fields`.
      if (!res.fields) setError(`${res.error}${res.nextAction ? " " + res.nextAction : ""}`);
      return;
    }
    setTargetValue("");
    setNotice("New target version added.");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Targets</h1>
      <p className="mb-6 max-w-2xl text-sm text-gray-500">
        Setting a target inserts a new versioned row — previous targets are never
        overwritten. A target cannot be backdated to a period that already has
        entries.
      </p>

      <div className="mb-4 max-w-md">
        <label className="block text-sm font-medium text-gray-700">Metric</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {metrics.length === 0 && <option value="">No metrics</option>}
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.programName} — {m.name}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          <form onSubmit={addTarget} className="mb-6 flex max-w-md items-end gap-3" noValidate>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Target value</label>
              <input
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fields.targetValue && (
                <p className="mt-1 text-sm text-flag-red">{fields.targetValue}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Effective from</label>
              <input
                type="month"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fields.effectiveFrom && (
                <p className="mt-1 text-sm text-flag-red">{fields.effectiveFrom}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add target"}
            </button>
          </form>

          {error && <p className="mb-3 text-sm text-flag-red">{error}</p>}
          {notice && <p className="mb-3 text-sm text-flag-green">{notice}</p>}
          {selected.latestEntryPeriod && (
            <p className="mb-3 text-sm text-gray-500">
              Latest entered period for this metric: <strong>{selected.latestEntryPeriod}</strong>{" "}
              — new targets must be effective after this.
            </p>
          )}

          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Target history (newest first)
          </h2>
          <table className="w-full max-w-md border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">Effective from</th>
                <th className="py-2">Target value</th>
              </tr>
            </thead>
            <tbody>
              {selected.targets.map((t) => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{t.effectiveFrom}</td>
                  <td className="py-2 text-gray-600">{t.targetValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
