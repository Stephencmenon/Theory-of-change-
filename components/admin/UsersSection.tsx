"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson, patchJson } from "@/lib/http";

type ProgramOpt = { id: string; name: string };
type Role = "ed" | "fundraising" | "staff" | "admin";
type User = {
  id: string;
  email: string;
  role: Role;
  programId: string | null;
  programName: string | null;
};

const ROLES: Role[] = ["ed", "fundraising", "staff", "admin"];

export default function UsersSection({
  users,
  programs,
}: {
  users: User[];
  programs: ProgramOpt[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "staff" as Role,
    programId: programs[0]?.id ?? "",
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    setError(null);
    const res = await postJson("/api/admin/users", {
      email: form.email,
      password: form.password,
      role: form.role,
      programId: form.role === "staff" ? form.programId || null : null,
    });
    setBusy(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      if (!res.fields) setError(res.error);
      return;
    }
    setForm((f) => ({ ...f, email: "", password: "" }));
    router.refresh();
  }

  async function changeRole(u: User, role: Role) {
    if (role === u.role) return;
    let programId: string | null = null;
    if (role === "staff") {
      programId = window.prompt(
        `Assign ${u.email} to which program id? (staff require exactly one)`,
        programs[0]?.id ?? "",
      );
      if (!programId) return;
    }
    const confirmed = window.confirm(
      `Change ${u.email} from "${u.role}" to "${role}"? This is a privileged change.`,
    );
    if (!confirmed) return;
    const res = await patchJson(`/api/admin/users/${u.id}`, {
      role,
      programId,
      confirm: true,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Users</h1>

      <form onSubmit={create} className="mb-8 grid max-w-2xl grid-cols-2 gap-3" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.email && <p className="mt-1 text-sm text-flag-red">{fields.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fields.password && <p className="mt-1 text-sm text-flag-red">{fields.password}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {form.role === "staff" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Program</label>
            <select
              value={form.programId}
              onChange={(e) => set("programId", e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {programs.length === 0 && <option value="">No programs</option>}
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {fields.programId && (
              <p className="mt-1 text-sm text-flag-red">{fields.programId}</p>
            )}
          </div>
        )}
        <div className="col-span-2">
          {error && <p className="mb-2 text-sm text-flag-red">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Email</th>
            <th className="py-2">Role</th>
            <th className="py-2">Program</th>
            <th className="py-2">Change role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-gray-100">
              <td className="py-2 font-medium text-gray-900">{u.email}</td>
              <td className="py-2 text-gray-600">{u.role}</td>
              <td className="py-2 text-gray-600">{u.programName ?? "—"}</td>
              <td className="py-2">
                <select
                  defaultValue={u.role}
                  onChange={(e) => changeRole(u, e.target.value as Role)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-gray-400">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
