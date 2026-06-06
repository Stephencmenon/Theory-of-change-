import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProgramsSection from "@/components/admin/ProgramsSection";
import MetricsSection from "@/components/admin/MetricsSection";
import UsersSection from "@/components/admin/UsersSection";
import TargetsSection from "@/components/admin/TargetsSection";

const SECTIONS = ["programs", "metrics", "users", "targets"] as const;
type Section = (typeof SECTIONS)[number];

const ym = (d: Date) => d.toISOString().slice(0, 7); // YYYY-MM

// Screen 9 — /admin/[section]. Server Component: fetch + serialize Prisma data
// (Decimal/Date → plain JSON) and hand off to the client editor for the section.
export default async function AdminSectionPage({
  params,
}: {
  params: { section: string };
}) {
  if (!SECTIONS.includes(params.section as Section)) notFound();
  const section = params.section as Section;

  if (section === "programs") {
    const programs = await prisma.program.findMany({ orderBy: { name: "asc" } });
    return (
      <ProgramsSection
        programs={programs.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          isActive: p.isActive,
        }))}
      />
    );
  }

  if (section === "metrics") {
    const [programs, metrics] = await Promise.all([
      prisma.program.findMany({ orderBy: { name: "asc" } }),
      prisma.metric.findMany({
        orderBy: { name: "asc" },
        include: {
          program: { select: { name: true } },
          _count: { select: { entries: true } },
        },
      }),
    ]);
    return (
      <MetricsSection
        programs={programs.map((p) => ({ id: p.id, name: p.name }))}
        metrics={metrics.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
          targetPeriod: m.targetPeriod,
          offTrackThreshold: Number(m.offTrackThreshold),
          isActive: m.isActive,
          programName: m.program.name,
          entryCount: m._count.entries,
        }))}
      />
    );
  }

  if (section === "users") {
    const [users, programs] = await Promise.all([
      prisma.user.findMany({
        orderBy: { email: "asc" },
        include: { program: { select: { name: true } } },
      }),
      prisma.program.findMany({ orderBy: { name: "asc" } }),
    ]);
    return (
      <UsersSection
        programs={programs.map((p) => ({ id: p.id, name: p.name }))}
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          programId: u.programId,
          programName: u.program?.name ?? null,
        }))}
      />
    );
  }

  // targets
  const metrics = await prisma.metric.findMany({
    orderBy: { name: "asc" },
    include: {
      program: { select: { name: true } },
      targets: { orderBy: { effectiveFrom: "desc" } },
      entries: { orderBy: { period: "desc" }, take: 1 },
    },
  });
  return (
    <TargetsSection
      metrics={metrics.map((m) => ({
        id: m.id,
        name: m.name,
        programName: m.program.name,
        targets: m.targets.map((t) => ({
          id: t.id,
          targetValue: Number(t.targetValue),
          effectiveFrom: ym(t.effectiveFrom),
        })),
        latestEntryPeriod: m.entries[0] ? ym(m.entries[0].period) : null,
      }))}
    />
  );
}
