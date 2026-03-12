import { NextResponse } from 'next/server';
import { getStoredOrderById } from '@/lib/server/order-db';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getStoredOrderById(id);

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
    console.error('Failed to fetch order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order.',
      },
      { status: 500 }
    );
  }
}
