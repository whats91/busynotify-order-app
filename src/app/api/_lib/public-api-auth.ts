import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_API_AUTH_TOKEN_ENV = 'PUBLIC_API_AUTH_TOKEN';

function getConfiguredToken(): string | null {
  const token = process.env[PUBLIC_API_AUTH_TOKEN_ENV]?.trim();
  return token || null;
}

function getAuthorizationHeaderToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization')?.trim();

  if (!authorization) {
    return null;
  }

  const [scheme, value] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    return null;
  }

  return value.trim() || null;
}

function tokensMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function getPublicApiToken(request: NextRequest, bodyAuthToken?: string | null): string | null {
  return (
    getAuthorizationHeaderToken(request) ||
    request.headers.get('x-public-api-token')?.trim() ||
    request.nextUrl.searchParams.get('authToken')?.trim() ||
    bodyAuthToken?.trim() ||
    null
  );
}

export function requirePublicApiAuth(request: NextRequest, bodyAuthToken?: string | null) {
  const configuredToken = getConfiguredToken();

  if (!configuredToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: `Server configuration missing. Set ${PUBLIC_API_AUTH_TOKEN_ENV} in .env.`,
        },
        { status: 500 }
      ),
    };
  }

  const providedToken = getPublicApiToken(request, bodyAuthToken);

  if (!providedToken || !tokensMatch(configuredToken, providedToken)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. A valid public API auth token is required.',
        },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true as const,
  };
}
