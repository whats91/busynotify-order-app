/*
 * File Context:
 * Purpose: Provides shared infrastructure for Project Paths.
 * Primary Functionality: Resolves a stable project-root path even when the app is started from `.next/standalone`.
 * Interlinked With: src/lib/db.ts, src/lib/ecommerce-db.ts, src/lib/tasks-db.ts, src/lib/server/theme-assets.ts
 * Role: shared infrastructure.
 */
import path from 'node:path';
import { existsSync } from 'node:fs';

function resolveProjectRoot() {
  const configuredRoots = [
    process.env.PROJECT_ROOT?.trim(),
    process.env.DEPLOY_PROJECT_PATH?.trim(),
  ].filter(Boolean) as string[];

  for (const configuredRoot of configuredRoots) {
    const resolvedConfiguredRoot = path.resolve(configuredRoot);

    if (existsSync(resolvedConfiguredRoot)) {
      return resolvedConfiguredRoot;
    }
  }

  const cwd = process.cwd();
  const standaloneSuffix = path.join('.next', 'standalone');

  if (cwd.endsWith(standaloneSuffix)) {
    return path.resolve(cwd, '..', '..');
  }

  const standaloneIndex = cwd.lastIndexOf(standaloneSuffix);
  if (standaloneIndex >= 0) {
    return cwd.slice(0, standaloneIndex);
  }

  return cwd;
}

export const projectRoot = resolveProjectRoot();

export function resolveProjectPath(...segments: string[]) {
  return path.join(projectRoot, ...segments);
}
