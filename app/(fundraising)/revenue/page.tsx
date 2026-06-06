import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import RevenuePanel from "@/components/fundraising/RevenuePanel";

const ym = (d: Date) => d.toISOString().slice(0, 7);

// Screen 6 — /revenue. Head of Fundraising only.
export default async function RevenuePage() {
  await requireRole(["fundraising"]);

  const [funders, entries, targets] = await Promise.all([
    prisma.funder.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.revenueEntry.findMany({
      orderBy: [{ period: "desc" }],
      take: 50,
      include: { funder: { select: { name: true } } },
    }),
    prisma.revenueTarget.findMany({
      orderBy: [{ effectiveFrom: "desc" }],
      take: 50,
      include: { funder: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader active="/revenue" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Revenue</h1>
        <RevenuePanel
          funders={funders}
          entries={entries.map((e) => ({
            id: e.id,
            funderName: e.funder?.name ?? "General donations",
            category: e.category,
            period: ym(e.period),
            actualAmount: Number(e.actualAmount),
            edited: e.updatedAt !== null,
          }))}
          targets={targets.map((t) => ({
            id: t.id,
            funderName: t.funder?.name ?? "General donations",
            category: t.category,
            targetAmount: Number(t.targetAmount),
            targetPeriod: t.targetPeriod,
            effectiveFrom: ym(t.effectiveFrom),
          }))}
        />
      </main>
    </div>
  );
}
