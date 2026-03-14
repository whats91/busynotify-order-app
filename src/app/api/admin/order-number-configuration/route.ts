/*
 * File Context:
 * Purpose: Handles the API route for api / admin / order number configuration.
 * Primary Functionality: Loads and saves company-scoped order-number formatting rules for admins.
 * Interlinked With: src/lib/server/order-number-config-db.ts, src/shared/types/index.ts
 * Role: admin backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrderNumberConfig, upsertOrderNumberConfig } from '@/lib/server/order-number-config-db';
import { ORDER_NUMBER_SERIAL_POSITIONS } from '@/shared/types';

export const runtime = 'nodejs';

const orderNumberConfigQuerySchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

const orderNumberConfigSchema = orderNumberConfigQuerySchema.extend({
  prefix: z.coerce.string().trim().max(30, 'Prefix must be 30 characters or fewer'),
  suffix: z.coerce.string().trim().max(30, 'Suffix must be 30 characters or fewer'),
  separator: z.coerce
    .string()
    .max(5, 'Separator must be 5 characters or fewer'),
  includeYear: z.coerce.boolean(),
  includeMonth: z.coerce.boolean(),
  includeDay: z.coerce.boolean(),
  serialPosition: z.enum(ORDER_NUMBER_SERIAL_POSITIONS),
  serialPadding: z.coerce
    .number()
    .int()
    .min(1, 'Serial padding must be at least 1')
    .max(10, 'Serial padding must be 10 or fewer'),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = orderNumberConfigQuerySchema.safeParse({
      companyId: request.nextUrl.searchParams.get('companyId'),
      financialYear: request.nextUrl.searchParams.get('financialYear'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message ||
            'Invalid order number configuration request.',
        },
        { status: 400 }
      );
    }

    const config = await getOrderNumberConfig(
      parsed.data.companyId,
      parsed.data.financialYear
    );

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to load order number configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load order number configuration.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = orderNumberConfigSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message ||
            'Invalid order number configuration payload.',
        },
        { status: 400 }
      );
    }

    const config = await upsertOrderNumberConfig(parsed.data);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to update order number configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update order number configuration.',
      },
      { status: 500 }
    );
  }
}
