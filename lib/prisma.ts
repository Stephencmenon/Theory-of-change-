import { PrismaClient } from "@prisma/client";

// Prisma client singleton. In development, Next.js hot-reloads modules on every
// edit; without this guard each reload would instantiate a new PrismaClient and
// exhaust the database connection pool. We stash the instance on globalThis so
// it survives reloads. In production a single instance is created per process.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
