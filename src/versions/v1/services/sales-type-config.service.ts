import type { SalesTypeConfig, UpdateSalesTypeConfigPayload } from '../../../shared/types';
import { salesTypeConfigRepository } from '../repositories/sales-type-config.repository';

export class SalesTypeConfigService {
  async getSalesTypeConfig(companyId: number, financialYear: string): Promise<SalesTypeConfig> {
    return salesTypeConfigRepository.findByCompany(companyId, financialYear);
  }

  async updateSalesTypeConfig(payload: UpdateSalesTypeConfigPayload): Promise<{
    success: boolean;
    config?: SalesTypeConfig;
    error?: string;
  }> {
    try {
      const config = await salesTypeConfigRepository.update(payload);

      return {
        success: true,
        config,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update sales type configuration.',
      };
    }
  }
}

export const salesTypeConfigService = new SalesTypeConfigService();
