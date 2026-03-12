/*
 * File Context:
 * Purpose: Implements service-layer behavior for Voucher Series.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/voucher-series.repository.ts
 * Role: application data/service layer.
 */
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
