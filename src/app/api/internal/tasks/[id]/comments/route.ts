import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createStoredTaskComment,
  getStoredTaskById,
  listStoredTaskComments,
} from '@/lib/server/task-db';
import { ensureTaskAccess, requireTaskUser } from '../../_lib/task-route-auth';

export const runtime = 'nodejs';

const createTaskCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment body is required.'),
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

    const comments = await listStoredTaskComments(id);

    return NextResponse.json({
      success: true,
      data: comments ?? [],
    });
  } catch (error) {
    console.error('Failed to fetch task comments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task comments.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const sessionResult = await requireTaskUser(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const parsed = createTaskCommentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid comment payload.',
        },
        { status: 400 }
      );
    }

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

    const comment = await createStoredTaskComment({
      taskId: id,
      body: parsed.data.body,
      author: sessionResult.user,
    });

    if (!comment) {
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
      data: comment,
    });
  } catch (error) {
    console.error('Failed to add task comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add task comment.',
      },
      { status: 500 }
    );
  }
}
