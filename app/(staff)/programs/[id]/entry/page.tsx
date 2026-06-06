import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { toPeriodDate } from "@/lib/domain/periods";
import SignOutButton from "@/components/SignOutButton";
import EntryForm from "@/components/staff/EntryForm";

const monthLabel = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// Screen 7 — /programs/[id]/entry. Staff-only (middleware confines them here).
export default async function EntryPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["staff"]);
  // Middleware already confines staff to their own program; guard anyway.
  if (session.user.programId !== params.id) {
    redirect(`/programs/${session.user.programId}/entry`);
  }

  const now = new Date();
  const period = toPeriodDate(now.getUTCFullYear(), now.getUTCMonth() + 1);

  const program = await prisma.program.findUnique({
    where: { id: params.id },
    select: { name: true },
  });

  const metrics = await prisma.metric.findMany({
    where: { programId: params.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true },
  });

  const entries = await prisma.metricEntry.findMany({
    where: { metricId: { in: metrics.map((m) => m.id) }, period },
    select: { metricId: true, actualValue: true },
  });
  const submitted = entries.length > 0;
  const valueById = new Map(entries.map((e) => [e.metricId, Number(e.actualValue)]));

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="font-semibold text-gray-900">
            {program?.name ?? "Program"} — data entry
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold text-gray-900">{monthLabel(period)}</h1>
        <p className="mb-6 text-sm text-gray-500">
          Enter this period&apos;s values. Once submitted they cannot be edited.
        </p>

        {submitted ? (
          <div>
            <p className="mb-4 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700">
              Values for {monthLabel(period)} have been submitted (read-only).
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2">Metric</th>
                  <th className="py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{m.name}</td>
                    <td className="py-2 text-gray-700">
                      {valueById.has(m.id) ? `${valueById.get(m.id)} ${m.unit}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EntryForm programId={params.id} metrics={metrics} />
        )}
      </main>
    </div>
  );
}
