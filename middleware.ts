import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  canAccess,
  landingPathForRole,
  programIdFromEntryPath,
  type AppRole,
} from "@/lib/roles";

// Single authorization enforcement point (ADD §7.2, ADR-007). Runs before every
// page load and API call. No role logic is duplicated in page components.

function logUnauthorized(route: string, userId: string | null) {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: "unauthorized_route",
      userId,
      route,
    }),
  );
}

function unauthorizedApi(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "Not authenticated" : "Forbidden" },
    { status },
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NextAuth's own endpoints must stay reachable for the login flow.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const role = token?.role as AppRole | undefined;
  const programId = (token?.programId as string | null | undefined) ?? null;

  const isApi = pathname.startsWith("/api");
  const isLogin = pathname === "/login";
  const isRoot = pathname === "/";

  // --- Unauthenticated ---------------------------------------------------
  if (!token) {
    if (isLogin) return NextResponse.next();
    if (isApi) return unauthorizedApi(401);
    logUnauthorized(pathname, null);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // --- Authenticated hitting /login or / → role landing ------------------
  if (isLogin || isRoot) {
    return NextResponse.redirect(
      new URL(landingPathForRole(role, programId), req.url),
    );
  }

  // --- Staff: confined to their own program entry route ------------------
  if (role === "staff") {
    const own = landingPathForRole("staff", programId);
    const requestedProgram = programIdFromEntryPath(pathname);
    const onEntryRoute = requestedProgram !== null;

    if (!onEntryRoute) {
      // Any other route → bounce to their own entry form.
      if (isApi) return unauthorizedApi(403);
      return NextResponse.redirect(new URL(own, req.url));
    }
    if (requestedProgram !== programId) {
      // Another program's entry → redirect to their own (horizontal escalation).
      logUnauthorized(pathname, token.id as string);
      if (isApi) return unauthorizedApi(403);
      return NextResponse.redirect(new URL(own, req.url));
    }
    return NextResponse.next();
  }

  // --- All other roles: role-to-route table ------------------------------
  if (!role || !canAccess(pathname, role)) {
    logUnauthorized(pathname, (token.id as string) ?? null);
    if (isApi) return unauthorizedApi(403);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static files. This deliberately
  // includes /api so every write passes through here (ADR-007).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
