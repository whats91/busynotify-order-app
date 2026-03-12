/*
 * File Context:
 * Purpose: Handles the API route for api / admin / sales type configuration.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/lib/server/sales-type-config-db.ts
 * Role: admin backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSalesTypeConfig,
  upsertSalesTypeConfig,
} from '@/lib/server/sales-type-config-db';

export const runtime = 'nodejs';

const salesTypeConfigQuerySchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

const salesTypeConfigSchema = salesTypeConfigQuerySchema.extend({
  companyState: z.string().trim().min(1, 'Company state is required'),
  sameStateSaleTypeId: z.string().trim().min(1, 'Same-state sale type is required'),
  sameStateSaleTypeName: z.string().trim().min(1, 'Same-state sale type name is required'),
  interstateSaleTypeId: z.string().trim().min(1, 'Interstate sale type is required'),
  interstateSaleTypeName: z.string().trim().min(1, 'Interstate sale type name is required'),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = salesTypeConfigQuerySchema.safeParse({
      companyId: request.nextUrl.searchParams.get('companyId'),
      financialYear: request.nextUrl.searchParams.get('financialYear'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid sales type configuration request.',
        },
        { status: 400 }
      );
    }

    const config = await getSalesTypeConfig(parsed.data.companyId, parsed.data.financialYear);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to load sales type configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load sales type configuration.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = salesTypeConfigSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || 'Invalid sales type configuration payload.',
        },
        { status: 400 }
      );
    }

    const config = await upsertSalesTypeConfig(parsed.data);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to update sales type configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update sales type configuration.',
      },
      { status: 500 }
    );
  }
}
