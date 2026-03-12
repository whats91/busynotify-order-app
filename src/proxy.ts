/*
 * File Context:
 * Purpose: Configures request-time proxy and route-guard behavior for the app.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: src/app/api/_lib/private-api-session.ts
 * Role: shared project asset.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  createForbiddenPrivateApiResponse,
  createUnauthorizedPrivateApiResponse,
  getPrivateApiSession,
} from '@/app/api/_lib/private-api-session';

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicApiPath(pathname: string): boolean {
  return (
    matchesRoutePrefix(pathname, '/api/order') ||
    matchesRoutePrefix(pathname, '/api/public') ||
    pathname === '/api/auth/request-customer-otp' ||
    pathname === '/api/auth/verify-customer-otp' ||
    pathname === '/api/auth/complete-customer-login' ||
    pathname === '/api/auth/staff-login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/webhooks/deploy'
  );
}

function requiresAdminRole(pathname: string): boolean {
  return (
    matchesRoutePrefix(pathname, '/api/admin') ||
    matchesRoutePrefix(pathname, '/api/internal/admin')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!matchesRoutePrefix(pathname, '/api') || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const session = await getPrivateApiSession(request);

  if (!session) {
    return createUnauthorizedPrivateApiResponse();
  }

  if (requiresAdminRole(pathname) && session.user.role !== 'admin') {
    return createForbiddenPrivateApiResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
