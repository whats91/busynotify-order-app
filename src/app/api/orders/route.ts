import { NextRequest, NextResponse } from 'next/server';
import {
  createStoredOrder,
  listStoredOrders,
} from '@/lib/server/order-db';
import type { OrderStatus } from '@/shared/types';

export const runtime = 'nodejs';

interface CreateOrderBody {
  companyId?: number;
  financialYear?: string;
  customerId?: string;
  customerName?: string;
  createdBy?: string;
  createdByRole?: 'customer' | 'salesman' | 'admin';
  notes?: string;
  items?: Array<{
    productId?: string;
    productName?: string;
    productSku?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId') || undefined;
    const createdBy = searchParams.get('createdBy') || undefined;
    const status = (searchParams.get('status') || undefined) as OrderStatus | undefined;

    const orders = listStoredOrders({
      customerId,
      createdBy,
      status,
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody;

    if (
      !body.customerId ||
      !body.customerName ||
      !body.createdBy ||
      !body.createdByRole ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer, creator, and at least one item are required.',
        },
        { status: 400 }
      );
    }

    const invalidItem = body.items.find(
      (item) =>
        !item.productId ||
        !item.productName ||
        !item.productSku ||
        !item.quantity ||
        item.quantity <= 0 ||
        item.unitPrice == null ||
        item.unitPrice < 0
    );

    if (invalidItem) {
      return NextResponse.json(
        {
          success: false,
          error: 'All order items must include product details, quantity, and price.',
        },
        { status: 400 }
      );
    }

    const order = createStoredOrder({
      companyId: body.companyId,
      financialYear: body.financialYear,
      customerId: body.customerId,
      customerName: body.customerName,
      createdBy: body.createdBy,
      createdByRole: body.createdByRole,
      notes: body.notes,
      items: body.items.map((item) => ({
        productId: item.productId as string,
        productName: item.productName as string,
        productSku: item.productSku as string,
        quantity: item.quantity as number,
        unitPrice: item.unitPrice as number,
        taxRate: item.taxRate ?? 18,
      })),
    });

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Failed to create order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order.',
      },
      { status: 500 }
    );
  }
}
