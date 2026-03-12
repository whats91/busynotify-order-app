/*
 * File Context:
 * Purpose: Handles the API route for api / public / orders.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/_lib/public-api-auth.ts, src/lib/server/order-db.ts, src/shared/types/index.ts
 * Role: public integration backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePublicApiAuth } from '@/app/api/_lib/public-api-auth';
import { listStoredOrders } from '@/lib/server/order-db';
import { ORDER_STATUSES } from '@/shared/types';
import type { OrderStatus } from '@/shared/types';

export const runtime = 'nodejs';

const companyQuerySchema = z.object({
  companyId: z.coerce.number().int().positive('company_id is required.'),
});

const orderStatusSchema = z.enum(ORDER_STATUSES);

function parseStatuses(searchParams: URLSearchParams): {
  statuses?: OrderStatus[];
  error?: string;
} {
  const rawStatuses = searchParams
    .getAll('status')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (rawStatuses.length === 0 || rawStatuses.includes('all')) {
    return {};
  }

  const uniqueStatuses = [...new Set(rawStatuses)];
  const invalidStatuses = uniqueStatuses.filter(
    (status) => !ORDER_STATUSES.includes(status as OrderStatus)
  );

  if (invalidStatuses.length > 0) {
    return {
      error: `Invalid status value(s): ${invalidStatuses.join(', ')}. Allowed values: ${ORDER_STATUSES.join(', ')}.`,
    };
  }

  return {
    statuses: uniqueStatuses.map((status) => orderStatusSchema.parse(status)),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = requirePublicApiAuth(request);

    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const parsedCompany = companyQuerySchema.safeParse({
      companyId: searchParams.get('company_id') ?? searchParams.get('companyId'),
    });

    if (!parsedCompany.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsedCompany.error.issues[0]?.message || 'company_id is required.',
        },
        { status: 400 }
      );
    }

    const customerId = searchParams.get('customerId') || undefined;
    const createdBy = searchParams.get('createdBy') || undefined;
    const { statuses, error } = parseStatuses(searchParams);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status: 400 }
      );
    }

    const orders = await listStoredOrders({
      companyId: parsedCompany.data.companyId,
      customerId,
      createdBy,
      status: statuses?.length === 1 ? statuses[0] : undefined,
      statuses: statuses && statuses.length > 1 ? statuses : undefined,
    });

    return NextResponse.json({
      success: true,
      data: orders,
      metadata: {
        companyId: parsedCompany.data.companyId,
        statuses: statuses ?? 'all',
        count: orders.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch public orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders.',
      },
      { status: 500 }
    );
  }
}
