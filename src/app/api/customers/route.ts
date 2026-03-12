import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiCustomer, Customer } from '@/shared/types';

export const runtime = 'nodejs';

const requestSchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

interface ExternalCustomerApiResponse {
  success?: boolean;
  error?: string;
  data?: Array<Partial<ApiCustomer> & Record<string, unknown>>;
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
  payload: ExternalCustomerApiResponse | null,
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

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function toAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizePhone(value: unknown): string {
  return toText(value)
    .replace(/\s+/g, ' ')
    .split(',')
    .map((segment) => segment.trim())
    .find(Boolean)
    ?.replace(/[^\d+]/g, '') || '';
}

function buildAddress(customer: Partial<ApiCustomer> & Record<string, unknown>): string {
  return [
    customer.address_line_1,
    customer.address_line_2,
    customer.address_line_3,
    customer.address_line_4,
  ]
    .map(toText)
    .filter(Boolean)
    .join(', ');
}

function mapCustomer(customer: Partial<ApiCustomer> & Record<string, unknown>): Customer {
  const whatsappNumber = normalizePhone(customer.whatsapp_number);
  const mobileNumber = normalizePhone(customer.mobile_number);
  const state = toText(customer.state);
  const station = toText(customer.station);
  const addressLine4 = toText(customer.address_line_4);
  const closingBalance = toAmount(customer.closing_balance);
  const balance = toAmount(customer.balance);
  const city = station || addressLine4 || state;
  const hasClosingBalance =
    customer.closing_balance !== null &&
    customer.closing_balance !== undefined &&
    toText(customer.closing_balance) !== '';

  return {
    id: toText(customer.customer_id),
    name: toText(customer.customer_name),
    email: '',
    phone: whatsappNumber || mobileNumber,
    whatsappNumber: whatsappNumber || undefined,
    address: buildAddress(customer),
    city,
    state,
    pincode: toText(customer.pin_code),
    groupName: toText(customer.group_name) || undefined,
    gstNumber: toText(customer.gst_number) || undefined,
    outstandingBalance: hasClosingBalance ? closingBalance : balance,
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
          error: parsed.error.issues[0]?.message || 'Invalid customer request.',
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/customers`, {
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
    const result = parseJsonSafely<ExternalCustomerApiResponse>(rawResponse);

    if (!response.ok) {
      console.warn('Customer API request failed', {
        companyId: parsed.data.companyId,
        financialYear: parsed.data.financialYear,
        status: response.status,
      });
      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Failed to fetch customers', response.status),
        },
        { status: response.status }
      );
    }

    if (!result || result.success !== true || !Array.isArray(result.data)) {
      return NextResponse.json(
        {
          success: false,
          error: extractApiError(result, 'Invalid customer API response'),
        },
        { status: 502 }
      );
    }

    const customers = result.data
      .map(mapCustomer)
      .filter((customer) => customer.id && customer.name)
      .sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json({
      success: true,
      data: customers,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
