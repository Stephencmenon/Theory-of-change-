import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, businessError, type FieldErrors } from "@/lib/api";
import { toPeriodDate } from "@/lib/domain/periods";

// POST /api/programs/[id]/entry — staff submit metric values for the CURRENT
// period (PRD Flow E). The period is computed server-side (staff only enter the
// current month); entries are immutable once written (ADD §8.3).
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["staff"]);
  if (auth instanceof NextResponse) return auth;

  // Defence-in-depth: a staff user may only write to their own program.
  if (auth.user.programId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const submitted: { metricId: string; actualValue: unknown }[] = Array.isArray(
    raw?.entries,
  )
    ? raw.entries
    : [];

  // Current period, first-of-month midnight UTC.
  const now = new Date();
  const period = toPeriodDate(now.getUTCFullYear(), now.getUTCMonth() + 1);

  const metrics = await prisma.metric.findMany({
    where: { programId: params.id, isActive: true },
    select: { id: true },
  });
  const validIds = new Set(metrics.map((m) => m.id));

  // Already submitted this period → read-only (no edits).
  const existing = await prisma.metricEntry.count({
    where: { metricId: { in: [...validIds] }, period },
  });
  if (existing > 0) {
    return businessError(
      "Values for this period have already been submitted.",
      409,
      "Contact an admin to make a correction.",
    );
  }

  // Per-metric field validation: every active metric requires a finite number.
  const fields: FieldErrors = {};
  const byId = new Map<string, number>();
  for (const m of metrics) {
    const row = submitted.find((s) => s.metricId === m.id);
    const v = row?.actualValue;
    if (v === undefined || v === null || v === "") {
      fields[m.id] = "Required";
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) {
      fields[m.id] = "Must be a number";
    } else if (n < 0) {
      fields[m.id] = "Must be ≥ 0";
    } else {
      byId.set(m.id, n);
    }
  }
  // Reject unknown metric ids outright.
  for (const s of submitted) {
    if (!validIds.has(s.metricId)) {
      return businessError("Unknown metric for this program", 422);
    }
  }
  if (Object.keys(fields).length > 0) {
    return NextResponse.json(
      { error: "Validation failed", fields },
      { status: 400 },
    );
  }

  await prisma.metricEntry.createMany({
    data: [...byId.entries()].map(([metricId, actualValue]) => ({
      metricId,
      period,
      actualValue,
      enteredBy: auth.user.id,
    })),
  });

  return NextResponse.json({ ok: true, period: period.toISOString() }, { status: 201 });
}
