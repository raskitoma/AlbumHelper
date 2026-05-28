import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import { startBackupScheduler } from "./backupService";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const initPrisma = () => {
  // Database file path: check DATABASE_URL environment variable first
  const dbPath = process.env.DATABASE_URL || ("file:" + path.join(process.cwd(), "prisma", "figuritas.db"));
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? initPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Start background database backups (only on server side inside Next.js context)
if (typeof window === "undefined" && process.env.NEXT_RUNTIME === "nodejs") {
  startBackupScheduler();
}
