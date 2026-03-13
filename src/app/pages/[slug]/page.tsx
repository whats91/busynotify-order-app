/*
 * File Context:
 * Purpose: Implements the Next.js page for pages / :slug.
 * Primary Functionality: Renders a public storefront markdown page for the active ecommerce company context.
 * Interlinked With: src/lib/server/ecommerce-storefront.ts, src/shared/components/format-currency.tsx
 * Role: public storefront UI.
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getPublicEcommerceContentPage,
  isEcommerceEnabled,
} from '@/lib/server/ecommerce-storefront';

export const dynamic = 'force-dynamic';

type StorefrontPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StorefrontMarkdownPage({ params }: StorefrontPageProps) {
  if (!isEcommerceEnabled()) {
    redirect('/login');
  }

  const { slug } = await params;
  const payload = await getPublicEcommerceContentPage(slug);

  if (!payload.page || !payload.settings || !payload.activeContext) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(255,255,255,0.92)_22%,rgba(255,255,255,1)_100%)]">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {payload.settings.storeTitle || payload.activeContext.companyName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {payload.activeContext.companyName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Store
              </Link>
            </Button>
            <Button asChild>
              <Link href="/login?returnTo=/">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border bg-card/80 p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Storefront Page
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {payload.page.title}
            </h1>
          </div>

          <article className="space-y-4 text-sm leading-7 text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_strong]:text-foreground">
            <ReactMarkdown>{payload.page.contentMarkdown}</ReactMarkdown>
          </article>
        </div>
      </main>

      <footer className="border-t bg-background/90">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
          {payload.pages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {payload.pages.map((page) => (
                <Link
                  key={page.slug}
                  href={page.href}
                  className="transition hover:text-foreground"
                >
                  {page.title}
                </Link>
              ))}
            </div>
          ) : null}
          <div>{payload.settings.footerNote}</div>
        </div>
      </footer>
    </div>
  );
}
