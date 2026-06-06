import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { AppRole } from "@/lib/roles";

// Server-side session helpers for Server Components and API route handlers.
// Middleware is the primary gate; these provide the authenticated identity and
// a defence-in-depth role assertion inside handlers.

export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Require a session whose role is in `roles`. Redirects to /login if absent or
 * mismatched (for pages). API routes should use `requireApiRole` instead.
 */
export async function requireRole(roles: AppRole[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.user.role)) {
    redirect("/login");
  }
  return session;
}
