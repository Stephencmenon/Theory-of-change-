import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { targetCreateSchema } from "@/lib/validation";
import { periodFromString } from "@/lib/domain/periods";

// POST /api/admin/targets — insert a NEW metric_targets row (never overwrite,
// ADD §8.3 / ADR-004). Backdating to a period that already has entries is blocked
// (ADD §12.5) so historical reports stay accurate.
export async function POST(req: Request) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, targetCreateSchema);
  if (body instanceof NextResponse) return body;

  const metric = await prisma.metric.findUnique({ where: { id: body.metricId } });
  if (!metric) return businessError("Metric not found", 422);

  const effectiveFrom = periodFromString(body.effectiveFrom);

  // Block backdating: an entry already exists for a period this target would
  // retroactively cover (period >= effective_from).
  const conflicting = await prisma.metricEntry.count({
    where: { metricId: body.metricId, period: { gte: effectiveFrom } },
  });
  if (conflicting > 0) {
    return businessError(
      "Cannot backdate a target to a period that already has entries.",
      422,
      "Choose an effective date after the latest entered period.",
    );
  }

  const target = await prisma.metricTarget.create({
    data: {
      metricId: body.metricId,
      targetValue: body.targetValue,
      effectiveFrom,
      setBy: auth.user.id,
    },
  });
  return NextResponse.json({ target }, { status: 201 });
}
