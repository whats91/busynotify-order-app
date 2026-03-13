/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / theme.
 * Primary Functionality: Returns current admin branding settings and persists uploaded logo or icon files.
 * Interlinked With: src/lib/server/theme-assets.ts, src/app/admin/theme/page.tsx
 * Role: admin private backend.
 */
import { NextResponse } from 'next/server';
import {
  getThemeSettingsPayload,
  saveThemeAsset,
} from '@/lib/server/theme-assets';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getThemeSettingsPayload();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load theme settings.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const logo = formData.get('logo');
    const icon = formData.get('icon');

    if (!(logo instanceof File) && !(icon instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upload a logo, an icon, or both.',
        },
        { status: 400 }
      );
    }

    if (logo instanceof File) {
      await saveThemeAsset('logo', logo);
    }

    if (icon instanceof File) {
      await saveThemeAsset('icon', icon);
    }

    const data = await getThemeSettingsPayload();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update theme assets.',
      },
      { status: 500 }
    );
  }
}
