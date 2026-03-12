import type {
  UpdateVoucherSeriesConfigPayload,
  VoucherSeriesConfig,
} from '../../../shared/types';

export class VoucherSeriesConfigRepository {
  async findByCompany(companyId: number, financialYear: string): Promise<VoucherSeriesConfig> {
    const searchParams = new URLSearchParams({
      companyId: String(companyId),
      financialYear,
    });
    const response = await fetch(
      `/api/internal/admin/voucher-series-configuration?${searchParams.toString()}`,
      {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }
    );

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: VoucherSeriesConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to load voucher series configuration.');
    }

    return data.data;
  }

  async update(payload: UpdateVoucherSeriesConfigPayload): Promise<VoucherSeriesConfig> {
    const response = await fetch('/api/internal/admin/voucher-series-configuration', {
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
      data?: VoucherSeriesConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to update voucher series configuration.');
    }

    return data.data;
  }
}

export const voucherSeriesConfigRepository = new VoucherSeriesConfigRepository();
