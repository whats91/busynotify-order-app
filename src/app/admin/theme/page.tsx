'use client';

/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / theme.
 * Primary Functionality: Lets admins review runtime branding values and upload the current logo and icon assets.
 * Interlinked With: src/app/api/internal/admin/theme/route.ts, src/shared/components/app-shell.tsx, src/shared/lib/app-config-context.tsx
 * Role: admin-facing UI.
 */
import { useEffect, useState } from 'react';
import { ImageIcon, Loader2, Palette, Upload } from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
import { useAppConfig } from '@/shared/lib/app-config-context';
import { THEME_ASSETS_UPDATED_EVENT } from '@/shared/lib/theme-asset-events';
import { useAuthStore, useHasHydrated } from '@/shared/lib/stores';
import { toast } from '@/hooks/use-toast';
import type { ThemeSettingsPayload } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ThemeApiResponse {
  success: boolean;
  data?: ThemeSettingsPayload;
  error?: string;
}

const uploadAccept = '.png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml';

async function loadThemeSettings() {
  const response = await fetch('/api/internal/admin/theme', {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  const result = (await response.json()) as ThemeApiResponse;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error || 'Failed to load theme settings.');
  }

  return result.data;
}

export default function AdminThemePage() {
  const { appName, appTitle } = useAppConfig();
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();

  const [settings, setSettings] = useState<ThemeSettingsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated || !user) {
      window.location.href = '/staff-login';
      return;
    }

    if (user.role !== 'admin') {
      window.location.href = '/dashboard';
      return;
    }

    void bootstrapPage();
  }, [hasHydrated, isAuthenticated, user]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  useEffect(() => {
    if (!iconFile) {
      setIconPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(iconFile);
    setIconPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [iconFile]);

  const bootstrapPage = async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const data = await loadThemeSettings();
      setSettings(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load theme settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!logoFile && !iconFile) {
      toast({
        title: 'Nothing to upload',
        description: 'Choose a logo, an icon, or both before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      if (iconFile) {
        formData.append('icon', iconFile);
      }

      const response = await fetch('/api/internal/admin/theme', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      const result = (await response.json()) as ThemeApiResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to update theme assets.');
      }

      setSettings(result.data);
      setLogoFile(null);
      setIconFile(null);
      window.dispatchEvent(new Event(THEME_ASSETS_UPDATED_EVENT));

      toast({
        title: 'Theme updated',
        description: 'The new logo and icon are now available in the app.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to update theme assets.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentLogoPreview =
    logoPreviewUrl || settings?.logo.previewUrl || settings?.logo.fallbackUrl || '/logo.svg';
  const currentIconPreview =
    iconPreviewUrl || settings?.icon.previewUrl || settings?.icon.fallbackUrl || '/logo.svg';

  return (
    <AppShell contentClassName="bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-2">
              <Palette className="h-3.5 w-3.5" />
              Theme
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Brand Assets</h1>
              <p className="text-sm text-muted-foreground">
                Upload the current logo and browser icon. These files are stored in the
                public theme folder with stable basenames.
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving || (!logoFile && !iconFile)}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Save Theme Assets
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Application Branding</CardTitle>
              <CardDescription>
                These values are read from your server `.env` configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="theme-app-name">App Name</Label>
                <Input
                  id="theme-app-name"
                  value={settings?.appName || appName}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-app-title">App Title</Label>
                <Input
                  id="theme-app-title"
                  value={settings?.appTitle || appTitle}
                  readOnly
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Supported Formats</Label>
                <div className="flex flex-wrap gap-2">
                  {(settings?.supportedFormats || ['PNG', 'JPG', 'JPEG', 'SVG']).map(
                    (format) => (
                      <Badge key={format} variant="outline">
                        {format}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Assets</CardTitle>
              <CardDescription>
                Preview the active logo and icon before updating them.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Logo Preview</Label>
                <div className="flex h-32 items-center justify-center rounded-xl border bg-background p-4">
                  <img
                    src={currentLogoPreview}
                    alt="Current logo preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Icon Preview</Label>
                <div className="flex h-32 items-center justify-center rounded-xl border bg-background p-4">
                  <img
                    src={currentIconPreview}
                    alt="Current icon preview"
                    className="h-20 w-20 rounded-xl object-contain"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Logo Upload</CardTitle>
              <CardDescription>
                Saved into `public/theme/` as `logo.ext` using the file format you upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme-logo-upload">Choose Logo</Label>
                <Input
                  id="theme-logo-upload"
                  type="file"
                  accept={uploadAccept}
                  onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                />
              </div>
              <div className="rounded-xl border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
                Use PNG, JPG, JPEG, or SVG. Re-uploading replaces the previous logo file.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Icon Upload</CardTitle>
              <CardDescription>
                Saved into `public/theme/` as `icon.ext` using the file format you upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme-icon-upload">Choose Icon</Label>
                <Input
                  id="theme-icon-upload"
                  type="file"
                  accept={uploadAccept}
                  onChange={(event) => setIconFile(event.target.files?.[0] || null)}
                />
              </div>
              <div className="rounded-xl border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
                Use PNG, JPG, JPEG, or SVG. The browser favicon updates from the same
                uploaded asset set.
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && pageError ? (
          <Card>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Theme settings failed to load</p>
                <p className="text-sm text-muted-foreground">{pageError}</p>
              </div>
              <Button variant="outline" onClick={() => void bootstrapPage()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
