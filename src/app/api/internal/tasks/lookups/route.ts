import { NextRequest, NextResponse } from 'next/server';
import { getTaskLookups } from '@/lib/server/task-db';
import { requireTaskUser } from '../_lib/task-route-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const sessionResult = await requireTaskUser(request);

  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  try {
    const lookups = await getTaskLookups();

    return NextResponse.json({
      success: true,
      data: lookups,
    });
  } catch (error) {
    console.error('Failed to fetch task lookups:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task lookups.',
      },
      { status: 500 }
    );
  }
}
