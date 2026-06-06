import { prisma } from "@/lib/prisma";
import { fiscalYearStart } from "@/lib/domain/periods";
import { lookupTarget } from "@/lib/domain/targets";
import {
  revenueStatus,
  orgRevenueStatus,
  type RevenueStatus,
} from "@/lib/domain/revenue";
import { deadlineWindow, type DeadlineFlag } from "@/lib/domain/deadlines";
import { buildMetricOutcome, type MetricOutcome } from "@/lib/data/outcomes";

export type { MetricOutcome } from "@/lib/data/outcomes";

// Read + compose the ED dashboard view model (ADD §5.1). All business rules are
// applied via lib/domain/* — nothing is recomputed inline.
//
// Target resolution: we load all target rows and resolve in-memory with
// `lookupTarget`, which branches correctly on a null funderId (general
// donations). This deliberately avoids a raw equality join, sidestepping the
// SQL `NULL = NULL` pitfall (ADD §4.3 binding constraint).

export type ProgramOutcome = {
  id: string;
  name: string;
  metrics: MetricOutcome[];
};

export type RevenueRow = {
  key: string;
  funderName: string;
  category: "grant" | "donation" | "other";
  actual: number | null;
  target: number | null;
  status: RevenueStatus | null;
  warning: "no-target" | null;
};

export type DeadlineRow = {
  id: string;
  name: string;
  date: string | null;
  flag: DeadlineFlag;
};

export type DashboardData = {
  programs: ProgramOutcome[];
  revenue: { rows: RevenueRow[]; orgStatus: RevenueStatus | null; hasData: boolean };
  deadlines: DeadlineRow[];
};

const num = (d: { toString(): string } | number) => Number(d.toString());
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function getDashboardData(period: Date): Promise<DashboardData> {
  const fyStart = fiscalYearStart(period);

  // --- Program outcomes ----------------------------------------------------
  const programs = await prisma.program.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      metrics: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          targets: true,
          // Entries within the fiscal year up to and including the period.
          entries: { where: { period: { gte: fyStart, lte: period } } },
        },
      },
    },
  });

  const programOutcomes: ProgramOutcome[] = programs.map((p) => ({
    id: p.id,
    name: p.name,
    metrics: p.metrics.map((m) =>
      buildMetricOutcome(
        {
          id: m.id,
          name: m.name,
          unit: m.unit,
          targetPeriod: m.targetPeriod,
          offTrackThreshold: num(m.offTrackThreshold),
          targets: m.targets.map((t) => ({ effectiveFrom: t.effectiveFrom, targetValue: num(t.targetValue) })),
          entries: m.entries.map((e) => ({ period: e.period, actualValue: num(e.actualValue) })),
        },
        period,
      ),
    ),
  }));

  // --- Revenue -------------------------------------------------------------
  const [revEntries, revTargets] = await Promise.all([
    prisma.revenueEntry.findMany({
      where: { period },
      include: { funder: { select: { name: true } } },
    }),
    prisma.revenueTarget.findMany({ include: { funder: { select: { name: true } } } }),
  ]);

  // Distinct funder/category pairs present in either entries or targets.
  const pairKey = (funderId: string | null, category: string) => `${funderId ?? "GEN"}:${category}`;
  const pairs = new Map<string, { funderId: string | null; category: RevenueRow["category"]; funderName: string }>();
  for (const e of revEntries) {
    pairs.set(pairKey(e.funderId, e.category), {
      funderId: e.funderId,
      category: e.category,
      funderName: e.funder?.name ?? "General donations",
    });
  }
  for (const t of revTargets) {
    const k = pairKey(t.funderId, t.category);
    if (!pairs.has(k)) {
      pairs.set(k, {
        funderId: t.funderId,
        category: t.category,
        funderName: t.funder?.name ?? "General donations",
      });
    }
  }

  const resolvedTargets: { targetAmount: number }[] = [];
  const revenueRows: RevenueRow[] = [...pairs.values()].map((pair) => {
    const entry = revEntries.find(
      (e) => e.funderId === pair.funderId && e.category === pair.category,
    );
    const actual = entry ? num(entry.actualAmount) : null;

    // Applicable target for this pair: filter to the category, branch on funder.
    const candidateTargets = revTargets
      .filter((t) => t.category === pair.category)
      .map((t) => ({ effectiveFrom: t.effectiveFrom, funderId: t.funderId, targetAmount: num(t.targetAmount) }));
    const target = lookupTarget(candidateTargets, period, pair.funderId);
    const targetValue = target ? target.targetAmount : null;
    if (targetValue !== null) resolvedTargets.push({ targetAmount: targetValue });

    return {
      key: pairKey(pair.funderId, pair.category),
      funderName: pair.funderName,
      category: pair.category,
      actual,
      target: targetValue,
      status: actual !== null && targetValue !== null ? revenueStatus(actual, targetValue) : null,
      warning: targetValue === null ? "no-target" : null,
    };
  });

  const orgStatus =
    resolvedTargets.length > 0
      ? orgRevenueStatus(
          revEntries.map((e) => ({ actualAmount: num(e.actualAmount) })),
          resolvedTargets,
        )
      : null;

  // --- Funder deadlines ----------------------------------------------------
  const funders = await prisma.funder.findMany({ where: { status: "active" } });
  const deadlines: DeadlineRow[] = funders
    .map((f) => {
      const dates = [f.renewalDate, f.reportDueDate].filter((d): d is Date => d !== null);
      if (dates.length === 0) return { id: f.id, name: f.name, date: null, flag: null };
      const soonest = dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
      return { id: f.id, name: f.name, date: iso(soonest), flag: deadlineWindow(soonest, new Date()) };
    })
    // Sort by proximity (nulls last).
    .sort((a, b) => {
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return a.date.localeCompare(b.date);
    });

  return {
    programs: programOutcomes,
    revenue: { rows: revenueRows, orgStatus, hasData: revEntries.length > 0 },
    deadlines,
  };
}
