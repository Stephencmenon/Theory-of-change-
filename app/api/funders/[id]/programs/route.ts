import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole, readJson, businessError } from "@/lib/api";
import { funderProgramLinkSchema } from "@/lib/validation";

// POST /api/funders/[id]/programs — link a program (funder_programs row).
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["ed", "fundraising"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, funderProgramLinkSchema);
  if (body instanceof NextResponse) return body;

  const [funder, program] = await Promise.all([
    prisma.funder.findUnique({ where: { id: params.id } }),
    prisma.program.findUnique({ where: { id: body.programId } }),
  ]);
  if (!funder) return businessError("Funder not found", 422);
  if (!program) return businessError("Program not found", 422);

  const link = await prisma.funderProgram.upsert({
    where: { funderId_programId: { funderId: params.id, programId: body.programId } },
    update: {},
    create: { funderId: params.id, programId: body.programId },
  });
  return NextResponse.json({ link }, { status: 201 });
}

// DELETE /api/funders/[id]/programs — unlink a program.
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiRole(["ed", "fundraising"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJson(req, funderProgramLinkSchema);
  if (body instanceof NextResponse) return body;

  await prisma.funderProgram.deleteMany({
    where: { funderId: params.id, programId: body.programId },
  });
  return NextResponse.json({ ok: true });
}
