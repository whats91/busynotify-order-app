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

  const projectRoot = process.cwd();
  const deployScriptPath = path.join(projectRoot, 'scripts', 'deploy.js');
  const lockFilePath =
    process.env.DEPLOY_LOCK_FILE || path.join(projectRoot, '.deploy.lock');
  const logDirectory = path.join(projectRoot, 'logs');
  const webhookLogPath =
    process.env.DEPLOY_WEBHOOK_LOG_PATH ||
    path.join(logDirectory, 'deploy-webhook.log');

  if (!existsSync(deployScriptPath)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Deploy script not found.',
      },
      { status: 500 }
    );
  }

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
