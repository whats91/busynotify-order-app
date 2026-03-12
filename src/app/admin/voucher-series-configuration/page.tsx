/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / voucher series configuration.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/label.tsx, src/components/ui/select.tsx
 * Role: admin-facing UI.
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuthStore, useCompanyStore, useHasHydrated } from '@/shared/lib/stores';
import type { VoucherSeries, VoucherSeriesConfig } from '@/shared/types';
import {
  voucherSeriesConfigService,
  voucherSeriesService,
} from '@/versions/v1/services';

function buildVoucherSeriesConfigSignature(config: VoucherSeriesConfig | null) {
  if (!config) {
    return '';
  }

  return JSON.stringify([
    config.companyId,
    config.financialYear,
    config.voucherSeriesId,
    config.voucherSeriesName,
  ]);
}

function createEmptyVoucherSeriesConfig(
  companyId: number,
  financialYear: string
): VoucherSeriesConfig {
  return {
    companyId,
    financialYear,
    voucherSeriesId: '',
    voucherSeriesName: '',
  };
}

export default function AdminVoucherSeriesConfigurationPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  const hasHydrated = useHasHydrated();

  const [voucherSeries, setVoucherSeries] = useState<VoucherSeries[]>([]);
  const [config, setConfig] = useState<VoucherSeriesConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<VoucherSeriesConfig | null>(null);
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
      setVoucherSeries([]);
      setConfig(null);
      setSavedConfig(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    void loadConfiguration(selectedCompany.companyId, selectedCompany.financialYear);
  }, [hasHydrated, isAuthenticated, selectedCompany, user]);

  const isDirty = useMemo(
    () => buildVoucherSeriesConfigSignature(config) !== buildVoucherSeriesConfigSignature(savedConfig),
    [config, savedConfig]
  );

  const loadConfiguration = async (companyId: number, financialYear: string) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [series, saved] = await Promise.all([
        voucherSeriesService.getVoucherSeriesByCompany(companyId, financialYear),
        voucherSeriesConfigService.getVoucherSeriesConfig(companyId, financialYear),
      ]);

      const resolvedConfig = saved || createEmptyVoucherSeriesConfig(companyId, financialYear);
      setVoucherSeries(series);
      setConfig(resolvedConfig);
      setSavedConfig(resolvedConfig);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load voucher series configuration.';
      setVoucherSeries([]);
      setConfig(createEmptyVoucherSeriesConfig(companyId, financialYear));
      setSavedConfig(createEmptyVoucherSeriesConfig(companyId, financialYear));
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoucherSeriesSelection = (voucherSeriesId: string) => {
    const selectedVoucherSeries = voucherSeries.find((series) => series.id === voucherSeriesId);

    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        voucherSeriesId: selectedVoucherSeries?.id || '',
        voucherSeriesName: selectedVoucherSeries?.name || '',
      };
    });
  };

  const handleSave = async () => {
    if (!config) {
      return;
    }

    setIsSaving(true);

    try {
      if (!config.voucherSeriesId || !config.voucherSeriesName) {
        throw new Error('Select a default voucher series before saving.');
      }

      const result = await voucherSeriesConfigService.updateVoucherSeriesConfig({
        companyId: config.companyId,
        financialYear: config.financialYear,
        voucherSeriesId: config.voucherSeriesId,
        voucherSeriesName: config.voucherSeriesName,
      });

      if (!result.success || !result.config) {
        throw new Error(result.error || 'Failed to save voucher series configuration.');
      }

      setConfig(result.config);
      setSavedConfig(result.config);
      toast({
        title: 'Voucher series saved',
        description: 'The default voucher series has been saved for the active company.',
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
            <h1 className="text-2xl font-bold tracking-tight">Voucher Series Configuration</h1>
            <p className="text-muted-foreground">
              Choose the default voucher series used for the selected company.
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
                <CardTitle className="text-lg">Default Voucher Series</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This value is stored per company and can be reused during ERP order submission.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCompany ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Select a company from the sidebar to manage the default voucher series.
              </div>
            ) : isLoading ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading voucher series and saved configuration...
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                  <div className="font-medium">{selectedCompany.companyName}</div>
                  <div className="text-muted-foreground">
                    Financial Year: {selectedCompany.financialYear}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Voucher Series</Label>
                  <Select
                    value={config?.voucherSeriesId || ''}
                    onValueChange={handleVoucherSeriesSelection}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voucher series" />
                    </SelectTrigger>
                    <SelectContent>
                      {voucherSeries.map((series) => (
                        <SelectItem key={series.id} value={series.id}>
                          {series.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Only admins can manage this default voucher series configuration.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
