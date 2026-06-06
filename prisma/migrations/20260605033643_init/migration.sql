-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ed', 'fundraising', 'staff', 'admin');

-- CreateEnum
CREATE TYPE "TargetPeriod" AS ENUM ('monthly', 'annual');

-- CreateEnum
CREATE TYPE "FunderStatus" AS ENUM ('active', 'prospect', 'lapsed');

-- CreateEnum
CREATE TYPE "RevenueCategory" AS ENUM ('grant', 'donation', 'other');

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "target_period" "TargetPeriod" NOT NULL,
    "off_track_threshold" DECIMAL(4,3) NOT NULL DEFAULT 0.80,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_targets" (
    "id" TEXT NOT NULL,
    "metric_id" TEXT NOT NULL,
    "target_value" DECIMAL(14,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "set_by" TEXT NOT NULL,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_entries" (
    "id" TEXT NOT NULL,
    "metric_id" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "actual_value" DECIMAL(14,2) NOT NULL,
    "entered_by" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grant_amount" DECIMAL(14,2) NOT NULL,
    "status" "FunderStatus" NOT NULL DEFAULT 'prospect',
    "renewal_date" DATE,
    "report_due_date" DATE,
    "notes" TEXT,

    CONSTRAINT "funders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funder_programs" (
    "funder_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,

    CONSTRAINT "funder_programs_pkey" PRIMARY KEY ("funder_id","program_id")
);

-- CreateTable
CREATE TABLE "revenue_targets" (
    "id" TEXT NOT NULL,
    "funder_id" TEXT,
    "category" "RevenueCategory" NOT NULL,
    "target_amount" DECIMAL(14,2) NOT NULL,
    "target_period" "TargetPeriod" NOT NULL,
    "effective_from" DATE NOT NULL,
    "set_by" TEXT NOT NULL,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_entries" (
    "id" TEXT NOT NULL,
    "funder_id" TEXT,
    "category" "RevenueCategory" NOT NULL,
    "period" DATE NOT NULL,
    "actual_amount" DECIMAL(14,2) NOT NULL,
    "entered_by" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "revenue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "program_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metrics_program_id_idx" ON "metrics"("program_id");

-- CreateIndex
CREATE INDEX "metric_targets_metric_id_effective_from_idx" ON "metric_targets"("metric_id", "effective_from");

-- CreateIndex
CREATE INDEX "metric_entries_metric_id_idx" ON "metric_entries"("metric_id");

-- CreateIndex
CREATE UNIQUE INDEX "metric_entries_metric_id_period_key" ON "metric_entries"("metric_id", "period");

-- CreateIndex
CREATE INDEX "funder_programs_program_id_idx" ON "funder_programs"("program_id");

-- CreateIndex
CREATE INDEX "revenue_targets_funder_id_category_effective_from_idx" ON "revenue_targets"("funder_id", "category", "effective_from");

-- CreateIndex
CREATE INDEX "revenue_entries_funder_id_category_period_idx" ON "revenue_entries"("funder_id", "category", "period");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_entries_funder_id_category_period_key" ON "revenue_entries"("funder_id", "category", "period");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_targets" ADD CONSTRAINT "metric_targets_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_targets" ADD CONSTRAINT "metric_targets_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_entries" ADD CONSTRAINT "metric_entries_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "metrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_entries" ADD CONSTRAINT "metric_entries_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funder_programs" ADD CONSTRAINT "funder_programs_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "funders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funder_programs" ADD CONSTRAINT "funder_programs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_targets" ADD CONSTRAINT "revenue_targets_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "funders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_targets" ADD CONSTRAINT "revenue_targets_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_entries" ADD CONSTRAINT "revenue_entries_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "funders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_entries" ADD CONSTRAINT "revenue_entries_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_entries" ADD CONSTRAINT "revenue_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
