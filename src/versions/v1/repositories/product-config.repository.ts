/*
 * File Context:
 * Purpose: Implements repository access for Product Config.Repository.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
import type {
  ProductConfiguration,
  ProductStockDisplaySettings,
  UpdateProductFieldConfigPayload,
} from '../../../shared/types';

export class ProductConfigRepository {
  async findAll(): Promise<ProductConfiguration> {
    const response = await fetch('/api/internal/product-configuration', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: ProductConfiguration;
    };

    if (
      !response.ok ||
      data.success !== true ||
      !data.data ||
      !Array.isArray(data.data.fields) ||
      !data.data.stockSettings
    ) {
      throw new Error(data.error || 'Failed to load product configuration.');
    }

    return data.data;
  }

  async update(payload: {
    config: UpdateProductFieldConfigPayload[];
    stockSettings: ProductStockDisplaySettings;
  }): Promise<ProductConfiguration> {
    const response = await fetch('/api/internal/admin/product-configuration', {
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
      data?: ProductConfiguration;
    };

    if (
      !response.ok ||
      data.success !== true ||
      !data.data ||
      !Array.isArray(data.data.fields) ||
      !data.data.stockSettings
    ) {
      throw new Error(data.error || 'Failed to update product configuration.');
    }

    return data.data;
  }
}

export const productConfigRepository = new ProductConfigRepository();
