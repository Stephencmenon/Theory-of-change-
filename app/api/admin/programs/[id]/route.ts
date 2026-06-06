import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { programUpdateSchema } from "@/lib/validation";

// PATCH /api/admin/programs/[id] — edit a program. Renaming preserves historical
// entries (they reference program_id, never the name).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, programUpdateSchema);
  if (body instanceof NextResponse) return body;

  const existing = await prisma.program.findUnique({ where: { id: params.id } });
  if (!existing) return businessError("Program not found", 422);

  const program = await prisma.program.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined
        ? { description: body.description || null }
        : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  return NextResponse.json({ program });
}
