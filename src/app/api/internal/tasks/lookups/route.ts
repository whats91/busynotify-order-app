/*
 * File Context:
 * Purpose: Handles the API route for api / internal / tasks / lookups.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/internal/tasks/_lib/task-route-auth.ts, src/lib/server/task-db.ts
 * Role: private authenticated backend.
 */
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
