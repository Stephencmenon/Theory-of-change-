import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AppRole } from "@/lib/roles";

// Shared helpers for API route handlers. Middleware is the primary auth gate;
// `requireApiRole` is defence-in-depth inside the handler (ADD §9.1).

export type AuthedSession = {
  user: { id: string; role: AppRole; programId: string | null };
};

/**
 * Assert an authenticated session whose role is allowed. Returns the session,
 * or a NextResponse (401/403) the caller should return directly.
 */
export async function requireApiRole(
  roles: AppRole[],
): Promise<AuthedSession | NextResponse> {
  const session = (await getServerSession(authOptions)) as AuthedSession | null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!roles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/** Field-level validation errors keyed by field name (for inline display). */
export type FieldErrors = Record<string, string>;

function flattenZod(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Parse + validate a JSON request body against a zod schema. Returns the parsed
 * data, or a 400 NextResponse with `{ error, fields }` for inline display.
 */
export async function readJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S> | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: flattenZod(parsed.error) },
      { status: 400 },
    );
  }
  return parsed.data;
}

/** Business-rule violation: a message + the corrective next action (ADD §7.3). */
export function businessError(
  message: string,
  status: 409 | 422 = 422,
  nextAction?: string,
) {
  return NextResponse.json(
    { error: message, ...(nextAction ? { nextAction } : {}) },
    { status },
  );
}
