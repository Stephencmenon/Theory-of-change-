// Minimal structured logging (ADD §11). Logs auth failures, unauthorized route
// attempts, and PDF export errors. Each line carries timestamp, event, user id
// (never email), and route. Never logs passwords or session tokens.

type SecurityEvent =
  | "auth_failure"
  | "unauthorized_route"
  | "pdf_export_error";

interface LogFields {
  event: SecurityEvent;
  route: string;
  userId?: string | null;
  detail?: string;
}

export function logSecurityEvent({ event, route, userId, detail }: LogFields): void {
  const line = {
    ts: new Date().toISOString(),
    event,
    userId: userId ?? null,
    route,
    ...(detail ? { detail } : {}),
  };
  // Railway captures stdout/stderr automatically (ADD §11).
  console.warn(JSON.stringify(line));
}
