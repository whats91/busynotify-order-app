import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getVoucherSeriesConfig,
  upsertVoucherSeriesConfig,
} from '@/lib/server/voucher-series-config-db';

export const runtime = 'nodejs';

const voucherSeriesConfigQuerySchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

const voucherSeriesConfigSchema = voucherSeriesConfigQuerySchema.extend({
  voucherSeriesId: z.string().trim().min(1, 'Voucher series is required'),
  voucherSeriesName: z.string().trim().min(1, 'Voucher series name is required'),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = voucherSeriesConfigQuerySchema.safeParse({
      companyId: request.nextUrl.searchParams.get('companyId'),
      financialYear: request.nextUrl.searchParams.get('financialYear'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || 'Invalid voucher series configuration request.',
        },
        { status: 400 }
      );
    }

    const config = await getVoucherSeriesConfig(parsed.data.companyId, parsed.data.financialYear);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to load voucher series configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load voucher series configuration.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const parsed = voucherSeriesConfigSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || 'Invalid voucher series configuration payload.',
        },
        { status: 400 }
      );
    }

    const config = await upsertVoucherSeriesConfig(parsed.data);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to update voucher series configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update voucher series configuration.',
      },
      { status: 500 }
    );
  }
}
