/*
 * File Context:
 * Purpose: Handles the API route for api / admin / salesmen.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/lib/server/salesmen-db.ts
 * Role: admin backend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSalesman, listSalesmen } from '@/lib/server/salesmen-db';

export const runtime = 'nodejs';

const createSalesmanSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters long'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
  phone: z.union([z.string().trim().min(10, 'Phone must be at least 10 digits'), z.literal('')]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const salesmen = await listSalesmen();
    return NextResponse.json({
      success: true,
      data: salesmen,
    });
  } catch (error) {
    console.error('Failed to list salesmen:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load salesmen.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = createSalesmanSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid salesman payload.',
        },
        { status: 400 }
      );
    }

    const salesman = await createSalesman(parsed.data);

    return NextResponse.json({
      success: true,
      data: salesman,
    });
  } catch (error) {
    console.error('Failed to create salesman:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create salesman.',
      },
      { status: 500 }
    );
  }
}
