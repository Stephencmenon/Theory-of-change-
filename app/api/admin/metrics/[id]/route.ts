import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { metricUpdateSchema } from "@/lib/validation";

// PATCH /api/admin/metrics/[id] — edit metric attributes / deactivate.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, metricUpdateSchema);
  if (body instanceof NextResponse) return body;

  const existing = await prisma.metric.findUnique({ where: { id: params.id } });
  if (!existing) return businessError("Metric not found", 422);

  const metric = await prisma.metric.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.unit !== undefined ? { unit: body.unit } : {}),
      ...(body.offTrackThreshold !== undefined
        ? { offTrackThreshold: body.offTrackThreshold }
        : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return NextResponse.json({ metric });
}

// DELETE /api/admin/metrics/[id] — blocked if the metric has entries (PRD Flow D);
// admin must deactivate instead. With no entries, the metric and its (unused)
// targets are removed transactionally.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const entryCount = await prisma.metricEntry.count({
    where: { metricId: params.id },
  });
  if (entryCount > 0) {
    return businessError(
      "This metric has data entries and cannot be deleted.",
      409,
      "Deactivate the metric instead.",
    );
  }

  await prisma.$transaction([
    prisma.metricTarget.deleteMany({ where: { metricId: params.id } }),
    prisma.metric.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
