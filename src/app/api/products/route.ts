/*
 * File Context:
 * Purpose: Handles the API route for api / products.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: Referenced by the Next.js routing runtime and adjacent shared modules.
 * Role: shared backend.
 */
// =====================================================
// PRODUCTS API ROUTE - Fetch product list from external API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

interface ExternalApiErrorResponse {
  success?: boolean;
  error?: string;
}

function parseJsonSafely<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractApiError(
  payload: ExternalApiErrorResponse | null,
  fallback: string,
  status?: number
): string {
  const message = payload?.error?.trim();

  if (message) {
    return message;
  }

  if (status) {
    return `${fallback} (status ${status})`;
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const apiBaseUrl = process.env.API_BASE_URL;
    const authToken = process.env.API_AUTH_TOKEN;

    if (!apiBaseUrl || !authToken) {
      return NextResponse.json(
        { success: false, error: 'API configuration missing' },
        { status: 500 }
      );
    }

    const parsed = requestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'companyId and financialYear are required',
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        authToken,
        companyId: parsed.data.companyId,
        financialYear: parsed.data.financialYear,
      }),
      cache: 'no-store',
    });

    const rawResponse = await response.text();
    const data = parseJsonSafely<ExternalApiErrorResponse | Record<string, unknown>>(rawResponse);

    if (!response.ok) {
      console.warn('Product API request failed', {
        companyId: parsed.data.companyId,
        financialYear: parsed.data.financialYear,
        status: response.status,
      });
      return NextResponse.json(
        {
          success: false,
          error: extractApiError(
            data as ExternalApiErrorResponse | null,
            'Failed to fetch products',
            response.status
          ),
        },
        { status: response.status }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Invalid product API response' },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
