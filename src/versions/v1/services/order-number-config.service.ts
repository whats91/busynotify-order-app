/*
 * File Context:
 * Purpose: Implements service-layer behavior for Order Number Config.Service.
 * Primary Functionality: Coordinates repository calls and result shaping for admin order-number configuration.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/order-number-config.repository.ts
 * Role: application data/service layer.
 */
import type {
  OrderNumberConfig,
  UpdateOrderNumberConfigPayload,
} from '../../../shared/types';
import { orderNumberConfigRepository } from '../repositories/order-number-config.repository';

export class OrderNumberConfigService {
  async getOrderNumberConfig(
    companyId: number,
    financialYear: string
  ): Promise<OrderNumberConfig> {
    return orderNumberConfigRepository.findByCompany(companyId, financialYear);
  }

  async updateOrderNumberConfig(payload: UpdateOrderNumberConfigPayload): Promise<{
    success: boolean;
    config?: OrderNumberConfig;
    error?: string;
  }> {
    try {
      const config = await orderNumberConfigRepository.update(payload);

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
            : 'Failed to update order number configuration.',
      };
    }
  }
}

export const orderNumberConfigService = new OrderNumberConfigService();
