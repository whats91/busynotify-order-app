/*
 * File Context:
 * Purpose: Implements service-layer behavior for Product Config.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/product-config.repository.ts
 * Role: application data/service layer.
 */
import type {
  ProductConfiguration,
  ProductFieldConfig,
  ProductStockDisplaySettings,
  UpdateProductFieldConfigPayload,
} from '../../../shared/types';
import { productConfigRepository } from '../repositories/product-config.repository';

export class ProductConfigService {
  async getProductConfiguration(): Promise<ProductConfiguration> {
    return productConfigRepository.findAll();
  }

  async getProductFieldConfig(): Promise<ProductFieldConfig[]> {
    const configuration = await this.getProductConfiguration();
    return configuration.fields;
  }

  async updateProductConfiguration(payload: {
    config: UpdateProductFieldConfigPayload[];
    stockSettings: ProductStockDisplaySettings;
  }): Promise<{
    success: boolean;
    configuration?: ProductConfiguration;
    error?: string;
  }> {
    try {
      const configuration = await productConfigRepository.update(payload);

      return {
        success: true,
        configuration,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update product configuration.',
      };
    }
  }

  async updateProductFieldConfig(config: UpdateProductFieldConfigPayload[]): Promise<{
    success: boolean;
    config?: ProductFieldConfig[];
    error?: string;
  }> {
    try {
      const existingConfiguration = await this.getProductConfiguration();
      const result = await this.updateProductConfiguration({
        config,
        stockSettings: existingConfiguration.stockSettings,
      });

      return {
        success: result.success,
        config: result.configuration?.fields,
        error: result.error,
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
