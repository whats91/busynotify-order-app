// =====================================================
// PRODUCTS API ROUTE - Fetch product list from external API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiBaseUrl = process.env.API_BASE_URL;
    const authToken = process.env.API_AUTH_TOKEN;

    if (!apiBaseUrl || !authToken) {
      return NextResponse.json(
        { success: false, error: 'API configuration missing' },
        { status: 500 }
      );
    }

    // Get companyId and financialYear from request body
    const body = await request.json();
    const { companyId, financialYear } = body;

    if (!companyId || !financialYear) {
      return NextResponse.json(
        { success: false, error: 'companyId and financialYear are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authToken: authToken,
        companyId: companyId,
        financialYear: financialYear,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch products' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
