import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { deadlineWindow, type DeadlineFlag } from "@/lib/domain/deadlines";
import AppHeader from "@/components/AppHeader";
import FundersList from "@/components/funders/FundersList";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Nearest upcoming deadline (renewal or report-due) and its window flag. */
function nextDeadline(
  renewal: Date | null,
  reportDue: Date | null,
  today: Date,
): { date: string | null; flag: DeadlineFlag } {
  const candidates = [renewal, reportDue].filter((d): d is Date => d !== null);
  if (candidates.length === 0) return { date: null, flag: null };
  const soonest = candidates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
  return { date: iso(soonest), flag: deadlineWindow(soonest, today) };
}

// Screen 4 — /funders. ED + Head of Fundraising.
export default async function FundersPage() {
  await requireRole(["ed", "fundraising"]);
  const today = new Date();

  const funders = await prisma.funder.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen">
      <AppHeader active="/funders" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Funders</h1>
        <FundersList
          funders={funders.map((f) => {
            const nd = nextDeadline(f.renewalDate, f.reportDueDate, today);
            return {
              id: f.id,
              name: f.name,
              status: f.status,
              grantAmount: Number(f.grantAmount),
              nextDeadline: nd.date,
              flag: nd.flag,
            };
          })}
        />
      </main>
    </div>
  );
}
