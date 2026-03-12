import type {
  UpdateVoucherSeriesConfigPayload,
  VoucherSeriesConfig,
} from '../../../shared/types';
import { voucherSeriesConfigRepository } from '../repositories/voucher-series-config.repository';

export class VoucherSeriesConfigService {
  async getVoucherSeriesConfig(
    companyId: number,
    financialYear: string
  ): Promise<VoucherSeriesConfig> {
    return voucherSeriesConfigRepository.findByCompany(companyId, financialYear);
  }

  async updateVoucherSeriesConfig(payload: UpdateVoucherSeriesConfigPayload): Promise<{
    success: boolean;
    config?: VoucherSeriesConfig;
    error?: string;
  }> {
    try {
      const config = await voucherSeriesConfigRepository.update(payload);

      return {
        success: true,
        config,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update voucher series configuration.',
      };
    }
  }
}

export const voucherSeriesConfigService = new VoucherSeriesConfigService();
