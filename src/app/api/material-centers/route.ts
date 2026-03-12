import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiMaterialCenter, MaterialCenter } from '@/shared/types';

export const runtime = 'nodejs';

const requestSchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

interface ExternalMaterialCenterApiResponse {
  success?: boolean;
  error?: string;
  data?: Array<Partial<ApiMaterialCenter> & Record<string, unknown>>;
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
  payload: ExternalMaterialCenterApiResponse | null,
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

function mapMaterialCenter(
  value: Partial<ApiMaterialCenter> & Record<string, unknown>
): MaterialCenter {
  return {
    id: toText(value.mc_id),
    name: toText(value.mc_name),
    alias: toText(value.mc_alias) || undefined,
    printName: toText(value.mc_print_name) || undefined,
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
          error: parsed.error.issues[0]?.message || 'Invalid material center request.',
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/material-centers`, {
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
    const result = parseJsonSafely<ExternalMaterialCenterApiResponse>(rawResponse);

    if (!response.ok) {
      console.warn('Material center API request failed', {
        companyId: parsed.data.companyId,
        financialYear: parsed.data.financialYear,
        status: response.status,
      });

      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Failed to fetch material centers', response.status),
        },
        { status: response.status }
      );
    }

    if (!result || result.success !== true || !Array.isArray(result.data)) {
      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Invalid material center API response'),
        },
        { status: 502 }
      );
    }

    const materialCenters = result.data
      .map(mapMaterialCenter)
      .filter((materialCenter) => materialCenter.id && materialCenter.name)
      .sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json({
      success: true,
      data: materialCenters,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Error fetching material centers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
