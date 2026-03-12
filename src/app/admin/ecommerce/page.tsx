'use client';

/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / ecommerce.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/badge.tsx, src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/input.tsx
 * Role: admin-facing UI.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Settings2, Store } from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  useAuthStore,
  useCompanyStore,
  useHasHydrated,
} from '@/shared/lib/stores';
import type {
  Company,
  CompanyApiResponse,
  EcommerceStorefrontPayload,
  UpdateEcommerceStorefrontPayload,
} from '@/shared/types';
import { ecommerceService } from '@/versions/v1/services';

const getCompanyKey = (company: Pick<Company, 'companyId' | 'financialYear'>) =>
  `${company.companyId}:${company.financialYear}`;

function mapSettingsToFormState(
  settings: EcommerceStorefrontPayload['settings']
): UpdateEcommerceStorefrontPayload | null {
  if (!settings) {
    return null;
  }

  return {
    companyId: settings.companyId,
    financialYear: settings.financialYear,
    storeTitle: settings.storeTitle,
    storeSubtitle: settings.storeSubtitle,
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    heroCtaLabel: settings.heroCtaLabel,
    categoriesTitle: settings.categoriesTitle,
    catalogTitle: settings.catalogTitle,
    emptyStateTitle: settings.emptyStateTitle,
    emptyStateDescription: settings.emptyStateDescription,
    checkoutLoginTitle: settings.checkoutLoginTitle,
    checkoutLoginDescription: settings.checkoutLoginDescription,
    footerNote: settings.footerNote,
  };
}

function createEmptyFormState(companyId: number, financialYear: string): UpdateEcommerceStorefrontPayload {
  return {
    companyId,
    financialYear,
    storeTitle: '',
    storeSubtitle: '',
    heroTitle: '',
    heroSubtitle: '',
    heroCtaLabel: '',
    categoriesTitle: '',
    catalogTitle: '',
    emptyStateTitle: '',
    emptyStateDescription: '',
    checkoutLoginTitle: '',
    checkoutLoginDescription: '',
    footerNote: '',
  };
}

async function fetchCompanies(): Promise<Company[]> {
  const response = await fetch('/api/internal/companies', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });

  const data = (await response.json()) as CompanyApiResponse & {
    error?: string;
  };

  if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
    throw new Error(data.error || 'Failed to load companies.');
  }

  return data.data;
}

export default function AdminEcommercePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const selectedSidebarCompany = useCompanyStore((state) => state.selectedCompany);
  const hasHydrated = useHasHydrated();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyKey, setSelectedCompanyKey] = useState('');
  const [storefrontPayload, setStorefrontPayload] = useState<EcommerceStorefrontPayload | null>(
    null
  );
  const [formState, setFormState] = useState<UpdateEcommerceStorefrontPayload | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSavingStorefront, setIsSavingStorefront] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const selectedCompany = useMemo(
    () =>
      companies.find((company) => getCompanyKey(company) === selectedCompanyKey) || null,
    [companies, selectedCompanyKey]
  );

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

  const bootstrapPage = async () => {
    setIsLoadingPage(true);
    setPageError(null);

    try {
      const [availableCompanies, initialStorefront] = await Promise.all([
        fetchCompanies(),
        ecommerceService.getStorefront(),
      ]);

      setCompanies(availableCompanies);

      const preferredCompany =
        availableCompanies.find(
          (company) =>
            company.companyId === initialStorefront.selectedContext?.companyId &&
            company.financialYear === initialStorefront.selectedContext.financialYear
        ) ||
        (selectedSidebarCompany
          ? availableCompanies.find(
              (company) => getCompanyKey(company) === getCompanyKey(selectedSidebarCompany)
            )
          : null) ||
        availableCompanies[0] ||
        null;

      if (!preferredCompany) {
        setStorefrontPayload(initialStorefront);
        return;
      }

      setSelectedCompanyKey(getCompanyKey(preferredCompany));

      const storefront =
        initialStorefront.selectedContext?.companyId === preferredCompany.companyId &&
        initialStorefront.selectedContext.financialYear === preferredCompany.financialYear
          ? initialStorefront
          : await ecommerceService.getStorefront(
              preferredCompany.companyId,
              preferredCompany.financialYear
            );

      setStorefrontPayload(storefront);
      setFormState(
        mapSettingsToFormState(storefront.settings) ||
          createEmptyFormState(preferredCompany.companyId, preferredCompany.financialYear)
      );
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load storefront settings.');
    } finally {
      setIsLoadingPage(false);
    }
  };

  const loadStorefrontForCompany = async (company: Company) => {
    const storefront = await ecommerceService.getStorefront(
      company.companyId,
      company.financialYear
    );

    setStorefrontPayload(storefront);
    setFormState(
      mapSettingsToFormState(storefront.settings) ||
        createEmptyFormState(company.companyId, company.financialYear)
    );
  };

  const handleCompanyChange = async (companyKey: string) => {
    setSelectedCompanyKey(companyKey);

    const company = companies.find((item) => getCompanyKey(item) === companyKey);
    if (!company) {
      return;
    }

    try {
      await loadStorefrontForCompany(company);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load storefront settings',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleFormFieldChange = (
    field: keyof UpdateEcommerceStorefrontPayload,
    value: string
  ) => {
    setFormState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const handleSaveStorefront = async () => {
    if (!formState) {
      return;
    }

    setIsSavingStorefront(true);

    try {
      const result = await ecommerceService.saveStorefront(formState);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to save storefront settings.');
      }

      setStorefrontPayload(result.data);
      setFormState(mapSettingsToFormState(result.data.settings));
      toast({
        title: 'Storefront saved',
        description: 'The active storefront settings were updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSavingStorefront(false);
    }
  };

  if (!hasHydrated || !isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isLoadingPage) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Storefront Settings</h1>
            <p className="text-muted-foreground">
              Manage the active storefront company and shared e-commerce copy. Additional
              e-commerce settings will be added as sub-menus under the main E-commerce section.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={handleSaveStorefront} disabled={!formState || isSavingStorefront}>
              {isSavingStorefront ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>

        {pageError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {pageError}
          </div>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border bg-muted/30 p-2">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Storefront Context</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose which company powers the public storefront.
                </p>
              </div>
            </div>
            <Badge variant={storefrontPayload?.isEnabled ? 'default' : 'secondary'}>
              {storefrontPayload?.isEnabled ? 'ECOMMERCE=1' : 'ECOMMERCE=0'}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2">
              <Label>Active Storefront Company</Label>
              <Select value={selectedCompanyKey} onValueChange={(value) => void handleCompanyChange(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={getCompanyKey(company)} value={getCompanyKey(company)}>
                      {company.companyName} • FY {company.financialYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Public Homepage
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {storefrontPayload?.isEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Editing Context
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {selectedCompany?.companyName || 'Not selected'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl border bg-muted/30 p-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Storefront Copy Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                These settings apply to the selected storefront company and are not product-specific.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {!formState ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Select a company to edit storefront settings.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Store Title</Label>
                  <Input
                    value={formState.storeTitle}
                    onChange={(event) => handleFormFieldChange('storeTitle', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store Subtitle</Label>
                  <Input
                    value={formState.storeSubtitle}
                    onChange={(event) =>
                      handleFormFieldChange('storeSubtitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hero Title</Label>
                  <Input
                    value={formState.heroTitle}
                    onChange={(event) => handleFormFieldChange('heroTitle', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hero CTA Label</Label>
                  <Input
                    value={formState.heroCtaLabel}
                    onChange={(event) =>
                      handleFormFieldChange('heroCtaLabel', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Hero Subtitle</Label>
                  <Textarea
                    rows={3}
                    value={formState.heroSubtitle}
                    onChange={(event) =>
                      handleFormFieldChange('heroSubtitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categories Title</Label>
                  <Input
                    value={formState.categoriesTitle}
                    onChange={(event) =>
                      handleFormFieldChange('categoriesTitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catalog Title</Label>
                  <Input
                    value={formState.catalogTitle}
                    onChange={(event) =>
                      handleFormFieldChange('catalogTitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empty State Title</Label>
                  <Input
                    value={formState.emptyStateTitle}
                    onChange={(event) =>
                      handleFormFieldChange('emptyStateTitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Empty State Description</Label>
                  <Textarea
                    rows={3}
                    value={formState.emptyStateDescription}
                    onChange={(event) =>
                      handleFormFieldChange('emptyStateDescription', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Checkout Login Title</Label>
                  <Input
                    value={formState.checkoutLoginTitle}
                    onChange={(event) =>
                      handleFormFieldChange('checkoutLoginTitle', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Checkout Login Description</Label>
                  <Textarea
                    rows={3}
                    value={formState.checkoutLoginDescription}
                    onChange={(event) =>
                      handleFormFieldChange('checkoutLoginDescription', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Footer Note</Label>
                  <Textarea
                    rows={2}
                    value={formState.footerNote}
                    onChange={(event) => handleFormFieldChange('footerNote', event.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
