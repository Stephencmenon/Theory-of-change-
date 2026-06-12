import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { userPasswordResetSchema } from "@/lib/validation";
import { logSecurityEvent } from "@/lib/logger";

// PATCH /api/admin/users/[id]/password — admin resets a user's password.
// Password is bcrypt-hashed; plaintext is never stored or logged. Privileged
// action → recorded via logSecurityEvent (target id only, never the password).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, userPasswordResetSchema);
  if (body instanceof NextResponse) return body;

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return businessError("User not found", 422);

  const passwordHash = await bcrypt.hash(body.password, 10);
  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash },
  });

  logSecurityEvent({
    event: "password_reset",
    route: "/api/admin/users/[id]/password",
    userId: auth.user.id,
    detail: `target=${existing.id}`,
  });
  return NextResponse.json({ ok: true });
}
