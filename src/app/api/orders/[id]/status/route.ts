/*
 * File Context:
 * Purpose: Handles the API route for api / orders / :id / status.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/lib/server/order-db.ts, src/shared/types/index.ts
 * Role: shared backend.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateStoredOrderStatus } from '@/lib/server/order-db';
import { ORDER_STATUSES } from '@/shared/types';

export const runtime = 'nodejs';

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

async function handleStatusUpdate(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = updateOrderStatusSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message ||
            `Status is required. Allowed values: ${ORDER_STATUSES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const order = await updateStoredOrderStatus(id, parsed.data.status);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Failed to update order status:', error);
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
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, context);
}
