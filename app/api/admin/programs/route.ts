import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson } from "@/lib/api";
import { programCreateSchema } from "@/lib/validation";

// POST /api/admin/programs — create a program (admin only).
export async function POST(req: Request) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, programCreateSchema);
  if (body instanceof NextResponse) return body;

  const program = await prisma.program.create({
    data: {
      name: body.name,
      description: body.description || null,
      isActive: body.isActive,
    },
  });
  return NextResponse.json({ program }, { status: 201 });
}
