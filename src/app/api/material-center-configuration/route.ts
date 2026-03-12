import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createForbiddenPrivateApiResponse,
  createUnauthorizedPrivateApiResponse,
  getPrivateApiSession,
} from '@/app/api/_lib/private-api-session';
import {
  getMaterialCenterConfig,
  upsertMaterialCenterConfig,
} from '@/lib/server/material-center-config-db';

export const runtime = 'nodejs';

const materialCenterConfigQuerySchema = z.object({
  companyId: z.coerce.number().int().positive('companyId is required'),
  financialYear: z.coerce.string().trim().min(1, 'financialYear is required'),
});

const materialCenterConfigSchema = materialCenterConfigQuerySchema.extend({
  materialCenterId: z.string().trim().min(1, 'Material center is required'),
  materialCenterName: z.string().trim().min(1, 'Material center name is required'),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = materialCenterConfigQuerySchema.safeParse({
      companyId: request.nextUrl.searchParams.get('companyId'),
      financialYear: request.nextUrl.searchParams.get('financialYear'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || 'Invalid material center configuration request.',
        },
        { status: 400 }
      );
    }

    const config = await getMaterialCenterConfig(
      parsed.data.companyId,
      parsed.data.financialYear
    );

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to load material center configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load material center configuration.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getPrivateApiSession(request);

    if (!session) {
      return createUnauthorizedPrivateApiResponse();
    }

    if (session.user.role !== 'admin') {
      return createForbiddenPrivateApiResponse();
    }

    const parsed = materialCenterConfigSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || 'Invalid material center configuration payload.',
        },
        { status: 400 }
      );
    }

    const config = await upsertMaterialCenterConfig(parsed.data);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Failed to update material center configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update material center configuration.',
      },
      { status: 500 }
    );
  }
}
