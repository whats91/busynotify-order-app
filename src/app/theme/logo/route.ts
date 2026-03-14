/*
 * File Context:
 * Purpose: Handles the API route for theme / logo.
 * Primary Functionality: Resolves the currently uploaded theme logo to a stable URL used by the application shell.
 * Interlinked With: src/lib/server/theme-assets.ts, src/shared/components/app-shell.tsx
 * Role: shared backend.
 */
import { NextResponse } from 'next/server';
import { readThemeAsset } from '@/lib/server/theme-assets';

export const runtime = 'nodejs';

export async function GET() {
  const asset = await readThemeAsset('logo');

  if (!asset) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(asset.buffer, {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
