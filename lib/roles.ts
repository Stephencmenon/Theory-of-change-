// Role + route authorization rules — pure, no DB, edge-safe (imported by
// middleware.ts). The authoritative role-to-route table lives in ADD §7.2.
//
// A local string-union type is used (not the Prisma `Role` enum) so this module
// can be imported into the edge middleware without bundling the Prisma client.

export type AppRole = "ed" | "fundraising" | "staff" | "admin";

interface RouteRule {
  /** Matches both the page route and its `/api` counterpart where relevant. */
  pattern: RegExp;
  roles: AppRole[];
}

// Order doesn't matter — the first matching rule decides. Staff program-entry
// routes are matched here for completeness, but middleware enforces the
// id-equals-session.programId rule separately before consulting this table.
const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/dashboard(\/|$)/, roles: ["ed", "admin"] },
  { pattern: /^\/report(\/|$)/, roles: ["ed", "fundraising"] },
  { pattern: /^\/funders(\/|$)/, roles: ["ed", "fundraising", "admin"] },
  { pattern: /^\/revenue(\/|$)/, roles: ["fundraising"] },
  { pattern: /^\/programs\/[^/]+\/entry(\/|$)/, roles: ["staff"] },
  { pattern: /^\/admin(\/|$)/, roles: ["admin"] },

  { pattern: /^\/api\/report\/pdf(\/|$)/, roles: ["ed", "fundraising"] },
  { pattern: /^\/api\/funders(\/|$)/, roles: ["ed", "fundraising", "admin"] },
  { pattern: /^\/api\/revenue(\/|$)/, roles: ["fundraising"] },
  { pattern: /^\/api\/programs\/[^/]+\/entry(\/|$)/, roles: ["staff"] },
  { pattern: /^\/api\/admin(\/|$)/, roles: ["admin"] },
];

/** Role-appropriate landing path after login (ADD §7.2). */
export function landingPathForRole(
  role: AppRole | undefined,
  programId: string | null | undefined,
): string {
  switch (role) {
    case "ed":
      return "/dashboard";
    case "fundraising":
      return "/funders";
    case "admin":
      return "/admin";
    case "staff":
      return programId ? `/programs/${programId}/entry` : "/login";
    default:
      return "/login";
  }
}

/**
 * Is `role` permitted on `pathname` per the role-to-route table?
 * - A matching rule → the role must be in its allow-list.
 * - An `/api/*` path with no matching rule → denied (no unauthenticated/unlisted
 *   API route in v1).
 * - A page path with no matching rule → allowed through (Next.js will 404).
 */
export function canAccess(pathname: string, role: AppRole): boolean {
  const rule = ROUTE_RULES.find((r) => r.pattern.test(pathname));
  if (rule) return rule.roles.includes(role);
  if (pathname.startsWith("/api")) return false;
  return true;
}

/** Extract the program id from a `/programs/[id]/entry` or its API path, else null. */
export function programIdFromEntryPath(pathname: string): string | null {
  const m = /^\/(?:api\/)?programs\/([^/]+)\/entry/.exec(pathname);
  return m ? m[1] : null;
}
