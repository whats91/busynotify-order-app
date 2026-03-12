import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createStoredTask,
  listStoredTasks,
  resolveActiveSalesmanAssignee,
} from '@/lib/server/task-db';
import {
  TASK_PRIORITY_CODES,
  type TaskFilter,
} from '@/shared/types';
import { requireTaskAdmin, requireTaskUser } from './_lib/task-route-auth';

export const runtime = 'nodejs';

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.'),
  description: z.string().trim().optional(),
  priorityCode: z.enum(TASK_PRIORITY_CODES).optional(),
  companyId: z.number().int().positive().optional(),
  customerId: z.string().trim().optional(),
  customerNameSnapshot: z.string().trim().optional(),
  orderId: z.string().trim().optional(),
  startAt: z.string().trim().optional(),
  dueAt: z.string().trim().optional(),
  assigneeUserId: z.string().trim().optional(),
});

function parseListFilter(request: NextRequest, userId?: string): TaskFilter {
  const searchParams = request.nextUrl.searchParams;
  const companyIdRaw = searchParams.get('companyId');
  const parsedCompanyId =
    companyIdRaw && Number.isFinite(Number(companyIdRaw)) ? Number(companyIdRaw) : undefined;

  return {
    search: searchParams.get('search') || undefined,
    statusCode: (searchParams.get('statusCode') as TaskFilter['statusCode']) || undefined,
    priorityCode: (searchParams.get('priorityCode') as TaskFilter['priorityCode']) || undefined,
    assigneeUserId: searchParams.get('assigneeUserId') || userId || undefined,
    companyId: parsedCompanyId,
    customerId: searchParams.get('customerId') || undefined,
    orderId: searchParams.get('orderId') || undefined,
    dueDate: searchParams.get('dueDate') || undefined,
    includeArchived: searchParams.get('includeArchived') === 'true',
    onlyMine: searchParams.get('onlyMine') === 'true' || Boolean(userId),
  };
}

export async function GET(request: NextRequest) {
  const sessionResult = await requireTaskUser(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const filters =
      sessionResult.user.role === 'salesman'
        ? parseListFilter(request, sessionResult.user.id)
        : parseListFilter(request);

    const tasks = await listStoredTasks(filters);

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tasks.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireTaskAdmin(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const parsed = createTaskSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid task payload.',
        },
        { status: 400 }
      );
    }

    const assignee = await resolveActiveSalesmanAssignee(parsed.data.assigneeUserId);
    const task = await createStoredTask({
      ...parsed.data,
      createdBy: sessionResult.user,
      assignee,
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task.',
      },
      { status: 500 }
    );
  }
}
