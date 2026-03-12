import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/shared/types';

const SESSION_COOKIE_NAME = 'busy-notify-session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface PrivateApiSession {
  user: User;
  issuedAt: number;
  expiresAt: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

function getSessionSecret(): string | null {
  return (
    process.env.PRIVATE_API_SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    null
  );
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function serializePayload(payload: PrivateApiSession): string {
  return toBase64Url(encoder.encode(JSON.stringify(payload)));
}

function deserializePayload(value: string): PrivateApiSession | null {
  const bytes = fromBase64Url(value);

  if (!bytes) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoder.decode(bytes)) as Partial<PrivateApiSession>;

    if (
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.user?.id !== 'string' ||
      typeof parsed.user?.username !== 'string' ||
      typeof parsed.user?.name !== 'string' ||
      (parsed.user?.role !== 'admin' &&
        parsed.user?.role !== 'customer' &&
        parsed.user?.role !== 'salesman')
    ) {
      return null;
    }

    return {
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
      user: parsed.user,
    };
  } catch {
    return null;
  }
}

export async function createPrivateApiSessionCookieValue(
  user: User,
  durationMs: number = SESSION_DURATION_MS
): Promise<string> {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error('Server configuration missing. Set PRIVATE_API_SESSION_SECRET or JWT_SECRET.');
  }

  const payload: PrivateApiSession = {
    user,
    issuedAt: Date.now(),
    expiresAt: Date.now() + durationMs,
  };

  const encodedPayload = serializePayload(payload);
  const signature = await signValue(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyPrivateApiSessionCookieValue(
  value?: string | null
): Promise<PrivateApiSession | null> {
  const secret = getSessionSecret();

  if (!secret || !value) {
    return null;
  }

  const [encodedPayload, providedSignature] = value.split('.', 2);

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = await signValue(encodedPayload, secret);

  if (expectedSignature !== providedSignature) {
    return null;
  }

  const payload = deserializePayload(encodedPayload);

  if (!payload || payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload;
}

export async function getPrivateApiSession(
  request: Pick<NextRequest, 'cookies'>
): Promise<PrivateApiSession | null> {
  return verifyPrivateApiSessionCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );
}

export function getPrivateApiSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getPrivateApiSessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  };
}

export function getExpiredPrivateApiSessionCookieOptions() {
  return {
    ...getPrivateApiSessionCookieOptions(Date.now() - 1000),
    maxAge: 0,
  };
}

export function createUnauthorizedPrivateApiResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized. Please log in to access this API.',
    },
    { status: 401 }
  );
}

export function createForbiddenPrivateApiResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Forbidden. You do not have access to this API.',
    },
    { status: 403 }
  );
}
