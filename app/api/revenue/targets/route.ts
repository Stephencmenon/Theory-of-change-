import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { revenueTargetSchema } from "@/lib/validation";
import { periodFromString } from "@/lib/domain/periods";

// POST /api/revenue/targets — set a revenue target (Head of Fundraising). The
// second distinct revenue operation (PRD Flow C): always INSERTS a new versioned
// row; never overwrites a previous target (ADD §8.3 / ADR-004). funder_id may be
// null for general-donation targets.
export async function POST(req: Request) {
  const auth = await requireApiRole(["fundraising"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, revenueTargetSchema);
  if (body instanceof NextResponse) return body;

  if (body.funderId) {
    const funder = await prisma.funder.findUnique({ where: { id: body.funderId } });
    if (!funder) return businessError("Funder not found", 422);
  }

  const target = await prisma.revenueTarget.create({
    data: {
      funderId: body.funderId,
      category: body.category,
      targetAmount: body.targetAmount,
      targetPeriod: body.targetPeriod,
      effectiveFrom: periodFromString(body.effectiveFrom),
      setBy: auth.user.id,
    },
  });
  return NextResponse.json({ target }, { status: 201 });
}
