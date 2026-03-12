import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getStoredTaskById,
  updateStoredTask,
} from '@/lib/server/task-db';
import { TASK_PRIORITY_CODES } from '@/shared/types';
import { ensureTaskAccess, requireTaskAdmin, requireTaskUser } from '../_lib/task-route-auth';

export const runtime = 'nodejs';

const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.').optional(),
  description: z.string().trim().optional().nullable(),
  priorityCode: z.enum(TASK_PRIORITY_CODES).optional(),
  companyId: z.number().int().positive().optional().nullable(),
  customerId: z.string().trim().optional().nullable(),
  customerNameSnapshot: z.string().trim().optional().nullable(),
  orderId: z.string().trim().optional().nullable(),
  startAt: z.string().trim().optional().nullable(),
  dueAt: z.string().trim().optional().nullable(),
  archive: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const sessionResult = await requireTaskUser(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const { id } = await context.params;
    const task = await getStoredTaskById(id);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found.',
        },
        { status: 404 }
      );
    }

    const forbidden = ensureTaskAccess(sessionResult.user, task);
    if (forbidden) {
      return forbidden;
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionResult = await requireTaskAdmin(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const parsed = updateTaskSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid task update payload.',
        },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const task = await updateStoredTask(id, {
      ...parsed.data,
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
    console.error('Failed to update task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task.',
      },
      { status: 500 }
    );
  }
}
