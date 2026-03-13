/*
 * File Context:
 * Purpose: Handles the API route for api / orders.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/lib/server/order-db.ts, src/shared/types/index.ts
 * Role: shared backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createForbiddenPrivateApiResponse,
  createUnauthorizedPrivateApiResponse,
  getPrivateApiSession,
} from '@/app/api/_lib/private-api-session';
import {
  createStoredOrder,
  listStoredOrders,
} from '@/lib/server/order-db';
import { ORDER_STATUSES } from '@/shared/types';
import type { OrderStatus } from '@/shared/types';

export const runtime = 'nodejs';

interface CreateOrderBody {
  companyId?: number;
  financialYear?: string;
  customerId?: string;
  customerName?: string;
  customerState?: string;
  companyState?: string;
  saleTypeId?: string;
  saleTypeName?: string;
  voucherSeriesId?: string;
  voucherSeriesName?: string;
  materialCenterId?: string;
  materialCenterName?: string;
  createdBy?: string;
  createdByRole?: 'customer' | 'salesman' | 'admin';
  notes?: string;
  items?: Array<{
    productId?: string;
    productName?: string;
    productSku?: string;
    productUnit?: string;
    productUnitCode?: number;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
  }>;
}

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
    const searchParams = request.nextUrl.searchParams;
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
      customerId,
      createdBy,
      status: statuses?.length === 1 ? statuses[0] : undefined,
      statuses: statuses && statuses.length > 1 ? statuses : undefined,
    });

    return NextResponse.json({
      success: true,
      data: orders,
      metadata: {
        statuses: statuses ?? 'all',
        count: orders.length,
      },
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
    const session = await getPrivateApiSession(request);

    if (!session) {
      return createUnauthorizedPrivateApiResponse();
    }

    if (
      session.user.role !== 'admin' &&
      session.user.role !== 'customer' &&
      session.user.role !== 'salesman'
    ) {
      return createForbiddenPrivateApiResponse();
    }

    const body = (await request.json()) as CreateOrderBody;
    const currentUser = session.user;
    const effectiveCreatedBy = currentUser.id;
    const effectiveCreatedByRole = currentUser.role;

    if (
      !body.customerId ||
      !body.customerName ||
      !body.customerState ||
      !body.companyState ||
      !body.saleTypeId ||
      !body.saleTypeName ||
      !body.voucherSeriesId ||
      !body.voucherSeriesName ||
      !body.materialCenterId ||
      !body.materialCenterName ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Customer, sales type, voucher series, material center, creator, and at least one item are required.',
        },
        { status: 400 }
      );
    }

    if (effectiveCreatedByRole === 'customer' && body.customerId !== currentUser.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customers can only place orders for their own account.',
        },
        { status: 403 }
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

    const order = await createStoredOrder({
      companyId: body.companyId,
      financialYear: body.financialYear,
      customerId: body.customerId,
      customerName: body.customerName,
      customerState: body.customerState,
      companyState: body.companyState,
      saleTypeId: body.saleTypeId,
      saleTypeName: body.saleTypeName,
      voucherSeriesId: body.voucherSeriesId,
      voucherSeriesName: body.voucherSeriesName,
      materialCenterId: body.materialCenterId,
      materialCenterName: body.materialCenterName,
      createdBy: effectiveCreatedBy,
      createdByRole: effectiveCreatedByRole,
      notes: body.notes,
      items: body.items.map((item) => ({
        productId: item.productId as string,
        productName: item.productName as string,
        productSku: item.productSku as string,
        productUnit: item.productUnit?.trim() || undefined,
        productUnitCode: item.productUnitCode,
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
