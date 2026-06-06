import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Screen 8 — /admin overview. Four sub-sections with live counts (PRD Flow D).
export default async function AdminOverviewPage() {
  const [programs, metrics, users] = await Promise.all([
    prisma.program.count(),
    prisma.metric.count(),
    prisma.user.count(),
  ]);

  const cards = [
    { slug: "programs", label: "Programs", count: programs, blurb: "Create and edit programs." },
    { slug: "metrics", label: "Metrics", count: metrics, blurb: "Add metrics with initial targets and thresholds." },
    { slug: "users", label: "Users", count: users, blurb: "Create users and assign roles." },
    { slug: "targets", label: "Targets", count: null, blurb: "Set new versioned metric targets." },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Configuration</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.slug}
            href={`/admin/${c.slug}`}
            className="rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-400"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-medium text-gray-900">{c.label}</h2>
              {c.count !== null && (
                <span className="text-sm text-gray-400">{c.count}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{c.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
