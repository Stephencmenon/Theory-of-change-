"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson, postJson } from "@/lib/http";

type Funder = {
  id: string;
  name: string;
  grantAmount: number;
  status: "active" | "prospect" | "lapsed";
  renewalDate: string;
  reportDueDate: string;
  notes: string;
};
type ProgramOpt = { id: string; name: string };

export default function FunderDetail({
  funder,
  linkedPrograms,
  availablePrograms,
}: {
  funder: Funder;
  linkedPrograms: ProgramOpt[];
  availablePrograms: ProgramOpt[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: funder.name,
    grantAmount: String(funder.grantAmount),
    status: funder.status,
    renewalDate: funder.renewalDate,
    reportDueDate: funder.reportDueDate,
    notes: funder.notes,
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkChoice, setLinkChoice] = useState(availablePrograms[0]?.id ?? "");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inp = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setMsg(null);
    const res = await patchJson(`/api/funders/${funder.id}`, {
      name: form.name,
      grantAmount: Number(form.grantAmount || 0),
      status: form.status,
      renewalDate: form.renewalDate || null,
      reportDueDate: form.reportDueDate || null,
      notes: form.notes,
    });
    setBusy(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      if (!res.fields) setMsg(res.error);
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  async function link() {
    if (!linkChoice) return;
    await postJson(`/api/funders/${funder.id}/programs`, { programId: linkChoice });
    router.refresh();
  }

  async function unlink(programId: string) {
    // DELETE carries a JSON body (the program to unlink), so use fetch directly.
    await fetch(`/api/funders/${funder.id}/programs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} />
            {fields.name && <p className="mt-1 text-sm text-flag-red">{fields.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Grant amount</label>
            <input value={form.grantAmount} onChange={(e) => set("grantAmount", e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inp}>
              <option value="prospect">prospect</option>
              <option value="active">active</option>
              <option value="lapsed">lapsed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Renewal date</label>
            <input type="date" value={form.renewalDate} onChange={(e) => set("renewalDate", e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Report due date</label>
            <input type="date" value={form.reportDueDate} onChange={(e) => set("reportDueDate", e.target.value)} className={inp} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inp} rows={3} />
          </div>
        </div>
        {msg && <p className="text-sm text-flag-green">{msg}</p>}
        <button type="submit" disabled={busy} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {busy ? "Saving…" : "Save details"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Linked programs</h2>
        <p className="mb-3 text-sm text-gray-500">
          A funder report can only be generated when at least one program is linked.
        </p>
        <ul className="mb-4 space-y-2">
          {linkedPrograms.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
              <span className="text-gray-900">{p.name}</span>
              <button onClick={() => unlink(p.id)} className="text-flag-red hover:underline">
                Unlink
              </button>
            </li>
          ))}
          {linkedPrograms.length === 0 && (
            <li className="text-sm text-gray-400">No programs linked.</li>
          )}
        </ul>
        {availablePrograms.length > 0 && (
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Link a program</label>
              <select value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)} className={inp}>
                {availablePrograms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button onClick={link} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
              Link
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
