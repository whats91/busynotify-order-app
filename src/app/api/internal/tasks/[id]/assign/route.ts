/*
 * File Context:
 * Purpose: Handles the API route for api / internal / tasks / :id / assign.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/internal/tasks/_lib/task-route-auth.ts, src/lib/server/task-db.ts
 * Role: private authenticated backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  assignStoredTask,
  resolveActiveSalesmanAssignee,
} from '@/lib/server/task-db';
import { requireTaskAdmin } from '../../_lib/task-route-auth';

export const runtime = 'nodejs';

const assignTaskSchema = z.object({
  assigneeUserId: z.string().trim().optional().nullable(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const sessionResult = await requireTaskAdmin(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const parsed = assignTaskSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid assignment payload.',
        },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const assignee = await resolveActiveSalesmanAssignee(parsed.data.assigneeUserId ?? null);
    const task = await assignStoredTask({
      taskId: id,
      assignedBy: sessionResult.user,
      assignee,
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
    console.error('Failed to assign task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign task.',
      },
      { status: 500 }
    );
  }
}
