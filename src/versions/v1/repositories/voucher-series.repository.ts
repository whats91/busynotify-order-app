/*
 * File Context:
 * Purpose: Implements repository access for Voucher Series.Repository.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
import type { VoucherSeries } from '../../../shared/types';

export class VoucherSeriesRepository {
  async findAllByCompany(companyId: number, financialYear: string): Promise<VoucherSeries[]> {
    const response = await fetch('/api/internal/voucher-series', {
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
      data?: VoucherSeries[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to load voucher series.');
    }

    return data.data;
  }
}

export const voucherSeriesRepository = new VoucherSeriesRepository();
