import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { userRoleChangeSchema } from "@/lib/validation";

// PATCH /api/admin/users/[id] — change a user's role. Requires explicit
// confirmation (`confirm: true`, enforced by the schema). PRD Flow D.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, userRoleChangeSchema);
  if (body instanceof NextResponse) return body;

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return businessError("User not found", 422);

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      role: body.role,
      programId: body.role === "staff" ? body.programId ?? null : null,
    },
    select: { id: true, email: true, role: true, programId: true },
  });
  return NextResponse.json({ user });
}
