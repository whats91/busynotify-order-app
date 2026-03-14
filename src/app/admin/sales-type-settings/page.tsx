/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / sales type settings.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/label.tsx, src/components/ui/select.tsx
 * Role: admin-facing UI.
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BadgePercent, Loader2 } from 'lucide-react';
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
import { IndianStateSelect } from '@/shared/components/indian-state-select';
import type { SaleType, SalesTypeConfig } from '@/shared/types';
import {
  saleTypeService,
  salesTypeConfigService,
} from '@/versions/v1/services';

function normalizeSaleTypeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function isTaxInclusiveSaleTypeName(value: string) {
  return normalizeSaleTypeName(value).includes('taxincl');
}

function isTaxExclusiveSaleTypeName(value: string) {
  return normalizeSaleTypeName(value).includes('itemwise');
}

function isAllowedSameStateSaleType(value: string) {
  const normalized = normalizeSaleTypeName(value);
  return normalized.startsWith('local-') && (
    isTaxInclusiveSaleTypeName(value) || isTaxExclusiveSaleTypeName(value)
  );
}

function isAllowedInterstateSaleType(value: string) {
  const normalized = normalizeSaleTypeName(value);
  return normalized.startsWith('central-') && (
    isTaxInclusiveSaleTypeName(value) || isTaxExclusiveSaleTypeName(value)
  );
}

function getTaxModeLabel(value: string) {
  return isTaxInclusiveSaleTypeName(value) ? 'Tax Include' : 'Tax Exclude';
}

function buildSalesTypeConfigSignature(config: SalesTypeConfig | null) {
  if (!config) {
    return '';
  }

  return JSON.stringify([
    config.companyId,
    config.financialYear,
    config.companyState.trim().toLowerCase(),
    config.sameStateSaleTypeId,
    config.sameStateSaleTypeName,
    config.interstateSaleTypeId,
    config.interstateSaleTypeName,
  ]);
}

function createEmptySalesTypeConfig(companyId: number, financialYear: string): SalesTypeConfig {
  return {
    companyId,
    financialYear,
    companyState: '',
    sameStateSaleTypeId: '',
    sameStateSaleTypeName: '',
    interstateSaleTypeId: '',
    interstateSaleTypeName: '',
  };
}

export default function AdminSalesTypeSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  const hasHydrated = useHasHydrated();

  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);
  const [salesTypeConfig, setSalesTypeConfig] = useState<SalesTypeConfig | null>(null);
  const [savedSalesTypeConfig, setSavedSalesTypeConfig] = useState<SalesTypeConfig | null>(null);
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
      setSaleTypes([]);
      setSalesTypeConfig(null);
      setSavedSalesTypeConfig(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    void loadConfiguration(selectedCompany.companyId, selectedCompany.financialYear);
  }, [hasHydrated, isAuthenticated, selectedCompany, user]);

  const isDirty = useMemo(
    () =>
      buildSalesTypeConfigSignature(salesTypeConfig) !==
      buildSalesTypeConfigSignature(savedSalesTypeConfig),
    [salesTypeConfig, savedSalesTypeConfig]
  );

  const sameStateSaleTypes = useMemo(
    () => saleTypes.filter((saleType) => isAllowedSameStateSaleType(saleType.name)),
    [saleTypes]
  );

  const interstateSaleTypes = useMemo(
    () => saleTypes.filter((saleType) => isAllowedInterstateSaleType(saleType.name)),
    [saleTypes]
  );

  const loadConfiguration = async (companyId: number, financialYear: string) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [types, config] = await Promise.all([
        saleTypeService.getSaleTypesByCompany(companyId, financialYear),
        salesTypeConfigService.getSalesTypeConfig(companyId, financialYear),
      ]);

      const resolvedConfig = config || createEmptySalesTypeConfig(companyId, financialYear);
      setSaleTypes(types);
      setSalesTypeConfig(resolvedConfig);
      setSavedSalesTypeConfig(resolvedConfig);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load sales type settings.';
      setSaleTypes([]);
      setSalesTypeConfig(createEmptySalesTypeConfig(companyId, financialYear));
      setSavedSalesTypeConfig(createEmptySalesTypeConfig(companyId, financialYear));
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaleTypeSelection = (
    type: 'sameState' | 'interstate',
    saleTypeId: string
  ) => {
    const selectedSaleType = saleTypes.find((saleType) => saleType.id === saleTypeId);

    setSalesTypeConfig((current) => {
      if (!current) {
        return current;
      }

      if (type === 'sameState') {
        return {
          ...current,
          sameStateSaleTypeId: selectedSaleType?.id || '',
          sameStateSaleTypeName: selectedSaleType?.name || '',
        };
      }

      return {
        ...current,
        interstateSaleTypeId: selectedSaleType?.id || '',
        interstateSaleTypeName: selectedSaleType?.name || '',
      };
    });
  };

  const handleSave = async () => {
    if (!salesTypeConfig) {
      return;
    }

    setIsSaving(true);

    try {
      if (
        !salesTypeConfig.companyState.trim() ||
        !salesTypeConfig.sameStateSaleTypeId ||
        !salesTypeConfig.sameStateSaleTypeName ||
        !salesTypeConfig.interstateSaleTypeId ||
        !salesTypeConfig.interstateSaleTypeName
      ) {
        throw new Error('Select the company state and both sale type mappings before saving.');
      }

      const result = await salesTypeConfigService.updateSalesTypeConfig({
        companyId: salesTypeConfig.companyId,
        financialYear: salesTypeConfig.financialYear,
        companyState: salesTypeConfig.companyState,
        sameStateSaleTypeId: salesTypeConfig.sameStateSaleTypeId,
        sameStateSaleTypeName: salesTypeConfig.sameStateSaleTypeName,
        interstateSaleTypeId: salesTypeConfig.interstateSaleTypeId,
        interstateSaleTypeName: salesTypeConfig.interstateSaleTypeName,
      });

      if (!result.success || !result.config) {
        throw new Error(result.error || 'Failed to save sales type settings.');
      }

      setSalesTypeConfig(result.config);
      setSavedSalesTypeConfig(result.config);
      toast({
        title: 'Sales type settings saved',
        description: 'Order placement will now use these tax rules for the active company.',
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
            <h1 className="text-2xl font-bold tracking-tight">Sales Type Settings</h1>
            <p className="text-muted-foreground">
              Map same-state and interstate tax modes for the selected company.
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
                <BadgePercent className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Tax Rule Mapping</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Only tax-inclusive and tax-exclusive sale types are allowed here.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCompany ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Select a company from the sidebar to manage sales type settings.
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : salesTypeConfig ? (
              <div className="space-y-6">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        Active company:{' '}
                        <span className="font-medium text-foreground">
                          {selectedCompany.companyName}
                        </span>
                      </p>
                      <p>
                        Financial year:{' '}
                        <span className="font-medium text-foreground">
                          {selectedCompany.financialYear}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company State</Label>
                    <IndianStateSelect
                      value={salesTypeConfig.companyState}
                      onValueChange={(value) =>
                        setSalesTypeConfig((current) =>
                          current
                            ? {
                                ...current,
                                companyState: value,
                              }
                            : current
                        )
                      }
                      disabled={isSaving}
                      placeholder="Select company state"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Same-State Sale Type</Label>
                    <Select
                      value={salesTypeConfig.sameStateSaleTypeId || undefined}
                      onValueChange={(value) => handleSaleTypeSelection('sameState', value)}
                      disabled={isSaving || sameStateSaleTypes.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select same-state tax mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {sameStateSaleTypes.map((saleType) => (
                          <SelectItem key={saleType.id} value={saleType.id}>
                            {getTaxModeLabel(saleType.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label>Interstate Sale Type</Label>
                    <Select
                      value={salesTypeConfig.interstateSaleTypeId || undefined}
                      onValueChange={(value) => handleSaleTypeSelection('interstate', value)}
                      disabled={isSaving || interstateSaleTypes.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interstate tax mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {interstateSaleTypes.map((saleType) => (
                          <SelectItem key={saleType.id} value={saleType.id}>
                            {getTaxModeLabel(saleType.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
