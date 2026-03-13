/*
 * File Context:
 * Purpose: Provides shared infrastructure for Db.
 * Primary Functionality: Supports shared runtime infrastructure consumed by routes, services, or server helpers.
 * Interlinked With: No direct internal imports; primarily used by framework or toolchain entry points.
 * Role: shared infrastructure.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { projectRoot, resolveProjectPath } from '@/lib/project-paths';

const FALLBACK_DB_PATH = resolveProjectPath('data', 'busy-notify.sqlite');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeDatabaseUrl(databaseUrl?: string): string {
  const rawUrl = databaseUrl?.trim();

  if (rawUrl?.startsWith('file:')) {
    const filePath = rawUrl.slice(5);
    const resolvedPath = filePath
      ? path.isAbsolute(filePath)
        ? filePath
        : path.resolve(projectRoot, filePath)
      : FALLBACK_DB_PATH;

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    return `file:${resolvedPath}`;
  }

  if (
    rawUrl &&
    (rawUrl.endsWith('.db') || rawUrl.endsWith('.sqlite') || rawUrl.endsWith('.sqlite3'))
  ) {
    const resolvedPath = path.isAbsolute(rawUrl)
      ? rawUrl
      : path.resolve(projectRoot, rawUrl);

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    return `file:${resolvedPath}`;
  }

  mkdirSync(path.dirname(FALLBACK_DB_PATH), { recursive: true });
  return `file:${FALLBACK_DB_PATH}`;
}

process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
