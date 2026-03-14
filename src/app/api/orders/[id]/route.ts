/*
 * File Context:
 * Purpose: Handles the API route for api / orders / :id.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/lib/server/order-db.ts
 * Role: shared backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  createForbiddenPrivateApiResponse,
  createUnauthorizedPrivateApiResponse,
  getPrivateApiSession,
} from '@/app/api/_lib/private-api-session';
import { deleteStoredOrder, getStoredOrderById } from '@/lib/server/order-db';

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPrivateApiSession(request);

    if (!session) {
      return createUnauthorizedPrivateApiResponse();
    }

    if (session.user.role !== 'admin') {
      return createForbiddenPrivateApiResponse();
    }

    const { id } = await params;
    const wasDeleted = await deleteStoredOrder(id);

    if (!wasDeleted) {
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
    });
  } catch (error) {
    console.error('Failed to delete order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete order.',
      },
      { status: 500 }
    );
  }
}
