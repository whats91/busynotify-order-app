import type { VoucherSeries } from '../../../shared/types';
import { voucherSeriesRepository } from '../repositories/voucher-series.repository';

export class VoucherSeriesService {
  async getVoucherSeriesByCompany(
    companyId: number,
    financialYear: string
  ): Promise<VoucherSeries[]> {
    return voucherSeriesRepository.findAllByCompany(companyId, financialYear);
  }
}

export const voucherSeriesService = new VoucherSeriesService();
