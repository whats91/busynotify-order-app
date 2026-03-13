/*
 * File Context:
 * Purpose: Handles the API route for theme / icon.
 * Primary Functionality: Resolves the currently uploaded theme icon to a stable URL used by browser metadata and favicon links.
 * Interlinked With: src/lib/server/theme-assets.ts, src/app/layout.tsx
 * Role: shared backend.
 */
import { NextResponse } from 'next/server';
import { getThemeAsset } from '@/lib/server/theme-assets';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const asset = await getThemeAsset('icon');
  const targetPath = asset ? `/theme/icon.${asset.extension}` : '/logo.svg';

  return NextResponse.redirect(new URL(targetPath, request.url), 307);
}
