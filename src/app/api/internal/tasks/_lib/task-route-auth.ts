import type { NextRequest, NextResponse } from 'next/server';
import {
  createForbiddenPrivateApiResponse,
  createUnauthorizedPrivateApiResponse,
  getPrivateApiSession,
} from '@/app/api/_lib/private-api-session';
import { canUserAccessTask } from '@/lib/server/task-db';
import type { Task, User } from '@/shared/types';

export async function requireTaskUser(
  request: NextRequest
): Promise<{ user: User } | { response: NextResponse }> {
  const session = await getPrivateApiSession(request);

  if (!session) {
    return { response: createUnauthorizedPrivateApiResponse() };
  }

  if (session.user.role === 'customer') {
    return { response: createForbiddenPrivateApiResponse() };
  }

  return { user: session.user };
}

export async function requireTaskAdmin(
  request: NextRequest
): Promise<{ user: User } | { response: NextResponse }> {
  const result = await requireTaskUser(request);

  if ('response' in result) {
    return result;
  }

  if (result.user.role !== 'admin') {
    return { response: createForbiddenPrivateApiResponse() };
  }

  return result;
}

export function ensureTaskAccess(user: User, task: Task | null): NextResponse | null {
  if (!task) {
    return null;
  }

  return canUserAccessTask(user, task) ? null : createForbiddenPrivateApiResponse();
}
