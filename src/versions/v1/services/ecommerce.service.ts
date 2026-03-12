/*
 * File Context:
 * Purpose: Implements service-layer behavior for Ecommerce.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/ecommerce.repository.ts
 * Role: application data/service layer.
 */
import type {
  EcommerceStorefrontPayload,
  UpdateEcommerceStorefrontPayload,
} from '../../../shared/types';
import { ecommerceRepository } from '../repositories/ecommerce.repository';

export class EcommerceService {
  async getStorefront(
    companyId?: number,
    financialYear?: string
  ): Promise<EcommerceStorefrontPayload> {
    return ecommerceRepository.getStorefront(companyId, financialYear);
  }

  async saveStorefront(payload: UpdateEcommerceStorefrontPayload): Promise<{
    success: boolean;
    data?: EcommerceStorefrontPayload;
    error?: string;
  }> {
    try {
      const data = await ecommerceRepository.updateStorefront(payload);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save ecommerce storefront configuration.',
      };
    }
  }
}

export const ecommerceService = new EcommerceService();
