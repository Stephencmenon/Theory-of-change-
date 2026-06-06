// Impact Dashboard — development seed (deterministic).
// Run after `prisma migrate reset --force`, or via `npm run seed`.
//
// Placeholder Theory of Change metrics until OQ-1/OQ-2 land the real ones.
// All users share the password below (dev only).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "Passw0rd!";

// First-of-month UTC helper (mirrors lib/domain/periods toPeriodDate).
const period = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1));

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --- Program -------------------------------------------------------------
  const program = await prisma.program.create({
    data: {
      name: "Employment Support",
      description: "Job-readiness and placement program.",
      isActive: true,
    },
  });

  // --- Users ---------------------------------------------------------------
  const admin = await prisma.user.create({
    data: { email: "admin@example.org", passwordHash, role: "admin" },
  });
  await prisma.user.create({
    data: { email: "ed@example.org", passwordHash, role: "ed" },
  });
  await prisma.user.create({
    data: { email: "fundraising@example.org", passwordHash, role: "fundraising" },
  });
  const staff = await prisma.user.create({
    data: {
      email: "staff@example.org",
      passwordHash,
      role: "staff",
      programId: program.id,
    },
  });

  // --- Metrics (+ initial targets, effective Jan 2026) ---------------------
  const metricSpecs = [
    { name: "Clients served", unit: "people", targetPeriod: "monthly" as const, threshold: 0.8, target: 100 },
    { name: "Employment placements", unit: "people", targetPeriod: "monthly" as const, threshold: 0.75, target: 20 },
    { name: "Training hours delivered", unit: "hours", targetPeriod: "annual" as const, threshold: 0.8, target: 1200 },
  ];

  const metrics = [];
  for (const m of metricSpecs) {
    const metric = await prisma.metric.create({
      data: {
        programId: program.id,
        name: m.name,
        unit: m.unit,
        targetPeriod: m.targetPeriod,
        offTrackThreshold: m.threshold,
      },
    });
    await prisma.metricTarget.create({
      data: {
        metricId: metric.id,
        targetValue: m.target,
        effectiveFrom: period(2026, 1),
        setBy: admin.id,
      },
    });
    metrics.push(metric);
  }

  // --- Sample metric entries (Jan–Apr 2026) --------------------------------
  // "Clients served": present, mostly on-track; April dips off-track.
  const clients = metrics[0];
  const clientsByMonth = [95, 102, 88, 60]; // Jan..Apr; Apr (60 < 100×0.8) off-track
  for (let i = 0; i < clientsByMonth.length; i++) {
    await prisma.metricEntry.create({
      data: {
        metricId: clients.id,
        period: period(2026, i + 1),
        actualValue: clientsByMonth[i],
        enteredBy: staff.id,
      },
    });
  }
  // "Employment placements": partial — only Jan, Feb (March/April show "No data entered").
  const placements = metrics[1];
  for (let i = 0; i < 2; i++) {
    await prisma.metricEntry.create({
      data: {
        metricId: placements.id,
        period: period(2026, i + 1),
        actualValue: [18, 22][i],
        enteredBy: staff.id,
      },
    });
  }
  // "Training hours" (annual): a couple of months of entries → YTD sum.
  const training = metrics[2];
  for (let i = 0; i < 3; i++) {
    await prisma.metricEntry.create({
      data: {
        metricId: training.id,
        period: period(2026, i + 1),
        actualValue: [120, 140, 110][i],
        enteredBy: staff.id,
      },
    });
  }

  // --- Funder + link -------------------------------------------------------
  const funder = await prisma.funder.create({
    data: {
      name: "Maple Foundation",
      grantAmount: 50000,
      status: "active",
      renewalDate: period(2026, 9),
      reportDueDate: new Date(Date.UTC(2026, 6, 15)), // 2026-07-15
      notes: "Multi-year employment grant.",
    },
  });
  await prisma.funderProgram.create({
    data: { funderId: funder.id, programId: program.id },
  });

  // --- Revenue targets (versioned, effective Jan 2026) ---------------------
  // Funder-specific grant target.
  await prisma.revenueTarget.create({
    data: {
      funderId: funder.id,
      category: "grant",
      targetAmount: 50000,
      targetPeriod: "annual",
      effectiveFrom: period(2026, 1),
      setBy: admin.id,
    },
  });
  // General-donation target (funderId null) — exercises the binding constraint.
  await prisma.revenueTarget.create({
    data: {
      funderId: null,
      category: "donation",
      targetAmount: 2000,
      targetPeriod: "monthly",
      effectiveFrom: period(2026, 1),
      setBy: admin.id,
    },
  });

  // --- Revenue entries -----------------------------------------------------
  await prisma.revenueEntry.create({
    data: {
      funderId: funder.id,
      category: "grant",
      period: period(2026, 1),
      actualAmount: 25000,
      enteredBy: admin.id,
    },
  });
  await prisma.revenueEntry.create({
    data: {
      funderId: null,
      category: "donation",
      period: period(2026, 1),
      actualAmount: 1500,
      enteredBy: admin.id,
    },
  });

  console.log("Seed complete.");
  console.log("Users (password for all: %s):", PASSWORD);
  console.log("  admin@example.org (admin)");
  console.log("  ed@example.org (ed)");
  console.log("  fundraising@example.org (fundraising)");
  console.log("  staff@example.org (staff → Employment Support)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
