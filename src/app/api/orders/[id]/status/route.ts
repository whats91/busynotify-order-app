import { NextResponse } from 'next/server';
import { updateStoredOrderStatus } from '@/lib/server/order-db';
import type { OrderStatus } from '@/shared/types';

export const runtime = 'nodejs';

interface UpdateOrderStatusBody {
  status?: OrderStatus;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = (await request.json()) as UpdateOrderStatusBody;
    const { id } = await params;

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order status is required.',
        },
        { status: 400 }
      );
    }

    const order = updateStoredOrderStatus(id, body.status);

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
