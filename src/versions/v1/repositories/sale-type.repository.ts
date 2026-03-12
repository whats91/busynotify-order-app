import type { SaleType } from '../../../shared/types';

export class SaleTypeRepository {
  async findAllByCompany(companyId: number, financialYear: string): Promise<SaleType[]> {
    const response = await fetch('/api/sale-types', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        financialYear,
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: SaleType[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to load sale types.');
    }

    return data.data;
  }
}

export const saleTypeRepository = new SaleTypeRepository();
