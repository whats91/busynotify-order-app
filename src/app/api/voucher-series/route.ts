import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiVoucherSeries, VoucherSeries } from '@/shared/types';

export const runtime = 'nodejs';

const requestSchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

interface ExternalVoucherSeriesApiResponse {
  success?: boolean;
  error?: string;
  data?: Array<Partial<ApiVoucherSeries> & Record<string, unknown>>;
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
  payload: ExternalVoucherSeriesApiResponse | null,
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

function mapVoucherSeries(
  value: Partial<ApiVoucherSeries> & Record<string, unknown>
): VoucherSeries {
  return {
    id: toText(value.voucher_series_id),
    name: toText(value.voucher_series_name),
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
          error: parsed.error.issues[0]?.message || 'Invalid voucher series request.',
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/voucher-series`, {
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
    const result = parseJsonSafely<ExternalVoucherSeriesApiResponse>(rawResponse);

    if (!response.ok) {
      console.warn('Voucher series API request failed', {
        companyId: parsed.data.companyId,
        financialYear: parsed.data.financialYear,
        status: response.status,
      });

      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Failed to fetch voucher series', response.status),
        },
        { status: response.status }
      );
    }

    if (!result || result.success !== true || !Array.isArray(result.data)) {
      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Invalid voucher series API response'),
        },
        { status: 502 }
      );
    }

    const voucherSeries = result.data
      .map(mapVoucherSeries)
      .filter((series) => series.id && series.name)
      .sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json({
      success: true,
      data: voucherSeries,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Error fetching voucher series:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
