import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { metricCreateSchema } from "@/lib/validation";
import { periodFromString } from "@/lib/domain/periods";

// POST /api/admin/metrics — create a metric AND its initial target atomically
// (ADD §5.4 / PRD Flow D). A metric is never saved without a target.
export async function POST(req: Request) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, metricCreateSchema);
  if (body instanceof NextResponse) return body;

  const program = await prisma.program.findUnique({
    where: { id: body.programId },
  });
  if (!program) return businessError("Program not found", 422);

  const effectiveFrom = periodFromString(body.effectiveFrom);

  // Interactive transaction: both rows commit, or neither does.
  const metric = await prisma.$transaction(async (tx) => {
    const created = await tx.metric.create({
      data: {
        programId: body.programId,
        name: body.name,
        unit: body.unit,
        targetPeriod: body.targetPeriod,
        offTrackThreshold: body.offTrackThreshold,
      },
    });
    await tx.metricTarget.create({
      data: {
        metricId: created.id,
        targetValue: body.initialTargetValue,
        effectiveFrom,
        setBy: auth.user.id,
      },
    });
    return created;
  });

  return NextResponse.json({ metric }, { status: 201 });
}
