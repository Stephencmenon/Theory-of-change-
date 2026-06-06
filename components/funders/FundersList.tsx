"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";
import { money, flagClass, flagLabel } from "@/lib/format";
import type { DeadlineFlag } from "@/lib/domain/deadlines";

type FunderRow = {
  id: string;
  name: string;
  status: "active" | "prospect" | "lapsed";
  grantAmount: number;
  nextDeadline: string | null;
  flag: DeadlineFlag;
};

export default function FundersList({ funders }: { funders: FunderRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", grantAmount: "", status: "prospect" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    const res = await postJson("/api/funders", {
      name: form.name,
      grantAmount: Number(form.grantAmount || 0),
      status: form.status,
    });
    setBusy(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      if (!res.fields) setError(res.error);
      return;
    }
    setForm({ name: "", grantAmount: "", status: "prospect" });
    router.refresh();
  }

  const inp = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <div>
      <form onSubmit={create} className="mb-8 flex max-w-3xl flex-wrap items-end gap-3" noValidate>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inp} />
          {fields.name && <p className="mt-1 text-sm text-flag-red">{fields.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Grant amount</label>
          <input value={form.grantAmount} onChange={(e) => setForm((f) => ({ ...f, grantAmount: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inp}>
            <option value="prospect">prospect</option>
            <option value="active">active</option>
            <option value="lapsed">lapsed</option>
          </select>
        </div>
        <button type="submit" disabled={busy} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {busy ? "Creating…" : "Add funder"}
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-flag-red">{error}</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Funder</th>
            <th className="py-2">Status</th>
            <th className="py-2">Grant</th>
            <th className="py-2">Next deadline</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {funders.map((f) => (
            <tr key={f.id} className="border-b border-gray-100">
              <td className="py-2 font-medium text-gray-900">{f.name}</td>
              <td className="py-2 text-gray-600">{f.status}</td>
              <td className="py-2 text-gray-600">{money(f.grantAmount)}</td>
              <td className="py-2">
                {f.nextDeadline ? (
                  <span className={flagClass(f.flag)}>
                    {f.nextDeadline} {f.flag && `(${flagLabel(f.flag)})`}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="py-2 text-right">
                <Link href={`/funders/${f.id}`} className="text-gray-500 hover:text-gray-900">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
          {funders.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-gray-400">No funders yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
