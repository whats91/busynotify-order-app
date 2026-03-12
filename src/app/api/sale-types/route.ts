/*
 * File Context:
 * Purpose: Handles the API route for api / sale types.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/shared/types/index.ts
 * Role: shared backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiSaleType, SaleType } from '@/shared/types';

export const runtime = 'nodejs';

const requestSchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

interface ExternalSaleTypeApiResponse {
  success?: boolean;
  error?: string;
  data?: Array<Partial<ApiSaleType> & Record<string, unknown>>;
  metadata?: {
    companyId: number;
    companyCode: string;
    financialYear: string;
    rowCount: number;
    executionTime?: string;
    executedAt: string;
  };
}

function parseJsonSafely<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractApiError(
  payload: ExternalSaleTypeApiResponse | null,
  fallback: string,
  status?: number
): string {
  const message = payload?.error?.trim();

  if (message) {
    return message;
  }

  return status ? `${fallback} (status ${status})` : fallback;
}

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function mapSaleType(value: Partial<ApiSaleType> & Record<string, unknown>): SaleType {
  return {
    id: toText(value.sale_type_id),
    name: toText(value.sale_type_name),
    alias: toText(value.sale_type_alias) || undefined,
    printName: toText(value.sale_type_print_name) || undefined,
  };
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
          error: parsed.error.issues[0]?.message || 'Invalid sale type request.',
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/sale-types`, {
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
    const result = parseJsonSafely<ExternalSaleTypeApiResponse>(rawResponse);

    if (!response.ok) {
      console.warn('Sale type API request failed', {
        companyId: parsed.data.companyId,
        financialYear: parsed.data.financialYear,
        status: response.status,
      });

      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Failed to fetch sale types', response.status),
        },
        { status: response.status }
      );
    }

    if (!result || result.success !== true || !Array.isArray(result.data)) {
      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Invalid sale type API response'),
        },
        { status: 502 }
      );
    }

    const saleTypes = result.data
      .map(mapSaleType)
      .filter((saleType) => saleType.id && saleType.name)
      .sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json({
      success: true,
      data: saleTypes,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Error fetching sale types:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
