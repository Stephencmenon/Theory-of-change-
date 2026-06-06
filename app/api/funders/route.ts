import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson } from "@/lib/api";
import { funderCreateSchema } from "@/lib/validation";

const toDate = (s?: string | null) => (s ? new Date(`${s}T00:00:00.000Z`) : null);

// POST /api/funders — create a funder (ED or Head of Fundraising).
export async function POST(req: Request) {
  const auth = await requireApiRole(["ed", "fundraising"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, funderCreateSchema);
  if (body instanceof NextResponse) return body;

  const funder = await prisma.funder.create({
    data: {
      name: body.name,
      grantAmount: body.grantAmount,
      status: body.status,
      renewalDate: toDate(body.renewalDate),
      reportDueDate: toDate(body.reportDueDate),
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ funder }, { status: 201 });
}
