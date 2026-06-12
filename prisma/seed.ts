// Impact Dashboard — development seed (deterministic).
// Run after `prisma migrate reset --force`, or via `npm run seed`.
//
// Placeholder Theory of Change metrics until OQ-1/OQ-2 land the real ones.
// Data is anchored to the current month so the dashboard is populated on a
// fresh seed regardless of when it runs. All users share the password below
// (dev only).

import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Secure by default: use SEED_PASSWORD when provided (handy for local dev),
// otherwise generate a strong random password so a production seed never ships
// a publicly-known credential. The value is printed once at the end of the run.
const PASSWORD = process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url");

// First-of-month UTC helper (mirrors lib/domain/periods toPeriodDate).
const period = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1));

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Anchor all seed data to the CURRENT calendar year/month so the dashboard's
  // default view (current month) is populated rather than showing "No data
  // entered". Entries run January → the current month; targets are effective
  // from January 1, so they apply to every seeded period.
  const now = new Date();
  const year = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1; // 1-based current month
  const monthsYtd = Array.from({ length: thisMonth }, (_, i) => i + 1); // [1..thisMonth]
  const targetEffective = period(year, 1);
  const inDays = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

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

  // --- Metrics (+ initial targets, effective Jan of the current year) ------
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
        effectiveFrom: targetEffective,
        setBy: admin.id,
      },
    });
    metrics.push(metric);
  }

  // --- Sample metric entries (Jan → current month) -------------------------
  // Deterministic values keyed off the month number so every run is stable and
  // the current month always has data. "Clients served" (target 100, off-track
  // < 80): one mid-year month deliberately dips to show the red flag.
  const clients = metrics[0];
  for (const mo of monthsYtd) {
    const value = mo === 4 ? 72 : 90 + ((mo * 7) % 18); // month 4 off-track (<80)
    await prisma.metricEntry.create({
      data: {
        metricId: clients.id,
        period: period(year, mo),
        actualValue: value,
        enteredBy: staff.id,
      },
    });
  }
  // "Employment placements" (target 20, off-track < 15): on-track every month.
  const placements = metrics[1];
  for (const mo of monthsYtd) {
    await prisma.metricEntry.create({
      data: {
        metricId: placements.id,
        period: period(year, mo),
        actualValue: 16 + ((mo * 3) % 7), // 16..22
        enteredBy: staff.id,
      },
    });
  }
  // "Training hours" (annual): a value each month → YTD sum on the dashboard.
  const training = metrics[2];
  for (const mo of monthsYtd) {
    await prisma.metricEntry.create({
      data: {
        metricId: training.id,
        period: period(year, mo),
        actualValue: 110 + ((mo * 5) % 30), // 110..139
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
      renewalDate: inDays(80), // ~80 days out → yellow window
      reportDueDate: inDays(20), // ~20 days out → red window
      notes: "Multi-year employment grant.",
    },
  });
  await prisma.funderProgram.create({
    data: { funderId: funder.id, programId: program.id },
  });

  // --- Revenue targets (versioned, effective Jan of the current year) ------
  // Funder-specific grant target.
  await prisma.revenueTarget.create({
    data: {
      funderId: funder.id,
      category: "grant",
      targetAmount: 50000,
      targetPeriod: "annual",
      effectiveFrom: targetEffective,
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
      effectiveFrom: targetEffective,
      setBy: admin.id,
    },
  });

  // --- Revenue entries (current month → dashboard populates by default) -----
  await prisma.revenueEntry.create({
    data: {
      funderId: funder.id,
      category: "grant",
      period: period(year, thisMonth),
      actualAmount: 30000, // vs 50k annual grant target → at-risk
      enteredBy: admin.id,
    },
  });
  await prisma.revenueEntry.create({
    data: {
      funderId: null,
      category: "donation",
      period: period(year, thisMonth),
      actualAmount: 1800, // vs 2k monthly donation target → on-track
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
