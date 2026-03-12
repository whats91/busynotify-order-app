import type { ProductFieldConfig, UpdateProductFieldConfigPayload } from '../../../shared/types';
import { productConfigRepository } from '../repositories/product-config.repository';

export class ProductConfigService {
  async getProductFieldConfig(): Promise<ProductFieldConfig[]> {
    return productConfigRepository.findAll();
  }

  async updateProductFieldConfig(config: UpdateProductFieldConfigPayload[]): Promise<{
    success: boolean;
    config?: ProductFieldConfig[];
    error?: string;
  }> {
    try {
      const records = await productConfigRepository.update(config);

      return {
        success: true,
        config: records,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update product configuration.',
      };
    }
  }
}

export const productConfigService = new ProductConfigService();
