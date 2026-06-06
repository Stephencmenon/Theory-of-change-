import { requireRole } from "@/lib/session";
import { getDashboardData, type MetricOutcome } from "@/lib/data/dashboard";
import { toPeriodDate, periodFromString } from "@/lib/domain/periods";
import { money, flagClass, flagLabel } from "@/lib/format";
import type { RevenueStatus } from "@/lib/domain/revenue";
import AppHeader from "@/components/AppHeader";
import PeriodSelector from "@/components/ed/PeriodSelector";

const monthLabel = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function statusClass(s: RevenueStatus | null): string {
  if (s === "on-track") return "text-flag-green";
  if (s === "at-risk") return "text-flag-amber";
  if (s === "off-track") return "text-flag-red";
  return "text-gray-400";
}

// How a single metric outcome renders (PRD §11 display rules).
function MetricCell({ m }: { m: MetricOutcome }) {
  if (m.warning === "no-data") {
    return <span className="text-gray-400">No data entered</span>;
  }
  if (m.warning === "no-target") {
    return (
      <span className="text-flag-amber" title="No applicable target — cannot evaluate status">
        {m.actual} {m.unit} · ⚠ no target set
      </span>
    );
  }
  return (
    <span className={m.offTrack ? "font-medium text-flag-red" : "text-gray-900"}>
      {m.actual} / {m.target} {m.unit}
      {m.targetPeriod === "annual" && <span className="text-gray-400"> (YTD)</span>}
      {m.offTrack && " · off-track"}
    </span>
  );
}

// Screen 2 — /dashboard. ED only. Read-only consolidation.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  await requireRole(["ed"]);

  const now = new Date();
  const period =
    searchParams.period && /^\d{4}-\d{2}$/.test(searchParams.period)
      ? periodFromString(searchParams.period)
      : toPeriodDate(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const periodYm = period.toISOString().slice(0, 7);

  const data = await getDashboardData(period);

  return (
    <div className="min-h-screen">
      <AppHeader active="/dashboard" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Dashboard — {monthLabel(period)}
          </h1>
          <PeriodSelector period={periodYm} />
        </div>

        {/* Program outcomes */}
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-medium text-gray-900">Program outcomes</h2>
          {data.programs.length === 0 && (
            <p className="text-sm text-gray-400">No active programs.</p>
          )}
          {data.programs.map((p) => (
            <div key={p.id} className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">{p.name}</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2">Metric</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Actual vs target</th>
                  </tr>
                </thead>
                <tbody>
                  {p.metrics.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{m.name}</td>
                      <td className="py-2 text-gray-500">{m.targetPeriod}</td>
                      <td className="py-2"><MetricCell m={m} /></td>
                    </tr>
                  ))}
                  {p.metrics.length === 0 && (
                    <tr><td colSpan={3} className="py-2 text-gray-400">No active metrics.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        {/* Fundraising revenue */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="text-lg font-medium text-gray-900">Fundraising revenue</h2>
            {data.revenue.orgStatus ? (
              <span className={`text-sm font-medium ${statusClass(data.revenue.orgStatus)}`}>
                Org-wide: {data.revenue.orgStatus}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Org-wide: no applicable targets</span>
            )}
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">Funder</th>
                <th className="py-2">Category</th>
                <th className="py-2">Actual</th>
                <th className="py-2">Target</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.revenue.rows.map((r) => (
                <tr key={r.key} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{r.funderName}</td>
                  <td className="py-2 text-gray-600">{r.category}</td>
                  <td className="py-2 text-gray-600">
                    {r.actual === null ? <span className="text-gray-400">No data entered</span> : money(r.actual)}
                  </td>
                  <td className="py-2 text-gray-600">
                    {r.target === null ? <span className="text-flag-amber">⚠ no target</span> : money(r.target)}
                  </td>
                  <td className={`py-2 font-medium ${statusClass(r.status)}`}>
                    {r.status ?? "—"}
                  </td>
                </tr>
              ))}
              {data.revenue.rows.length === 0 && (
                <tr><td colSpan={5} className="py-2 text-gray-400">No revenue data for this period.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Funder deadlines */}
        <section>
          <h2 className="mb-3 text-lg font-medium text-gray-900">Funder deadlines</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">Funder</th>
                <th className="py-2">Next deadline</th>
                <th className="py-2">Window</th>
              </tr>
            </thead>
            <tbody>
              {data.deadlines.map((d) => (
                <tr key={d.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-900">{d.name}</td>
                  <td className="py-2 text-gray-600">{d.date ?? "—"}</td>
                  <td className={`py-2 font-medium ${flagClass(d.flag)}`}>{flagLabel(d.flag)}</td>
                </tr>
              ))}
              {data.deadlines.length === 0 && (
                <tr><td colSpan={3} className="py-2 text-gray-400">No active funders.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
