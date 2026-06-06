import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import ReportForm from "@/components/report/ReportForm";

// Screen 3 — /report. ED + Head of Fundraising.
export default async function ReportPage() {
  await requireRole(["ed", "fundraising"]);

  const funders = await prisma.funder.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="min-h-screen">
      <AppHeader active="/report" />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Generate report</h1>
        <ReportForm funders={funders} />
      </main>
    </div>
  );
}
