/*
 * File Context:
 * Purpose: Handles the API route for api / webhooks / deploy.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: Referenced by the Next.js routing runtime and adjacent shared modules.
 * Role: shared backend.
 */
import { appendFileSync, existsSync, mkdirSync, openSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const configuredToken = process.env.DEPLOY_WEBHOOK_TOKEN?.trim();

  if (!configuredToken) {
    return true;
  }

  const providedToken =
    request.nextUrl.searchParams.get('token')?.trim() ||
    request.headers.get('x-deploy-token')?.trim() ||
    '';

  const expectedBuffer = Buffer.from(configuredToken, 'utf8');
  const providedBuffer = Buffer.from(providedToken, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function getProjectRootCandidates(): string[] {
  const cwd = process.cwd();
  const configuredProjectPath = process.env.DEPLOY_PROJECT_PATH?.trim();
  const candidates = [
    configuredProjectPath,
    cwd,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '..', '..'),
    path.resolve(cwd, '..', '..', '..'),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

function resolveDeployTarget():
  | { projectRoot: string; deployScriptPath: string }
  | { checkedPaths: string[] } {
  const checkedPaths: string[] = [];

  for (const projectRoot of getProjectRootCandidates()) {
    const deployScriptPath = path.join(projectRoot, 'scripts', 'deploy.js');
    checkedPaths.push(deployScriptPath);

    if (existsSync(deployScriptPath)) {
      return {
        projectRoot,
        deployScriptPath,
      };
    }
  }

  return { checkedPaths };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized deploy webhook request.',
      },
      { status: 401 }
    );
  }

  const deployTarget = resolveDeployTarget();

  if (!('projectRoot' in deployTarget)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Deploy script not found.',
        checkedPaths: deployTarget.checkedPaths,
        cwd: process.cwd(),
      },
      { status: 500 }
    );
  }

  const { projectRoot, deployScriptPath } = deployTarget;
  const lockFilePath =
    process.env.DEPLOY_LOCK_FILE || path.join(projectRoot, '.deploy.lock');
  const logDirectory = path.join(projectRoot, 'logs');
  const webhookLogPath =
    process.env.DEPLOY_WEBHOOK_LOG_PATH ||
    path.join(logDirectory, 'deploy-webhook.log');

  if (existsSync(lockFilePath)) {
    return NextResponse.json(
      {
        success: true,
        queued: false,
        message: 'Deployment is already in progress.',
      },
      { status: 202 }
    );
  }

  mkdirSync(logDirectory, { recursive: true });
  appendFileSync(
    webhookLogPath,
    `\n[${new Date().toISOString()}] [webhook] Deployment requested from ${
      request.headers.get('x-forwarded-for') || 'unknown'
    }\n`
  );

  try {
    const logFd = openSync(webhookLogPath, 'a');
    const child = spawn(process.execPath, [deployScriptPath], {
      cwd: projectRoot,
      detached: true,
      env: process.env,
      stdio: ['ignore', logFd, logFd],
    });

    child.unref();
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start deployment.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      queued: true,
      message: 'Deployment started.',
    },
    { status: 202 }
  );
}
