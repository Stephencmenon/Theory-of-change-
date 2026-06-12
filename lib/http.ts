// Client-side fetch helpers for mutation forms. Returns a discriminated result
// so forms can show inline field errors (400) and business messages (409/422).

export type MutationResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fields?: Record<string, string>; nextAction?: string };

async function send<T>(method: string, url: string, body?: unknown): Promise<MutationResult<T>> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (res.ok) return { ok: true, data: json as T };
  const err = (json ?? {}) as {
    error?: string;
    fields?: Record<string, string>;
    nextAction?: string;
  };
  return {
    ok: false,
    status: res.status,
    error: err.error ?? `Request failed (${res.status})`,
    fields: err.fields,
    nextAction: err.nextAction,
  };
}

export const postJson = <T = unknown>(url: string, body: unknown) => send<T>("POST", url, body);
export const patchJson = <T = unknown>(url: string, body: unknown) => send<T>("PATCH", url, body);
export const del = <T = unknown>(url: string) => send<T>("DELETE", url);
