import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import FunderDetail from "@/components/funders/FunderDetail";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

// Screen 5 — /funders/[id]. ED + Head of Fundraising.
export default async function FunderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ed", "fundraising"]);

  const funder = await prisma.funder.findUnique({
    where: { id: params.id },
    include: { funderPrograms: { include: { program: true } } },
  });
  if (!funder) notFound();

  const allPrograms = await prisma.program.findMany({ orderBy: { name: "asc" } });
  const linkedIds = new Set(funder.funderPrograms.map((fp) => fp.programId));

  return (
    <div className="min-h-screen">
      <AppHeader active="/funders" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/funders" className="text-sm text-gray-500 hover:text-gray-900">
          ← Funders
        </Link>
        <h1 className="mb-6 mt-2 text-2xl font-semibold text-gray-900">{funder.name}</h1>
        <FunderDetail
          funder={{
            id: funder.id,
            name: funder.name,
            grantAmount: Number(funder.grantAmount),
            status: funder.status,
            renewalDate: iso(funder.renewalDate),
            reportDueDate: iso(funder.reportDueDate),
            notes: funder.notes ?? "",
          }}
          linkedPrograms={funder.funderPrograms.map((fp) => ({
            id: fp.program.id,
            name: fp.program.name,
          }))}
          availablePrograms={allPrograms
            .filter((p) => !linkedIds.has(p.id))
            .map((p) => ({ id: p.id, name: p.name }))}
        />
      </main>
    </div>
  );
}
