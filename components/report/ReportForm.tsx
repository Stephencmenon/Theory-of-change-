"use client";

import { useState } from "react";

type Funder = { id: string; name: string };
const currentMonth = () => new Date().toISOString().slice(0, 7);
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export default function ReportForm({ funders }: { funders: Funder[] }) {
  const [reportType, setReportType] = useState<"board" | "funder">("board");
  const [period, setPeriod] = useState(currentMonth());
  const [funderId, setFunderId] = useState(funders[0]?.id ?? "");
  const [edNotes, setEdNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const words = wordCount(edNotes);
  const overLimit = words > 300;
  const inp = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  async function exportPdf(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (reportType === "funder" && !funderId) {
      setError("Select a funder for a funder report.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/report/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportType,
        period,
        funderId: reportType === "funder" ? funderId : undefined,
        edNotes: edNotes || undefined,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      // 422 (no linked programs), 400 (validation), etc. — JSON body.
      let msg = `Export failed (${res.status})`;
      try {
        const j = await res.json();
        msg = `${j.error ?? msg}${j.nextAction ? " " + j.nextAction : ""}`;
      } catch {
        /* non-JSON */
      }
      setError(msg);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${period}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <form onSubmit={exportPdf} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700">Report type</label>
        <select value={reportType} onChange={(e) => setReportType(e.target.value as "board" | "funder")} className={inp}>
          <option value="board">Board report</option>
          <option value="funder">Funder report</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Period</label>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={inp} />
      </div>

      {reportType === "funder" && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Funder</label>
          <select value={funderId} onChange={(e) => setFunderId(e.target.value)} className={inp}>
            {funders.length === 0 && <option value="">No funders</option>}
            {funders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          ED Notes <span className="text-gray-400">(optional, max 300 words)</span>
        </label>
        <textarea value={edNotes} onChange={(e) => setEdNotes(e.target.value)} rows={5} className={inp} />
        <p className={`mt-1 text-xs ${overLimit ? "text-flag-red" : "text-gray-400"}`}>
          {words} / 300 words
        </p>
      </div>

      {error && <p className="text-sm text-flag-red">{error}</p>}

      <button
        type="submit"
        disabled={busy || overLimit}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? "Generating…" : "Export PDF"}
      </button>
    </form>
  );
}
