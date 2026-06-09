import { describe, it, expect, vi, beforeEach } from "vitest";

// ACE-27 — transaction + role test for metric creation. A metric and its initial
// target must commit together or not at all (ADD §5.4 / PRD Flow D): if the
// target insert fails, no orphan metric is left behind. next-auth and prisma are
// mocked; the $transaction mock models real semantics — it only "commits" the
// returned value if the interactive callback resolves.
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/admin/metrics/route";

const session = getServerSession as unknown as ReturnType<typeof vi.fn>;
const programFindUnique = prisma.program.findUnique as unknown as ReturnType<typeof vi.fn>;
const $transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

const validBody = {
  programId: "p1",
  name: "Youth completing program",
  unit: "count",
  targetPeriod: "monthly",
  offTrackThreshold: 0.8,
  initialTargetValue: 50,
  effectiveFrom: "2026-01",
};

function post(body: unknown) {
  return new Request("http://localhost/api/admin/metrics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/metrics — transaction & role (ACE-27)", () => {
  it("403 when the role is not admin", async () => {
    session.mockResolvedValue({ user: { id: "u1", role: "ed", programId: null } });
    const res = await POST(post(validBody));
    expect(res.status).toBe(403);
  });

  it("rolls back fully when the initial-target insert fails (no orphan metric)", async () => {
    session.mockResolvedValue({ user: { id: "admin1", role: "admin", programId: null } });
    programFindUnique.mockResolvedValue({ id: "p1" });

    const tx = {
      metric: { create: vi.fn().mockResolvedValue({ id: "m1" }) },
      metricTarget: { create: vi.fn().mockRejectedValue(new Error("target insert failed")) },
    };

    // Models a real interactive transaction: the result is only committed if the
    // whole callback resolves; a throw leaves `committed` untouched (rollback).
    let committed: unknown = null;
    $transaction.mockImplementation(async (cb: (t: typeof tx) => Promise<unknown>) => {
      const result = await cb(tx);
      committed = result;
      return result;
    });

    await expect(POST(post(validBody))).rejects.toThrow("target insert failed");

    expect(tx.metric.create).toHaveBeenCalledTimes(1);
    expect(tx.metricTarget.create).toHaveBeenCalledTimes(1);
    // Both writes were attempted inside one $transaction; the failure aborted it,
    // so nothing was committed → no orphan metric row.
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(committed).toBeNull();
  });

  it("201 and returns the metric when both rows commit", async () => {
    session.mockResolvedValue({ user: { id: "admin1", role: "admin", programId: null } });
    programFindUnique.mockResolvedValue({ id: "p1" });

    const tx = {
      metric: { create: vi.fn().mockResolvedValue({ id: "m1", name: validBody.name }) },
      metricTarget: { create: vi.fn().mockResolvedValue({ id: "t1" }) },
    };
    $transaction.mockImplementation((cb: (t: typeof tx) => Promise<unknown>) => cb(tx));

    const res = await POST(post(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.metric.id).toBe("m1");
    expect(tx.metric.create).toHaveBeenCalledTimes(1);
    expect(tx.metricTarget.create).toHaveBeenCalledTimes(1);
  });
});
