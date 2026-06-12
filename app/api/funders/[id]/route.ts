import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { funderUpdateSchema } from "@/lib/validation";

const toDate = (s?: string | null) => (s ? new Date(`${s}T00:00:00.000Z`) : null);

// PATCH /api/funders/[id] — edit funder details (ED or Head of Fundraising).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["ed", "fundraising", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, funderUpdateSchema);
  if (body instanceof NextResponse) return body;

  const existing = await prisma.funder.findUnique({ where: { id: params.id } });
  if (!existing) return businessError("Funder not found", 422);

  const funder = await prisma.funder.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.grantAmount !== undefined ? { grantAmount: body.grantAmount } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.renewalDate !== undefined ? { renewalDate: toDate(body.renewalDate) } : {}),
      ...(body.reportDueDate !== undefined ? { reportDueDate: toDate(body.reportDueDate) } : {}),
      ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
    },
  });
  return NextResponse.json({ funder });
}
