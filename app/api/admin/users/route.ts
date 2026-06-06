import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { userCreateSchema } from "@/lib/validation";

// POST /api/admin/users — create a user. Password is bcrypt-hashed; plaintext is
// never stored. Staff must have exactly one program (enforced in schema refine).
export async function POST(req: Request) {
  const auth = await requireApiRole(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, userCreateSchema);
  if (body instanceof NextResponse) return body;

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return businessError("A user with that email already exists.", 409);
  }

  if (body.role === "staff" && body.programId) {
    const program = await prisma.program.findUnique({
      where: { id: body.programId },
    });
    if (!program) return businessError("Assigned program not found", 422);
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      role: body.role,
      programId: body.role === "staff" ? body.programId! : null,
    },
    select: { id: true, email: true, role: true, programId: true },
  });
  return NextResponse.json({ user }, { status: 201 });
}
