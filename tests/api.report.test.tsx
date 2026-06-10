import { describe, it, expect, vi, beforeEach } from "vitest";

// ACE-27 — API integration tests for the PDF report route: role enforcement
// (401/403), server-side validation (400), and the 422 no-linked-programs case.
// next-auth and the data layer are mocked so we exercise the handler's control
// flow without a DB or a real session.
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/data/report", () => ({
  getBoardReport: vi.fn(),
  getFunderReport: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getFunderReport } from "@/lib/data/report";
import { POST } from "@/app/api/report/pdf/route";

const session = getServerSession as unknown as ReturnType<typeof vi.fn>;
const funderReport = getFunderReport as unknown as ReturnType<typeof vi.fn>;

const authed = (role: string) => ({ user: { id: "u1", role, programId: null } });

function post(body: unknown) {
  return new Request("http://localhost/api/report/pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/report/pdf — auth & validation (ACE-27)", () => {
  it("401 when unauthenticated", async () => {
    session.mockResolvedValue(null);
    const res = await POST(post({ reportType: "board", period: "2026-03" }));
    expect(res.status).toBe(401);
  });

  it("403 when the role is not ed or fundraising", async () => {
    session.mockResolvedValue(authed("staff"));
    const res = await POST(post({ reportType: "board", period: "2026-03" }));
    expect(res.status).toBe(403);
  });

  it("400 with field errors on an invalid body", async () => {
    session.mockResolvedValue(authed("ed"));
    const res = await POST(post({ reportType: "board" })); // missing period
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(json.fields).toHaveProperty("period");
  });

  it("400 when a funder report omits the funder id", async () => {
    session.mockResolvedValue(authed("ed"));
    const res = await POST(post({ reportType: "funder", period: "2026-03" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fields).toHaveProperty("funderId");
  });

  it("422 with a corrective next action when the funder has no linked programs", async () => {
    session.mockResolvedValue(authed("ed"));
    funderReport.mockResolvedValue({ error: "no_programs" });
    const res = await POST(
      post({ reportType: "funder", period: "2026-03", funderId: "f1" }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/no linked programs/i);
    expect(json.nextAction).toMatch(/link at least one program/i);
  });

  it("422 when the funder does not exist", async () => {
    session.mockResolvedValue(authed("fundraising"));
    funderReport.mockResolvedValue({ error: "not_found" });
    const res = await POST(
      post({ reportType: "funder", period: "2026-03", funderId: "missing" }),
    );
    expect(res.status).toBe(422);
  });
});
