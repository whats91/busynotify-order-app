/*
 * File Context:
 * Purpose: Handles the API route for theme / logo.
 * Primary Functionality: Resolves the currently uploaded theme logo to a stable URL used by the application shell.
 * Interlinked With: src/lib/server/theme-assets.ts, src/shared/components/app-shell.tsx
 * Role: shared backend.
 */
import { NextResponse } from 'next/server';
import { getThemeAsset } from '@/lib/server/theme-assets';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const asset = await getThemeAsset('logo');

  if (!asset) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(new URL(`/theme/logo.${asset.extension}`, request.url), 307);
}
