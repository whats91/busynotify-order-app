/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / ecommerce / pages / :slug.
 * Primary Functionality: Updates the title and markdown content for a specific seeded ecommerce page.
 * Interlinked With: src/lib/server/ecommerce-storefront.ts, src/app/admin/ecommerce/pages/page.tsx
 * Role: admin private backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveEcommerceContentPage } from '@/lib/server/ecommerce-storefront';

export const runtime = 'nodejs';

const payloadSchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
  title: z.string().trim().min(1, 'Page title is required'),
  contentMarkdown: z.string().trim().min(1, 'Markdown content is required'),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const parsed = payloadSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid ecommerce page payload.',
        },
        { status: 400 }
      );
    }

    const data = await saveEcommerceContentPage({
      companyId: parsed.data.companyId,
      financialYear: parsed.data.financialYear,
      slug,
      title: parsed.data.title,
      contentMarkdown: parsed.data.contentMarkdown,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to save ecommerce page:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save ecommerce page.',
      },
      { status: 500 }
    );
  }
}
