"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson, patchJson, del } from "@/lib/http";

type ProgramOpt = { id: string; name: string };
type Metric = {
  id: string;
  name: string;
  unit: string;
  targetPeriod: "monthly" | "annual";
  offTrackThreshold: number;
  isActive: boolean;
  programName: string;
  entryCount: number;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function MetricsSection({
  programs,
  metrics,
}: {
  programs: ProgramOpt[];
  metrics: Metric[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    programId: programs[0]?.id ?? "",
    name: "",
    unit: "",
    targetPeriod: "monthly",
    offTrackThreshold: "0.80",
    initialTargetValue: "",
    effectiveFrom: currentMonth(),
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    setNotice(null);
    const res = await postJson("/api/admin/metrics", {
      programId: form.programId,
      name: form.name,
      unit: form.unit,
      targetPeriod: form.targetPeriod,
      offTrackThreshold: Number(form.offTrackThreshold),
      initialTargetValue: Number(form.initialTargetValue),
      effectiveFrom: form.effectiveFrom,
    });
    setBusy(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      if (!res.fields) setError(res.error);
      return;
    }
    setForm((f) => ({ ...f, name: "", unit: "", initialTargetValue: "" }));
    router.refresh();
  }

  async function deactivate(m: Metric) {
    await patchJson(`/api/admin/metrics/${m.id}`, { isActive: !m.isActive });
    router.refresh();
  }

  async function remove(m: Metric) {
    setError(null);
    setNotice(null);
    const res = await del(`/api/admin/metrics/${m.id}`);
    if (!res.ok) {
      // Business rule: blocked when entries exist → offer deactivation.
      setError(`${res.error}${res.nextAction ? " " + res.nextAction : ""}`);
      return;
    }
    setNotice("Metric deleted.");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Metrics</h1>

      <form onSubmit={create} className="mb-8 grid max-w-2xl grid-cols-2 gap-3" noValidate>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Program</label>
          <select
            value={form.programId}
            onChange={(e) => set("programId", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {programs.length === 0 && <option value="">No programs — create one first</option>}
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {fields.programId && <p className="mt-1 text-sm text-flag-red">{fields.programId}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.name && <p className="mt-1 text-sm text-flag-red">{fields.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unit</label>
          <input
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="people, %, $"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.unit && <p className="mt-1 text-sm text-flag-red">{fields.unit}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Target period</label>
          <select
            value={form.targetPeriod}
            onChange={(e) => set("targetPeriod", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="monthly">monthly</option>
            <option value="annual">annual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Off-track threshold (0–1)
          </label>
          <input
            value={form.offTrackThreshold}
            onChange={(e) => set("offTrackThreshold", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.offTrackThreshold && (
            <p className="mt-1 text-sm text-flag-red">{fields.offTrackThreshold}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Initial target value
          </label>
          <input
            value={form.initialTargetValue}
            onChange={(e) => set("initialTargetValue", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.initialTargetValue && (
            <p className="mt-1 text-sm text-flag-red">{fields.initialTargetValue}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Effective from</label>
          <input
            type="month"
            value={form.effectiveFrom}
            onChange={(e) => set("effectiveFrom", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.effectiveFrom && (
            <p className="mt-1 text-sm text-flag-red">{fields.effectiveFrom}</p>
          )}
        </div>
        <div className="col-span-2">
          {error && <p className="mb-2 text-sm text-flag-red">{error}</p>}
          {notice && <p className="mb-2 text-sm text-flag-green">{notice}</p>}
          <button
            type="submit"
            disabled={busy || programs.length === 0}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create metric + initial target"}
          </button>
        </div>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Metric</th>
            <th className="py-2">Program</th>
            <th className="py-2">Unit</th>
            <th className="py-2">Period</th>
            <th className="py-2">Threshold</th>
            <th className="py-2">Entries</th>
            <th className="py-2">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.id} className="border-b border-gray-100">
              <td className="py-2 font-medium text-gray-900">{m.name}</td>
              <td className="py-2 text-gray-600">{m.programName}</td>
              <td className="py-2 text-gray-600">{m.unit}</td>
              <td className="py-2 text-gray-600">{m.targetPeriod}</td>
              <td className="py-2 text-gray-600">{m.offTrackThreshold.toFixed(2)}</td>
              <td className="py-2 text-gray-600">{m.entryCount}</td>
              <td className="py-2">
                <span className={m.isActive ? "text-flag-green" : "text-gray-400"}>
                  {m.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-2 text-right">
                <div className="flex justify-end gap-3">
                  <button onClick={() => deactivate(m)} className="text-gray-500 hover:text-gray-900">
                    {m.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => remove(m)} className="text-flag-red hover:underline">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {metrics.length === 0 && (
            <tr>
              <td colSpan={8} className="py-4 text-gray-400">
                No metrics yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
