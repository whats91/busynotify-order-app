/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / ecommerce / pages.
 * Primary Functionality: Returns seeded e-commerce markdown pages for a selected company and financial year.
 * Interlinked With: src/lib/server/ecommerce-storefront.ts, src/app/admin/ecommerce/pages/page.tsx
 * Role: admin private backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoredEcommercePages } from '@/lib/server/ecommerce-storefront';

export const runtime = 'nodejs';

const querySchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      companyId: request.nextUrl.searchParams.get('companyId') ?? undefined,
      financialYear: request.nextUrl.searchParams.get('financialYear') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid ecommerce pages request.',
        },
        { status: 400 }
      );
    }

    const data = await getStoredEcommercePages(
      parsed.data.companyId,
      parsed.data.financialYear
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to load ecommerce pages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load ecommerce pages.',
      },
      { status: 500 }
    );
  }
}
