'use client';

/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / ecommerce / pages.
 * Primary Functionality: Lets admins edit seeded storefront markdown pages for the selected ecommerce company context.
 * Interlinked With: src/app/api/internal/admin/ecommerce/pages/route.ts, src/shared/components/app-shell.tsx, src/versions/v1/services/ecommerce.service.ts
 * Role: admin-facing UI.
 */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { FileText, Loader2, Upload } from 'lucide-react';
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
import { useAuthStore, useCompanyStore, useHasHydrated } from '@/shared/lib/stores';
import type {
  Company,
  CompanyApiResponse,
  EcommerceContentPage,
} from '@/shared/types';
import { ecommerceService } from '@/versions/v1/services';

const getCompanyKey = (company: Pick<Company, 'companyId' | 'financialYear'>) =>
  `${company.companyId}:${company.financialYear}`;

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

export default function AdminEcommercePagesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const selectedSidebarCompany = useCompanyStore((state) => state.selectedCompany);
  const hasHydrated = useHasHydrated();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyKey, setSelectedCompanyKey] = useState('');
  const [pages, setPages] = useState<EcommerceContentPage[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftMarkdown, setDraftMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const selectedCompany = useMemo(
    () => companies.find((company) => getCompanyKey(company) === selectedCompanyKey) || null,
    [companies, selectedCompanyKey]
  );

  const selectedPage = useMemo(
    () => pages.find((page) => page.slug === selectedPageSlug) || null,
    [pages, selectedPageSlug]
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

  useEffect(() => {
    setDraftTitle(selectedPage?.title || '');
    setDraftMarkdown(selectedPage?.contentMarkdown || '');
  }, [selectedPage]);

  const bootstrapPage = async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [availableCompanies, storefront] = await Promise.all([
        fetchCompanies(),
        ecommerceService.getStorefront(),
      ]);

      setCompanies(availableCompanies);

      const preferredCompany =
        availableCompanies.find(
          (company) =>
            company.companyId === storefront.selectedContext?.companyId &&
            company.financialYear === storefront.selectedContext.financialYear
        ) ||
        (selectedSidebarCompany
          ? availableCompanies.find(
              (company) => getCompanyKey(company) === getCompanyKey(selectedSidebarCompany)
            )
          : null) ||
        availableCompanies[0] ||
        null;

      if (!preferredCompany) {
        setPages([]);
        return;
      }

      const companyKey = getCompanyKey(preferredCompany);
      setSelectedCompanyKey(companyKey);
      await loadPages(preferredCompany.companyId, preferredCompany.financialYear);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load ecommerce pages.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPages = async (companyId: number, financialYear: string) => {
    const data = await ecommerceService.getPages(companyId, financialYear);
    setPages(data);
    setSelectedPageSlug((current) => {
      if (current && data.some((page) => page.slug === current)) {
        return current;
      }

      return data[0]?.slug || '';
    });
  };

  const handleCompanyChange = async (companyKey: string) => {
    setSelectedCompanyKey(companyKey);
    const company = companies.find((item) => getCompanyKey(item) === companyKey);

    if (!company) {
      return;
    }

    setIsLoading(true);

    try {
      await loadPages(company.companyId, company.financialYear);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load pages',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkdownImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setDraftMarkdown(text);
      toast({
        title: 'Markdown imported',
        description: `${file.name} was loaded into the editor.`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'The selected file could not be read.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!selectedCompany || !selectedPage) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await ecommerceService.savePage({
        companyId: selectedCompany.companyId,
        financialYear: selectedCompany.financialYear,
        slug: selectedPage.slug,
        title: draftTitle,
        contentMarkdown: draftMarkdown,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to save ecommerce page.');
      }

      setPages((current) =>
        current.map((page) => (page.slug === result.data!.slug ? result.data! : page))
      );

      toast({
        title: 'Page saved',
        description: `${result.data.title} is ready on the storefront.`,
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
            <h1 className="text-2xl font-bold tracking-tight">Storefront Pages</h1>
            <p className="text-muted-foreground">
              Manage the markdown content for standard storefront pages like privacy and
              refund policies.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/ecommerce')}>
              Storefront Settings
            </Button>
            <Button onClick={handleSave} disabled={!selectedPage || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Page'
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
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Company Context</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pages are stored per storefront company and financial year.
                </p>
              </div>
              {selectedCompany ? (
                <Badge variant="secondary">
                  {selectedCompany.companyName} • FY {selectedCompany.financialYear}
                </Badge>
              ) : null}
            </div>
            <div className="max-w-xl space-y-2">
              <Label>Select Storefront Company</Label>
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
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pages found for this company.</p>
                ) : (
                  pages.map((page) => (
                    <button
                      key={page.slug}
                      type="button"
                      onClick={() => setSelectedPageSlug(page.slug)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        selectedPageSlug === page.slug
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{page.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">/{page.slug}</p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card className="min-h-[70vh]">
                <CardHeader>
                  <CardTitle className="text-lg">Markdown Editor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ecommerce-page-title">Page Title</Label>
                    <Input
                      id="ecommerce-page-title"
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder="Page title"
                      disabled={!selectedPage}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label htmlFor="ecommerce-page-markdown">Markdown Content</Label>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor="ecommerce-page-file"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
                        >
                          <Upload className="h-4 w-4" />
                          Import Markdown
                        </Label>
                        <Input
                          id="ecommerce-page-file"
                          type="file"
                          accept=".md,.markdown,text/markdown,text/plain"
                          className="hidden"
                          onChange={(event) => void handleMarkdownImport(event)}
                        />
                      </div>
                    </div>
                    <Textarea
                      id="ecommerce-page-markdown"
                      value={draftMarkdown}
                      onChange={(event) => setDraftMarkdown(event.target.value)}
                      placeholder="Write markdown content here..."
                      className="min-h-[32rem] font-mono text-sm"
                      disabled={!selectedPage}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="min-h-[70vh]">
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm leading-7 text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_strong]:text-foreground">
                    {draftMarkdown.trim() ? (
                      <ReactMarkdown>{draftMarkdown}</ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground">
                        Markdown preview will appear here once content is available.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
