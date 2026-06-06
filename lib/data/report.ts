import { prisma } from "@/lib/prisma";
import { ORG_NAME } from "@/lib/org";
import { fiscalYearStart } from "@/lib/domain/periods";
import { lookupTarget } from "@/lib/domain/targets";
import { orgRevenueStatus, revenueStatus, type RevenueStatus } from "@/lib/domain/revenue";
import { deadlineWindow, type DeadlineFlag } from "@/lib/domain/deadlines";
import { buildMetricOutcome, type MetricOutcome } from "@/lib/data/outcomes";

// Report view models (PRD "Report Template Specs"). Reuses the shared metric
// outcome builder and the domain functions so reports and the dashboard agree.

const num = (d: { toString(): string }) => Number(d.toString());
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type ProgramOutcomeBlock = { id: string; name: string; metrics: MetricOutcome[] };
export type CategorySummary = {
  category: "grant" | "donation" | "other";
  actual: number | null;
  target: number | null;
  status: RevenueStatus | null;
};
export type DeadlineLine = { name: string; date: string | null; flag: DeadlineFlag };

export type BoardReport = {
  orgName: string;
  periodLabel: string;
  generatedAt: string;
  edNotes: string | null;
  programs: ProgramOutcomeBlock[];
  fundraising: { byCategory: CategorySummary[]; orgStatus: RevenueStatus | null };
  deadlines: DeadlineLine[];
};

export type FunderReport = {
  orgName: string;
  funderName: string;
  periodLabel: string;
  generatedAt: string;
  edNotes: string | null;
  programs: ProgramOutcomeBlock[];
  funding: CategorySummary[];
  nextDeadline: { renewal: string | null; reportDue: string | null };
};

const periodLabel = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

const CATEGORIES = ["grant", "donation", "other"] as const;

async function programBlocks(period: Date, programWhere: object): Promise<ProgramOutcomeBlock[]> {
  const fyStart = fiscalYearStart(period);
  const programs = await prisma.program.findMany({
    where: programWhere,
    orderBy: { name: "asc" },
    include: {
      metrics: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          targets: true,
          entries: { where: { period: { gte: fyStart, lte: period } } },
        },
      },
    },
  });
  return programs.map((p) => ({
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
}

/** Resolve actual + applicable target per category for a funder scope. */
function summariseByCategory(
  period: Date,
  entries: { category: string; actualAmount: number; funderId: string | null }[],
  targets: { category: string; effectiveFrom: Date; funderId: string | null; targetAmount: number }[],
  funderId: string | null | "ALL",
): CategorySummary[] {
  return CATEGORIES.map((category) => {
    const matchEntries = entries.filter(
      (e) => e.category === category && (funderId === "ALL" || e.funderId === funderId),
    );
    const actual = matchEntries.length > 0
      ? matchEntries.reduce((s, e) => s + e.actualAmount, 0)
      : null;

    let target: number | null;
    if (funderId === "ALL") {
      // Board: sum the applicable target across every funder/category pair.
      const pairFunders = new Set(
        targets.filter((t) => t.category === category).map((t) => t.funderId),
      );
      let sum = 0;
      let found = false;
      for (const fId of pairFunders) {
        const applicable = lookupTarget(
          targets.filter((t) => t.category === category),
          period,
          fId,
        );
        if (applicable) {
          sum += applicable.targetAmount;
          found = true;
        }
      }
      target = found ? sum : null;
    } else {
      const applicable = lookupTarget(
        targets.filter((t) => t.category === category),
        period,
        funderId,
      );
      target = applicable ? applicable.targetAmount : null;
    }

    return {
      category,
      actual,
      target,
      status: actual !== null && target !== null ? revenueStatus(actual, target) : null,
    };
  });
}

export async function getBoardReport(period: Date, edNotes: string | null): Promise<BoardReport> {
  const [entriesRaw, targetsRaw, funders] = await Promise.all([
    prisma.revenueEntry.findMany({ where: { period } }),
    prisma.revenueTarget.findMany(),
    prisma.funder.findMany({ where: { status: "active" } }),
  ]);
  const entries = entriesRaw.map((e) => ({ category: e.category, actualAmount: num(e.actualAmount), funderId: e.funderId }));
  const targets = targetsRaw.map((t) => ({ category: t.category, effectiveFrom: t.effectiveFrom, funderId: t.funderId, targetAmount: num(t.targetAmount) }));

  const byCategory = summariseByCategory(period, entries, targets, "ALL");

  // Org status: all period actuals vs all applicable targets (ADR-006).
  const resolvedTargets = byCategory
    .filter((c) => c.target !== null)
    .map((c) => ({ targetAmount: c.target as number }));
  const orgStatus = resolvedTargets.length > 0
    ? orgRevenueStatus(entries.map((e) => ({ actualAmount: e.actualAmount })), resolvedTargets)
    : null;

  const deadlines: DeadlineLine[] = funders
    .map((f) => {
      const dates = [f.renewalDate, f.reportDueDate].filter((d): d is Date => d !== null);
      if (dates.length === 0) return { name: f.name, date: null, flag: null };
      const soonest = dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
      return { name: f.name, date: iso(soonest), flag: deadlineWindow(soonest, new Date()) };
    })
    .sort((a, b) => (a.date === null ? 1 : b.date === null ? -1 : a.date.localeCompare(b.date)));

  return {
    orgName: ORG_NAME,
    periodLabel: periodLabel(period),
    generatedAt: iso(new Date()),
    edNotes,
    programs: await programBlocks(period, { isActive: true }),
    fundraising: { byCategory, orgStatus },
    deadlines,
  };
}

export async function getFunderReport(
  period: Date,
  funderId: string,
  edNotes: string | null,
): Promise<FunderReport | { error: "not_found" } | { error: "no_programs" }> {
  const funder = await prisma.funder.findUnique({
    where: { id: funderId },
    include: { funderPrograms: { select: { programId: true } } },
  });
  if (!funder) return { error: "not_found" };
  const linkedProgramIds = funder.funderPrograms.map((fp) => fp.programId);
  if (linkedProgramIds.length === 0) return { error: "no_programs" };

  const [entriesRaw, targetsRaw] = await Promise.all([
    prisma.revenueEntry.findMany({ where: { period, funderId } }),
    prisma.revenueTarget.findMany({ where: { funderId } }),
  ]);
  const entries = entriesRaw.map((e) => ({ category: e.category, actualAmount: num(e.actualAmount), funderId: e.funderId }));
  const targets = targetsRaw.map((t) => ({ category: t.category, effectiveFrom: t.effectiveFrom, funderId: t.funderId, targetAmount: num(t.targetAmount) }));

  return {
    orgName: ORG_NAME,
    funderName: funder.name,
    periodLabel: periodLabel(period),
    generatedAt: iso(new Date()),
    edNotes,
    programs: await programBlocks(period, { id: { in: linkedProgramIds }, isActive: true }),
    funding: summariseByCategory(period, entries, targets, funderId),
    nextDeadline: {
      renewal: funder.renewalDate ? iso(funder.renewalDate) : null,
      reportDue: funder.reportDueDate ? iso(funder.reportDueDate) : null,
    },
  };
}
