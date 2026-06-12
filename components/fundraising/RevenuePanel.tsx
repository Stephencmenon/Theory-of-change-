"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";

type Funder = { id: string; name: string };
type Category = "grant" | "donation" | "other";
type EntryRow = {
  id: string;
  funderName: string;
  category: Category;
  period: string;
  actualAmount: number;
  edited: boolean;
};
type TargetRow = {
  id: string;
  funderName: string;
  category: Category;
  targetAmount: number;
  targetPeriod: "monthly" | "annual";
  effectiveFrom: string;
};

const CATEGORIES: Category[] = ["grant", "donation", "other"];
const GENERAL = "__general__";
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (n: number) => `$${n.toLocaleString()}`;

// funder select value "__general__" → null (general donations).
function funderValue(v: string): string | null {
  return v === GENERAL ? null : v;
}

export default function RevenuePanel({
  funders,
  entries,
  targets,
}: {
  funders: Funder[];
  entries: EntryRow[];
  targets: TargetRow[];
}) {
  const router = useRouter();

  // --- (a) Enter actual ---
  const [actual, setActual] = useState({
    funder: GENERAL,
    category: "donation" as Category,
    period: currentMonth(),
    actualAmount: "",
  });
  const [actualFields, setActualFields] = useState<Record<string, string>>({});
  const [actualMsg, setActualMsg] = useState<string | null>(null);
  const [actualBusy, setActualBusy] = useState(false);

  async function saveActual(e: React.FormEvent) {
    e.preventDefault();
    setActualBusy(true);
    setActualFields({});
    setActualMsg(null);
    const res = await postJson<{ edited?: boolean }>("/api/revenue/entries", {
      funderId: funderValue(actual.funder),
      category: actual.category,
      period: actual.period,
      actualAmount: Number(actual.actualAmount),
    });
    setActualBusy(false);
    if (!res.ok) {
      setActualFields(res.fields ?? {});
      if (!res.fields) setActualMsg(res.error);
      return;
    }
    setActual((a) => ({ ...a, actualAmount: "" }));
    setActualMsg(res.data?.edited ? "Actual updated." : "Actual saved.");
    router.refresh();
  }

  // --- (b) Set target ---
  const [target, setTarget] = useState({
    funder: GENERAL,
    category: "donation" as Category,
    targetAmount: "",
    targetPeriod: "monthly",
    effectiveFrom: currentMonth(),
  });
  const [targetFields, setTargetFields] = useState<Record<string, string>>({});
  const [targetMsg, setTargetMsg] = useState<string | null>(null);
  const [targetBusy, setTargetBusy] = useState(false);

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetBusy(true);
    setTargetFields({});
    setTargetMsg(null);
    const res = await postJson("/api/revenue/targets", {
      funderId: funderValue(target.funder),
      category: target.category,
      targetAmount: Number(target.targetAmount),
      targetPeriod: target.targetPeriod,
      effectiveFrom: target.effectiveFrom,
    });
    setTargetBusy(false);
    if (!res.ok) {
      setTargetFields(res.fields ?? {});
      if (!res.fields) setTargetMsg(res.error);
      return;
    }
    setTarget((t) => ({ ...t, targetAmount: "" }));
    setTargetMsg("New target version added.");
    router.refresh();
  }

  const inp = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
  const FunderSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inp}>
      <option value={GENERAL}>General donations (no funder)</option>
      {funders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* (a) Enter actual — a distinct operation */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Enter actual</h2>
        <form onSubmit={saveActual} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700">Funder</label>
            <FunderSelect value={actual.funder} onChange={(v) => setActual((a) => ({ ...a, funder: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={actual.category}
                onChange={(e) => setActual((a) => ({ ...a, category: e.target.value as Category }))}
                className={inp}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Period</label>
              <input
                type="month"
                value={actual.period}
                onChange={(e) => setActual((a) => ({ ...a, period: e.target.value }))}
                className={inp}
              />
              {actualFields.period && <p className="mt-1 text-sm text-flag-red">{actualFields.period}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Actual amount</label>
            <input
              value={actual.actualAmount}
              onChange={(e) => setActual((a) => ({ ...a, actualAmount: e.target.value }))}
              className={inp}
            />
            {actualFields.actualAmount && <p className="mt-1 text-sm text-flag-red">{actualFields.actualAmount}</p>}
          </div>
          {actualMsg && <p className="text-sm text-flag-green">{actualMsg}</p>}
          <button type="submit" disabled={actualBusy} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {actualBusy ? "Saving…" : "Save actual"}
          </button>
        </form>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-700">Recent actuals</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Funder</th><th>Category</th><th>Period</th><th>Amount</th><th>Edited</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{e.funderName}</td>
                <td className="text-gray-600">{e.category}</td>
                <td className="text-gray-600">{e.period}</td>
                <td className="text-gray-600">{money(e.actualAmount)}</td>
                <td className="text-gray-400">{e.edited ? "✓" : ""}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={5} className="py-3 text-gray-400">No actuals yet.</td></tr>}
          </tbody>
        </table>
      </section>

      {/* (b) Set target — a separate operation */}
      <section>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Set target</h2>
        <form onSubmit={saveTarget} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700">Funder</label>
            <FunderSelect value={target.funder} onChange={(v) => setTarget((t) => ({ ...t, funder: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={target.category}
                onChange={(e) => setTarget((t) => ({ ...t, category: e.target.value as Category }))}
                className={inp}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Target period</label>
              <select
                value={target.targetPeriod}
                onChange={(e) => setTarget((t) => ({ ...t, targetPeriod: e.target.value }))}
                className={inp}
              >
                <option value="monthly">monthly</option>
                <option value="annual">annual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Target amount</label>
              <input
                value={target.targetAmount}
                onChange={(e) => setTarget((t) => ({ ...t, targetAmount: e.target.value }))}
                className={inp}
              />
              {targetFields.targetAmount && <p className="mt-1 text-sm text-flag-red">{targetFields.targetAmount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Effective from</label>
              <input
                type="month"
                value={target.effectiveFrom}
                onChange={(e) => setTarget((t) => ({ ...t, effectiveFrom: e.target.value }))}
                className={inp}
              />
            </div>
          </div>
          {targetMsg && <p className="text-sm text-flag-green">{targetMsg}</p>}
          <button type="submit" disabled={targetBusy} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {targetBusy ? "Saving…" : "Set target"}
          </button>
        </form>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-700">Target history</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Funder</th><th>Category</th><th>Period</th><th>Amount</th><th>From</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{t.funderName}</td>
                <td className="text-gray-600">{t.category}</td>
                <td className="text-gray-600">{t.targetPeriod}</td>
                <td className="text-gray-600">{money(t.targetAmount)}</td>
                <td className="text-gray-600">{t.effectiveFrom}</td>
              </tr>
            ))}
            {targets.length === 0 && <tr><td colSpan={5} className="py-3 text-gray-400">No targets yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
