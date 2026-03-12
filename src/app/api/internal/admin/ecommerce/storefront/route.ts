/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / ecommerce / storefront.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/lib/server/ecommerce-storefront.ts
 * Role: admin private backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAdminEcommerceStorefront,
  saveEcommerceStorefront,
} from '@/lib/server/ecommerce-storefront';

export const runtime = 'nodejs';

const storefrontQuerySchema = z.object({
  companyId: z.coerce.number().int().positive().optional(),
  financialYear: z.coerce.string().trim().min(1).optional(),
});

const storefrontPayloadSchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
  storeTitle: z.string().trim().min(1, 'Store title is required'),
  storeSubtitle: z.string().trim().min(1, 'Store subtitle is required'),
  heroTitle: z.string().trim().min(1, 'Hero title is required'),
  heroSubtitle: z.string().trim().min(1, 'Hero subtitle is required'),
  heroCtaLabel: z.string().trim().min(1, 'Hero CTA label is required'),
  categoriesTitle: z.string().trim().min(1, 'Categories title is required'),
  catalogTitle: z.string().trim().min(1, 'Catalog title is required'),
  emptyStateTitle: z.string().trim().min(1, 'Empty state title is required'),
  emptyStateDescription: z.string().trim().min(1, 'Empty state description is required'),
  checkoutLoginTitle: z.string().trim().min(1, 'Checkout login title is required'),
  checkoutLoginDescription: z
    .string()
    .trim()
    .min(1, 'Checkout login description is required'),
  footerNote: z.string().trim().min(1, 'Footer note is required'),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = storefrontQuerySchema.safeParse({
      companyId: request.nextUrl.searchParams.get('companyId') ?? undefined,
      financialYear: request.nextUrl.searchParams.get('financialYear') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid storefront request.',
        },
        { status: 400 }
      );
    }

    const payload = await getAdminEcommerceStorefront(
      parsed.data.companyId,
      parsed.data.financialYear
    );

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Failed to load ecommerce storefront configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load ecommerce storefront configuration.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = storefrontPayloadSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid storefront payload.',
        },
        { status: 400 }
      );
    }

    const payload = await saveEcommerceStorefront(parsed.data);

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Failed to save ecommerce storefront configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save ecommerce storefront configuration.',
      },
      { status: 500 }
    );
  }
}
