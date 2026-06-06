import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { revenueEntrySchema } from "@/lib/validation";
import { periodFromString } from "@/lib/domain/periods";

// POST /api/revenue/entries — enter a revenue actual (Head of Fundraising).
// "Enter actual" is one of the two distinct revenue operations (PRD Flow C).
// If a row already exists for (funder, category, period) the value is OVERWRITTEN
// and updated_by/updated_at are written, preserving entered_by/entered_at
// (ADD §8.3). funder_id may be null for general donations.
export async function POST(req: Request) {
  const auth = await requireApiRole(["fundraising"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, revenueEntrySchema);
  if (body instanceof NextResponse) return body;

  if (body.funderId) {
    const funder = await prisma.funder.findUnique({ where: { id: body.funderId } });
    if (!funder) return businessError("Funder not found", 422);
  }

  const period = periodFromString(body.period);

  // Manual find-then-write: composite uniqueness includes a nullable funder_id,
  // so we branch explicitly (IS NULL for general donations).
  const existing = await prisma.revenueEntry.findFirst({
    where: { funderId: body.funderId, category: body.category, period },
  });

  if (existing) {
    const updated = await prisma.revenueEntry.update({
      where: { id: existing.id },
      data: {
        actualAmount: body.actualAmount,
        updatedBy: auth.user.id,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ entry: updated, edited: true });
  }

  const created = await prisma.revenueEntry.create({
    data: {
      funderId: body.funderId,
      category: body.category,
      period,
      actualAmount: body.actualAmount,
      enteredBy: auth.user.id,
    },
  });
  return NextResponse.json({ entry: created, edited: false }, { status: 201 });
}
