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
