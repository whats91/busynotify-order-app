/*
 * File Context:
 * Purpose: Handles the API route for theme / icon.
 * Primary Functionality: Resolves the currently uploaded theme icon to a stable URL used by browser metadata and favicon links.
 * Interlinked With: src/lib/server/theme-assets.ts, src/app/layout.tsx
 * Role: shared backend.
 */
import { NextResponse } from 'next/server';
import { readThemeAsset } from '@/lib/server/theme-assets';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const asset = await readThemeAsset('icon');

  if (!asset) {
    return NextResponse.redirect(new URL('/logo.svg', request.url), 307);
  }

  return new NextResponse(asset.buffer, {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
