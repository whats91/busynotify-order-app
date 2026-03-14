/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / order number configuration.
 * Primary Functionality: Lets admins define company-scoped order-number formatting and preview the next generated value.
 * Interlinked With: src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/input.tsx, src/components/ui/select.tsx, src/components/ui/switch.tsx, src/shared/lib/order-number-format.ts, src/versions/v1/services/order-number-config.service.ts
 * Role: admin-facing UI.
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useAuthStore, useCompanyStore, useHasHydrated } from '@/shared/lib/stores';
import { buildOrderNumberPreview } from '@/shared/lib/order-number-format';
import type {
  OrderNumberConfig,
  OrderNumberSerialPosition,
} from '@/shared/types';
import { orderNumberConfigService } from '@/versions/v1/services';

function buildOrderNumberConfigSignature(config: OrderNumberConfig | null) {
  if (!config) {
    return '';
  }

  return JSON.stringify([
    config.companyId,
    config.financialYear,
    config.prefix,
    config.suffix,
    config.separator,
    config.includeYear,
    config.includeMonth,
    config.includeDay,
    config.serialPosition,
    config.serialPadding,
  ]);
}

function formatSerialPositionLabel(value: OrderNumberSerialPosition) {
  switch (value) {
    case 'start':
      return 'At Start';
    case 'afterPrefix':
      return 'After Prefix';
    case 'end':
      return 'At End';
    case 'beforeSuffix':
    default:
      return 'Before Suffix';
  }
}

export default function AdminOrderNumberConfigurationPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  const hasHydrated = useHasHydrated();

  const [config, setConfig] = useState<OrderNumberConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<OrderNumberConfig | null>(null);
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
    }
  }, [hasHydrated, isAuthenticated, user]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || user?.role !== 'admin') {
      return;
    }

    if (!selectedCompany) {
      setConfig(null);
      setSavedConfig(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    void loadConfiguration(selectedCompany.companyId, selectedCompany.financialYear);
  }, [hasHydrated, isAuthenticated, selectedCompany, user]);

  const isDirty = useMemo(
    () => buildOrderNumberConfigSignature(config) !== buildOrderNumberConfigSignature(savedConfig),
    [config, savedConfig]
  );

  const previewValue = useMemo(() => {
    if (!config) {
      return '';
    }

    return buildOrderNumberPreview(config);
  }, [config]);

  const loadConfiguration = async (companyId: number, financialYear: string) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const saved = await orderNumberConfigService.getOrderNumberConfig(companyId, financialYear);
      setConfig(saved);
      setSavedConfig(saved);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load order number configuration.';
      setConfig(null);
      setSavedConfig(null);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = <K extends keyof OrderNumberConfig>(
    key: K,
    value: OrderNumberConfig[K]
  ) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const handleSave = async () => {
    if (!config) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await orderNumberConfigService.updateOrderNumberConfig({
        companyId: config.companyId,
        financialYear: config.financialYear,
        prefix: config.prefix,
        suffix: config.suffix,
        separator: config.separator,
        includeYear: config.includeYear,
        includeMonth: config.includeMonth,
        includeDay: config.includeDay,
        serialPosition: config.serialPosition,
        serialPadding: config.serialPadding,
      });

      if (!result.success || !result.config) {
        throw new Error(result.error || 'Failed to save order number configuration.');
      }

      setConfig(result.config);
      setSavedConfig(result.config);
      toast({
        title: 'Order number configuration saved',
        description: 'New orders will use the updated pattern for the active company.',
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
            <h1 className="text-2xl font-bold tracking-tight">Order Number Configuration</h1>
            <p className="text-muted-foreground">
              Define the order-number pattern used for the selected company.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                selectedCompany
                  ? void loadConfiguration(
                      selectedCompany.companyId,
                      selectedCompany.financialYear
                    )
                  : undefined
              }
              disabled={!selectedCompany || isSaving}
            >
              Refresh
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || isSaving || !selectedCompany}>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border bg-muted/30 p-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Pattern Builder</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Prefix, suffix, date segments, and serial placement are saved per company.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedCompany ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Select a company from the sidebar to manage the order-number format.
              </div>
            ) : isLoading ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved order-number configuration...
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : config ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="order-number-prefix">Prefix</Label>
                    <Input
                      id="order-number-prefix"
                      value={config.prefix}
                      onChange={(event) => handleFieldChange('prefix', event.target.value)}
                      placeholder="ORD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-number-suffix">Suffix</Label>
                    <Input
                      id="order-number-suffix"
                      value={config.suffix}
                      onChange={(event) => handleFieldChange('suffix', event.target.value)}
                      placeholder="Leave blank if not needed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-number-separator">Separator</Label>
                    <Input
                      id="order-number-separator"
                      value={config.separator}
                      onChange={(event) => handleFieldChange('separator', event.target.value)}
                      placeholder="-"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-number-padding">Serial Padding</Label>
                    <Input
                      id="order-number-padding"
                      type="number"
                      min={1}
                      max={10}
                      value={config.serialPadding}
                      onChange={(event) =>
                        handleFieldChange(
                          'serialPadding',
                          Math.min(10, Math.max(1, Number(event.target.value) || 1))
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="space-y-4 rounded-xl border p-4">
                    <div className="space-y-2">
                      <Label>Serial Position</Label>
                      <Select
                        value={config.serialPosition}
                        onValueChange={(value) =>
                          handleFieldChange(
                            'serialPosition',
                            value as OrderNumberSerialPosition
                          )
                        }
                      >
                        <SelectTrigger className="w-full md:w-60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">
                            {formatSerialPositionLabel('start')}
                          </SelectItem>
                          <SelectItem value="afterPrefix">
                            {formatSerialPositionLabel('afterPrefix')}
                          </SelectItem>
                          <SelectItem value="beforeSuffix">
                            {formatSerialPositionLabel('beforeSuffix')}
                          </SelectItem>
                          <SelectItem value="end">
                            {formatSerialPositionLabel('end')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">Year</p>
                          <p className="text-xs text-muted-foreground">Adds YYYY</p>
                        </div>
                        <Switch
                          checked={config.includeYear}
                          onCheckedChange={(checked) =>
                            handleFieldChange('includeYear', checked)
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">Month</p>
                          <p className="text-xs text-muted-foreground">Adds MM</p>
                        </div>
                        <Switch
                          checked={config.includeMonth}
                          onCheckedChange={(checked) =>
                            handleFieldChange('includeMonth', checked)
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">Day</p>
                          <p className="text-xs text-muted-foreground">Adds DD</p>
                        </div>
                        <Switch
                          checked={config.includeDay}
                          onCheckedChange={(checked) =>
                            handleFieldChange('includeDay', checked)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-sm font-medium">Next Order Number Preview</p>
                    <p className="mt-3 break-all rounded-lg border bg-background px-4 py-3 text-lg font-semibold tracking-wide">
                      {previewValue || 'Pattern preview unavailable'}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Current serial: {config.lastSerial}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      The next created order for this company will use this structure.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
