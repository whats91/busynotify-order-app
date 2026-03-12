import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listProductFieldConfig, updateProductFieldConfig } from '@/lib/server/product-config-db';
import { PRODUCT_FIELD_KEYS } from '@/shared/types';

export const runtime = 'nodejs';

const updateProductFieldConfigSchema = z.object({
  config: z
    .array(
      z.object({
        fieldKey: z.enum(PRODUCT_FIELD_KEYS),
        isVisible: z.boolean(),
      })
    )
    .min(1, 'At least one field update is required.'),
});

export async function GET() {
  try {
    const config = await listProductFieldConfig();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to load product field configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load product field configuration.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = updateProductFieldConfigSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid product configuration payload.',
        },
        { status: 400 }
      );
    }

    const config = await updateProductFieldConfig(parsed.data.config);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to update product field configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update product field configuration.',
      },
      { status: 500 }
    );
  }
}
