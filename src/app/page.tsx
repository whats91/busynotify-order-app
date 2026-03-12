/*
 * File Context:
 * Purpose: Controls the root route and renders the public storefront when e-commerce is enabled.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/lib/server/ecommerce-storefront.ts, src/shared/components/ecommerce-storefront.tsx
 * Role: public storefront UI.
 */
import { redirect } from 'next/navigation';
import { EcommerceStorefront } from '@/shared/components/ecommerce-storefront';
import {
  getPublicEcommerceStorefrontPayload,
  isEcommerceEnabled,
} from '@/lib/server/ecommerce-storefront';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  if (!isEcommerceEnabled()) {
    redirect('/login');
  }

  const resolvedSearchParams = (await Promise.resolve(searchParams ?? {})) as Record<
    string,
    string | string[] | undefined
  >;
  const rawPage = Number(getSingleValue(resolvedSearchParams.page));
  const payload = await getPublicEcommerceStorefrontPayload({
    page: Number.isFinite(rawPage) ? rawPage : 1,
    searchQuery: getSingleValue(resolvedSearchParams.q) || '',
    selectedCategory: getSingleValue(resolvedSearchParams.category) || 'all',
  });

  return <EcommerceStorefront payload={payload} />;
}
