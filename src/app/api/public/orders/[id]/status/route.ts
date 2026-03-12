/*
 * File Context:
 * Purpose: Handles the API route for api / public / orders / :id / status.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/_lib/public-api-auth.ts, src/lib/server/order-db.ts, src/shared/types/index.ts
 * Role: public integration backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePublicApiAuth } from '@/app/api/_lib/public-api-auth';
import { updateStoredOrderStatus } from '@/lib/server/order-db';
import { ORDER_STATUSES } from '@/shared/types';

export const runtime = 'nodejs';

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  companyId: z.coerce.number().int().positive('company_id is required.'),
});

async function handleStatusUpdate(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let rawBody: {
      status?: string;
      company_id?: number | string;
      companyId?: number | string;
      authToken?: string;
    };

    try {
      rawBody = (await request.json()) as typeof rawBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON body.',
        },
        { status: 400 }
      );
    }

    const auth = requirePublicApiAuth(request, rawBody.authToken);

    if (!auth.ok) {
      return auth.response;
    }

    const parsed = updateOrderStatusSchema.safeParse({
      status: rawBody.status,
      companyId: rawBody.company_id ?? rawBody.companyId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message ||
            `Status and company_id are required. Allowed status values: ${ORDER_STATUSES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const order = await updateStoredOrderStatus(
      id,
      parsed.data.status,
      parsed.data.companyId
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found for the requested company.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
      metadata: {
        companyId: parsed.data.companyId,
      },
    });
  } catch (error) {
    console.error('Failed to update public order status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update order status.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, context);
}
