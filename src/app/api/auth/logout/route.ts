/*
 * File Context:
 * Purpose: Handles the API route for api / auth / logout.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/_lib/private-api-session.ts
 * Role: authentication backend.
 */
import { NextResponse } from 'next/server';
import {
  getExpiredPrivateApiSessionCookieOptions,
  getPrivateApiSessionCookieName,
} from '@/app/api/_lib/private-api-session';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set(
    getPrivateApiSessionCookieName(),
    '',
    getExpiredPrivateApiSessionCookieOptions()
  );

  return response;
}
