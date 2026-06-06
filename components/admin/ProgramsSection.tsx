"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson, patchJson } from "@/lib/http";

type Program = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export default function ProgramsSection({ programs }: { programs: Program[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    const res = await postJson("/api/admin/programs", { name, description });
    setBusy(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      if (!res.fields) setError(res.error);
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
  }

  async function toggleActive(p: Program) {
    await patchJson(`/api/admin/programs/${p.id}`, { isActive: !p.isActive });
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Programs</h1>

      <form onSubmit={create} className="mb-8 max-w-md space-y-3" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.name && <p className="mt-1 text-sm text-flag-red">{fields.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-flag-red">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create program"}
        </button>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Name</th>
            <th className="py-2">Description</th>
            <th className="py-2">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id} className="border-b border-gray-100">
              <td className="py-2 font-medium text-gray-900">{p.name}</td>
              <td className="py-2 text-gray-600">{p.description || "—"}</td>
              <td className="py-2">
                <span className={p.isActive ? "text-flag-green" : "text-gray-400"}>
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() => toggleActive(p)}
                  className="text-gray-500 hover:text-gray-900"
                >
                  {p.isActive ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
          {programs.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-gray-400">
                No programs yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
