import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getStoredTaskById,
  updateStoredTaskStatus,
} from '@/lib/server/task-db';
import { TASK_STATUS_CODES } from '@/shared/types';
import { ensureTaskAccess, requireTaskUser } from '../../_lib/task-route-auth';

export const runtime = 'nodejs';

const updateTaskStatusSchema = z.object({
  statusCode: z.enum(TASK_STATUS_CODES),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SALESMAN_ALLOWED_STATUSES = new Set([
  'pending',
  'in_progress',
  'blocked',
  'completed',
]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionResult = await requireTaskUser(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const parsed = updateTaskStatusSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid task status payload.',
        },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const existingTask = await getStoredTaskById(id);

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found.',
        },
        { status: 404 }
      );
    }

    const forbidden = ensureTaskAccess(sessionResult.user, existingTask);
    if (forbidden) {
      return forbidden;
    }

    if (
      sessionResult.user.role === 'salesman' &&
      !SALESMAN_ALLOWED_STATUSES.has(parsed.data.statusCode)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Salesmen cannot move tasks to that status.',
        },
        { status: 403 }
      );
    }

    const task = await updateStoredTaskStatus({
      taskId: id,
      statusCode: parsed.data.statusCode,
      updatedBy: sessionResult.user,
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to update task status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task status.',
      },
      { status: 500 }
    );
  }
}
