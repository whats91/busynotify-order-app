import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deleteSalesman,
  getSalesmanById,
  updateSalesman,
} from '@/lib/server/salesmen-db';

export const runtime = 'nodejs';

const updateSalesmanSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters long').optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').optional(),
  password: z.union([z.string().min(6, 'Password must be at least 6 characters long'), z.literal('')]).optional(),
  email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
  phone: z.union([z.string().trim().min(10, 'Phone must be at least 10 digits'), z.literal('')]).optional(),
  isActive: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const salesman = await getSalesmanById(id);

    if (!salesman) {
      return NextResponse.json(
        {
          success: false,
          error: 'Salesman not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: salesman,
    });
  } catch (error) {
    console.error('Failed to fetch salesman:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch salesman.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsed = updateSalesmanSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid salesman update payload.',
        },
        { status: 400 }
      );
    }

    const payload = {
      ...parsed.data,
      password: parsed.data.password || undefined,
    };

    const salesman = await updateSalesman(id, payload);

    if (!salesman) {
      return NextResponse.json(
        {
          success: false,
          error: 'Salesman not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: salesman,
    });
  } catch (error) {
    console.error('Failed to update salesman:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update salesman.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteSalesman(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Salesman not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete salesman:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete salesman.',
      },
      { status: 500 }
    );
  }
}
