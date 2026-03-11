// =====================================================
// COMPANIES API ROUTE - Fetch company list from external API
// =====================================================

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiBaseUrl = process.env.API_BASE_URL;
    const authToken = process.env.API_AUTH_TOKEN;

    if (!apiBaseUrl || !authToken) {
      return NextResponse.json(
        { success: false, error: 'API configuration missing' },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authToken: authToken,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch companies' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
