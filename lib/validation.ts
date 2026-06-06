import { z } from "zod";

// Shared zod schemas for mutation routes. Server-side validation is the source
// of truth (ADD §9.1); client validation is UX only.

export const roleEnum = z.enum(["ed", "fundraising", "staff", "admin"]);
export const targetPeriodEnum = z.enum(["monthly", "annual"]);
export const funderStatusEnum = z.enum(["active", "prospect", "lapsed"]);
export const revenueCategoryEnum = z.enum(["grant", "donation", "other"]);

/** "YYYY-MM" period string used by entry/target/report forms. */
export const periodString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

const numeric = z.coerce.number().finite();

// --- Programs ---------------------------------------------------------------
export const programCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const programUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

// --- Metrics (+ initial target, created atomically) -------------------------
export const metricCreateSchema = z.object({
  programId: z.string().min(1, "Program is required"),
  name: z.string().trim().min(1, "Name is required"),
  unit: z.string().trim().min(1, "Unit is required"),
  targetPeriod: targetPeriodEnum,
  offTrackThreshold: numeric
    .gt(0, "Threshold must be > 0")
    .max(1, "Threshold must be ≤ 1")
    .default(0.8),
  // Initial target — mandatory; a metric cannot be saved without one (PRD Flow D).
  initialTargetValue: numeric.nonnegative("Target must be ≥ 0"),
  effectiveFrom: periodString,
});

export const metricUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  unit: z.string().trim().min(1).optional(),
  offTrackThreshold: numeric.gt(0).max(1).optional(),
  isActive: z.boolean().optional(),
});

// --- Users ------------------------------------------------------------------
export const userCreateSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Valid email required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: roleEnum,
    programId: z.string().min(1).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "staff" && !val.programId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["programId"],
        message: "Staff users must be assigned exactly one program",
      });
    }
    if (val.role !== "staff" && val.programId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["programId"],
        message: "Only staff users can be assigned a program",
      });
    }
  });

export const userRoleChangeSchema = z
  .object({
    role: roleEnum,
    programId: z.string().min(1).optional().nullable(),
    confirm: z.literal(true, {
      errorMap: () => ({ message: "Role change must be explicitly confirmed" }),
    }),
  })
  .superRefine((val, ctx) => {
    if (val.role === "staff" && !val.programId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["programId"],
        message: "Staff users must be assigned exactly one program",
      });
    }
  });

// --- Metric targets (versioned, insert-only) --------------------------------
export const targetCreateSchema = z.object({
  metricId: z.string().min(1, "Metric is required"),
  targetValue: numeric.nonnegative("Target must be ≥ 0"),
  effectiveFrom: periodString,
});

// --- Revenue ----------------------------------------------------------------
// funderId nullable for general donations. `null` is an explicit, valid value;
// the form sends null (not "") for general donations.
const optionalFunderId = z.string().min(1).nullable().default(null);

export const revenueEntrySchema = z.object({
  funderId: optionalFunderId,
  category: revenueCategoryEnum,
  period: periodString, // required — blocks "actual with no period"
  actualAmount: numeric.nonnegative("Amount must be ≥ 0"),
});

export const revenueTargetSchema = z.object({
  funderId: optionalFunderId,
  category: revenueCategoryEnum,
  targetAmount: numeric.nonnegative("Target must be ≥ 0"),
  targetPeriod: targetPeriodEnum,
  effectiveFrom: periodString,
});

// --- Funders ----------------------------------------------------------------
/** "YYYY-MM-DD" full date (funder renewal / report-due dates). */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullable()
  .optional();

export const funderCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  grantAmount: numeric.nonnegative("Grant amount must be ≥ 0").default(0),
  status: funderStatusEnum.default("prospect"),
  renewalDate: dateString,
  reportDueDate: dateString,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const funderUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  grantAmount: numeric.nonnegative().optional(),
  status: funderStatusEnum.optional(),
  renewalDate: dateString,
  reportDueDate: dateString,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const funderProgramLinkSchema = z.object({
  programId: z.string().min(1, "Program is required"),
});

// --- Reports ----------------------------------------------------------------
export const reportRequestSchema = z
  .object({
    reportType: z.enum(["board", "funder"]),
    period: periodString,
    funderId: z.string().min(1).optional(),
    edNotes: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .refine(
        (v) => !v || v.split(/\s+/).filter(Boolean).length <= 300,
        "ED Notes must be 300 words or fewer",
      ),
  })
  .superRefine((val, ctx) => {
    if (val.reportType === "funder" && !val.funderId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["funderId"],
        message: "A funder is required for a funder report",
      });
    }
  });
