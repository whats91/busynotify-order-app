import type { SalesTypeConfig, UpdateSalesTypeConfigPayload } from '../../../shared/types';

export class SalesTypeConfigRepository {
  async findByCompany(companyId: number, financialYear: string): Promise<SalesTypeConfig> {
    const searchParams = new URLSearchParams({
      companyId: String(companyId),
      financialYear,
    });
    const response = await fetch(`/api/admin/sales-type-configuration?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: SalesTypeConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to load sales type configuration.');
    }

    return data.data;
  }

  async update(payload: UpdateSalesTypeConfigPayload): Promise<SalesTypeConfig> {
    const response = await fetch('/api/admin/sales-type-configuration', {
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
      data?: SalesTypeConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to update sales type configuration.');
    }

    return data.data;
  }
}

export const salesTypeConfigRepository = new SalesTypeConfigRepository();
