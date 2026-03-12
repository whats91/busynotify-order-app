/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / product configuration.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/switch.tsx, src/hooks/use-toast.ts
 * Role: admin-facing UI.
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, SlidersHorizontal } from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
import { defaultProductFieldConfig } from '@/shared/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useAuthStore, useHasHydrated } from '@/shared/lib/stores';
import type { ProductFieldConfig, ProductFieldKey } from '@/shared/types';
import { productConfigService } from '@/versions/v1/services';

function buildConfigSignature(config: ProductFieldConfig[]) {
  return JSON.stringify(
    [...config]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((field) => [field.fieldKey, field.isVisible])
  );
}

export default function AdminProductConfigurationPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();

  const [config, setConfig] = useState<ProductFieldConfig[]>(defaultProductFieldConfig);
  const [savedConfig, setSavedConfig] = useState<ProductFieldConfig[]>(defaultProductFieldConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

    void loadConfig();
  }, [hasHydrated, isAuthenticated, user]);

  const visibleFields = useMemo(
    () => config.filter((field) => field.isVisible).length,
    [config]
  );
  const hiddenFields = config.length - visibleFields;
  const isDirty = useMemo(
    () => buildConfigSignature(config) !== buildConfigSignature(savedConfig),
    [config, savedConfig]
  );

  const loadConfig = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const records = await productConfigService.getProductFieldConfig();
      setConfig(records);
      setSavedConfig(records);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load product configuration.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (fieldKey: ProductFieldKey, isVisible: boolean) => {
    setConfig((current) =>
      current.map((field) => (field.fieldKey === fieldKey ? { ...field, isVisible } : field))
    );
  };

  const handleResetDefaults = () => {
    setConfig(defaultProductFieldConfig);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const result = await productConfigService.updateProductFieldConfig(
        config.map((field) => ({
          fieldKey: field.fieldKey,
          isVisible: field.isVisible,
        }))
      );

      if (!result.success || !result.config) {
        throw new Error(result.error || 'Failed to update product configuration.');
      }

      setConfig(result.config);
      setSavedConfig(result.config);
      toast({
        title: 'Configuration saved',
        description: 'Order page product fields will now follow this visibility setup.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasHydrated || !isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Product Configuration</h1>
            <p className="text-muted-foreground">
              Control which product details appear on the order page cards.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={handleResetDefaults} disabled={isSaving}>
              Reset Defaults
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Configured Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{config.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Visible Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visibleFields}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hidden Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hiddenFields}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border bg-muted/30 p-2">
                <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Field Visibility</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Toggle fields on or off to control what customers and salesmen see.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void loadConfig()}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : (
              <div className="space-y-3">
                {config.map((field) => (
                  <div
                    key={field.fieldKey}
                    className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{field.label}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {field.fieldKey}
                        </span>
                      </div>
                      {field.description ? (
                        <p className="text-sm text-muted-foreground">{field.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:min-w-[12rem] sm:justify-end">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {field.isVisible ? (
                          <>
                            <Eye className="h-4 w-4" />
                            Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Hidden
                          </>
                        )}
                      </div>
                      <Switch
                        checked={field.isVisible}
                        disabled={isSaving}
                        onCheckedChange={(checked) => handleToggle(field.fieldKey, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
