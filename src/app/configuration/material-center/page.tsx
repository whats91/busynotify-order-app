/*
 * File Context:
 * Purpose: Implements the Next.js page for configuration / material center.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/label.tsx, src/components/ui/select.tsx
 * Role: role-based user-facing UI.
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Package } from 'lucide-react';
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
import type { MaterialCenter, MaterialCenterConfig } from '@/shared/types';
import {
  materialCenterConfigService,
  materialCenterService,
} from '@/versions/v1/services';

function buildMaterialCenterConfigSignature(config: MaterialCenterConfig | null) {
  if (!config) {
    return '';
  }

  return JSON.stringify([
    config.companyId,
    config.financialYear,
    config.materialCenterId,
    config.materialCenterName,
  ]);
}

function createEmptyMaterialCenterConfig(
  companyId: number,
  financialYear: string
): MaterialCenterConfig {
  return {
    companyId,
    financialYear,
    materialCenterId: '',
    materialCenterName: '',
  };
}

export default function MaterialCenterConfigurationPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  const hasHydrated = useHasHydrated();

  const [materialCenters, setMaterialCenters] = useState<MaterialCenter[]>([]);
  const [materialCenterConfig, setMaterialCenterConfig] = useState<MaterialCenterConfig | null>(
    null
  );
  const [savedMaterialCenterConfig, setSavedMaterialCenterConfig] =
    useState<MaterialCenterConfig | null>(null);
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
      setMaterialCenters([]);
      setMaterialCenterConfig(null);
      setSavedMaterialCenterConfig(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    void loadConfiguration(selectedCompany.companyId, selectedCompany.financialYear);
  }, [hasHydrated, isAuthenticated, selectedCompany, user]);

  const isDirty = useMemo(
    () =>
      buildMaterialCenterConfigSignature(materialCenterConfig) !==
      buildMaterialCenterConfigSignature(savedMaterialCenterConfig),
    [materialCenterConfig, savedMaterialCenterConfig]
  );

  const loadConfiguration = async (companyId: number, financialYear: string) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [centers, config] = await Promise.all([
        materialCenterService.getMaterialCentersByCompany(companyId, financialYear),
        materialCenterConfigService.getMaterialCenterConfig(companyId, financialYear),
      ]);

      const resolvedConfig = config || createEmptyMaterialCenterConfig(companyId, financialYear);
      setMaterialCenters(centers);
      setMaterialCenterConfig(resolvedConfig);
      setSavedMaterialCenterConfig(resolvedConfig);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load material center configuration.';
      setMaterialCenters([]);
      setMaterialCenterConfig(createEmptyMaterialCenterConfig(companyId, financialYear));
      setSavedMaterialCenterConfig(createEmptyMaterialCenterConfig(companyId, financialYear));
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaterialCenterSelection = (materialCenterId: string) => {
    const selectedMaterialCenter = materialCenters.find(
      (materialCenter) => materialCenter.id === materialCenterId
    );

    setMaterialCenterConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        materialCenterId: selectedMaterialCenter?.id || '',
        materialCenterName: selectedMaterialCenter?.name || '',
      };
    });
  };

  const handleSave = async () => {
    if (!materialCenterConfig) {
      return;
    }

    setIsSaving(true);

    try {
      if (!materialCenterConfig.materialCenterId || !materialCenterConfig.materialCenterName) {
        throw new Error('Select a default material center before saving.');
      }

      const result = await materialCenterConfigService.updateMaterialCenterConfig({
        companyId: materialCenterConfig.companyId,
        financialYear: materialCenterConfig.financialYear,
        materialCenterId: materialCenterConfig.materialCenterId,
        materialCenterName: materialCenterConfig.materialCenterName,
      });

      if (!result.success || !result.config) {
        throw new Error(result.error || 'Failed to save material center configuration.');
      }

      setMaterialCenterConfig(result.config);
      setSavedMaterialCenterConfig(result.config);
      toast({
        title: 'Material center saved',
        description: 'New orders will now use this default material center for the active company.',
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
            <h1 className="text-2xl font-bold tracking-tight">Material Center Configuration</h1>
            <p className="text-muted-foreground">
              Choose the default material center used when orders are placed for the selected company.
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
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Default Material Center</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This value is stored per company and attached to every new order.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCompany ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Select a company from the sidebar to manage the default material center.
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : materialCenterConfig ? (
              <div className="space-y-6">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
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

                <div className="space-y-2">
                  <Label>Default Material Center</Label>
                  <Select
                    value={materialCenterConfig.materialCenterId || undefined}
                    onValueChange={handleMaterialCenterSelection}
                    disabled={isSaving || materialCenters.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material center" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialCenters.map((materialCenter) => (
                        <SelectItem key={materialCenter.id} value={materialCenter.id}>
                          {materialCenter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    The selected material center will be stored with every order for this company.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
