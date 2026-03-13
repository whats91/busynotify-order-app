/*
 * File Context:
 * Purpose: Implements repository access for Ecommerce.Repository.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
import type {
  EcommerceContentPage,
  EcommerceStorefrontPayload,
  UpdateEcommerceContentPagePayload,
  UpdateEcommerceStorefrontPayload,
} from '../../../shared/types';

export class EcommerceRepository {
  async getStorefront(
    companyId?: number,
    financialYear?: string
  ): Promise<EcommerceStorefrontPayload> {
    const searchParams = new URLSearchParams();

    if (companyId != null) {
      searchParams.set('companyId', String(companyId));
    }

    if (financialYear) {
      searchParams.set('financialYear', financialYear);
    }

    const url = searchParams.size
      ? `/api/internal/admin/ecommerce/storefront?${searchParams.toString()}`
      : '/api/internal/admin/ecommerce/storefront';

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: EcommerceStorefrontPayload;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to load ecommerce storefront configuration.');
    }

    return data.data;
  }

  async updateStorefront(
    payload: UpdateEcommerceStorefrontPayload
  ): Promise<EcommerceStorefrontPayload> {
    const response = await fetch('/api/internal/admin/ecommerce/storefront', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: EcommerceStorefrontPayload;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to save ecommerce storefront configuration.');
    }

    return data.data;
  }

  async getPages(companyId: number, financialYear: string): Promise<EcommerceContentPage[]> {
    const searchParams = new URLSearchParams({
      companyId: String(companyId),
      financialYear,
    });

    const response = await fetch(
      `/api/internal/admin/ecommerce/pages?${searchParams.toString()}`,
      {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }
    );

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: EcommerceContentPage[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to load ecommerce pages.');
    }

    return data.data;
  }

  async updatePage(
    payload: UpdateEcommerceContentPagePayload
  ): Promise<EcommerceContentPage> {
    const response = await fetch(
      `/api/internal/admin/ecommerce/pages/${encodeURIComponent(payload.slug)}`,
      {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: payload.companyId,
          financialYear: payload.financialYear,
          title: payload.title,
          contentMarkdown: payload.contentMarkdown,
        }),
      }
    );

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: EcommerceContentPage;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to save ecommerce page.');
    }

    return data.data;
  }
}

export const ecommerceRepository = new EcommerceRepository();
