/*
 * File Context:
 * Purpose: Handles the API route for api / meta / indian states.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/lib/server/indian-states.ts
 * Role: shared backend.
 */
import { NextResponse } from 'next/server';
import { getIndianStates } from '@/lib/server/indian-states';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const states = getIndianStates();

    return NextResponse.json({
      success: true,
      data: states,
      metadata: {
        count: states.length,
      },
    });
  } catch (error) {
    console.error('Failed to load Indian states:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load Indian states.',
      },
      { status: 500 }
    );
  }
}
