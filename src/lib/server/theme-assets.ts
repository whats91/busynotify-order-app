/*
 * File Context:
 * Purpose: Implements server-side infrastructure for Theme Assets.
 * Primary Functionality: Validates and persists admin-uploaded logo and icon files into the public theme directory.
 * Interlinked With: src/app/api/internal/admin/theme/route.ts, src/app/layout.tsx, src/shared/components/app-shell.tsx
 * Role: server infrastructure.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveProjectPath } from '@/lib/project-paths';
import type { ThemeAssetInfo, ThemeSettingsPayload } from '@/shared/types';

const THEME_DIR = resolveProjectPath('public', 'theme');
const assetKinds = ['logo', 'icon'] as const;
const assetExtensions = ['png', 'jpg', 'jpeg', 'svg'] as const;
const maxAssetSizeBytes = 5 * 1024 * 1024;

type ThemeAssetKind = (typeof assetKinds)[number];
type ThemeAssetExtension = (typeof assetExtensions)[number];

const mimeTypeToExtension: Record<string, ThemeAssetExtension> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg',
};

const fallbackAssetUrls: Record<ThemeAssetKind, string> = {
  logo: '/logo.svg',
  icon: '/logo.svg',
};

function getAppName() {
  return (
    process.env.APP_NAME?.trim() ||
    process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
    'Busy Notify'
  );
}

function getAppTitle(appName: string) {
  return (
    process.env.APP_TITLE?.trim() ||
    process.env.NEXT_PUBLIC_APP_TITLE?.trim() ||
    `${appName} - Internal Ordering Portal`
  );
}

async function ensureThemeDirectory() {
  await fs.mkdir(THEME_DIR, { recursive: true });
}

async function getExistingAssetPath(kind: ThemeAssetKind) {
  for (const extension of assetExtensions) {
    const filePath = path.join(THEME_DIR, `${kind}.${extension}`);

    try {
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        return {
          path: filePath,
          extension,
          updatedAt: stat.mtime.toISOString(),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function getThemeAsset(kind: ThemeAssetKind) {
  await ensureThemeDirectory();
  return getExistingAssetPath(kind);
}

function buildThemeAssetInfo(
  kind: ThemeAssetKind,
  currentAsset: {
    extension: ThemeAssetExtension;
    updatedAt: string;
  } | null
): ThemeAssetInfo {
  const fallbackUrl = fallbackAssetUrls[kind];
  const baseUrl = currentAsset ? `/theme/${kind}.${currentAsset.extension}` : fallbackUrl;

  return {
    kind,
    url: baseUrl,
    previewUrl: currentAsset
      ? `${baseUrl}?v=${encodeURIComponent(currentAsset.updatedAt)}`
      : fallbackUrl,
    extension: currentAsset?.extension ?? null,
    updatedAt: currentAsset?.updatedAt ?? null,
    fallbackUrl,
  };
}

function normalizeExtension(file: File): ThemeAssetExtension | null {
  const fileType = file.type.toLowerCase().trim();
  if (mimeTypeToExtension[fileType]) {
    return mimeTypeToExtension[fileType];
  }

  const fileExtension = path.extname(file.name).toLowerCase().replace('.', '');
  if (assetExtensions.includes(fileExtension as ThemeAssetExtension)) {
    return fileExtension as ThemeAssetExtension;
  }

  return null;
}

async function removeExistingAssetVariants(kind: ThemeAssetKind) {
  await Promise.all(
    assetExtensions.map(async (extension) => {
      const filePath = path.join(THEME_DIR, `${kind}.${extension}`);
      await fs.rm(filePath, { force: true });
    })
  );
}

export async function getThemeSettingsPayload(): Promise<ThemeSettingsPayload> {
  await ensureThemeDirectory();

  const [logoAsset, iconAsset] = await Promise.all([
    getExistingAssetPath('logo'),
    getExistingAssetPath('icon'),
  ]);

  const appName = getAppName();

  return {
    appName,
    appTitle: getAppTitle(appName),
    logo: buildThemeAssetInfo('logo', logoAsset),
    icon: buildThemeAssetInfo('icon', iconAsset),
    supportedFormats: assetExtensions.map((extension) => extension.toUpperCase()),
  };
}

export async function saveThemeAsset(kind: ThemeAssetKind, file: File) {
  const extension = normalizeExtension(file);

  if (!extension) {
    throw new Error(`${kind} must be a PNG, JPG, JPEG, or SVG file.`);
  }

  if (file.size <= 0) {
    throw new Error(`${kind} upload is empty.`);
  }

  if (file.size > maxAssetSizeBytes) {
    throw new Error(`${kind} exceeds the 5 MB upload limit.`);
  }

  await ensureThemeDirectory();
  await removeExistingAssetVariants(kind);

  const buffer = Buffer.from(await file.arrayBuffer());
  const targetPath = path.join(THEME_DIR, `${kind}.${extension}`);
  await fs.writeFile(targetPath, buffer);
}
