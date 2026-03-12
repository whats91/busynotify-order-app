/*
 * File Context:
 * Purpose: Implements repository access for Sale Type.Repository.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
import type { SaleType } from '../../../shared/types';

export class SaleTypeRepository {
  async findAllByCompany(companyId: number, financialYear: string): Promise<SaleType[]> {
    const response = await fetch('/api/internal/sale-types', {
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
