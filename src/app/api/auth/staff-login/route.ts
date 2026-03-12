/*
 * File Context:
 * Purpose: Handles the API route for api / auth / staff login.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/_lib/private-api-session.ts, src/lib/server/salesmen-db.ts, src/shared/types/index.ts
 * Role: authentication backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateSalesman } from '@/lib/server/salesmen-db';
import type { User } from '@/shared/types';
import {
  createPrivateApiSessionCookieValue,
  getPrivateApiSessionCookieName,
  getPrivateApiSessionCookieOptions,
} from '@/app/api/_lib/private-api-session';

export const runtime = 'nodejs';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

function authenticateAdmin(username: string, password: string): User | null {
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  if (username.trim().toLowerCase() !== adminUsername || password !== adminPassword) {
    return null;
  }

  return {
    id: 'usr_admin',
    username: adminUsername,
    name: 'Admin User',
    role: 'admin',
    email: 'admin@busynotify.com',
  };
}

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid login request.',
        },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const adminUser = authenticateAdmin(username, password);

    if (adminUser) {
      const response = NextResponse.json({
        success: true,
        data: {
          user: adminUser,
        },
      });

      const cookieValue = await createPrivateApiSessionCookieValue(adminUser);
      response.cookies.set(
        getPrivateApiSessionCookieName(),
        cookieValue,
        getPrivateApiSessionCookieOptions(Date.now() + 24 * 60 * 60 * 1000)
      );

      return response;
    }

    const salesmanUser = await authenticateSalesman(username, password);

    if (!salesmanUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username or password',
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: {
        user: salesmanUser,
      },
    });

    const cookieValue = await createPrivateApiSessionCookieValue(salesmanUser);
    response.cookies.set(
      getPrivateApiSessionCookieName(),
      cookieValue,
      getPrivateApiSessionCookieOptions(Date.now() + 24 * 60 * 60 * 1000)
    );

    return response;
  } catch (error) {
    console.error('Staff login failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Staff login failed.',
      },
      { status: 500 }
    );
  }
}
