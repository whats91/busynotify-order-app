import type { ProductFieldConfig, UpdateProductFieldConfigPayload } from '../../../shared/types';

export class ProductConfigRepository {
  async findAll(): Promise<ProductFieldConfig[]> {
    const response = await fetch('/api/admin/product-configuration', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: ProductFieldConfig[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to load product configuration.');
    }

    return data.data;
  }

  async update(config: UpdateProductFieldConfigPayload[]): Promise<ProductFieldConfig[]> {
    const response = await fetch('/api/admin/product-configuration', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: ProductFieldConfig[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to update product configuration.');
    }

    return data.data;
  }
}

export const productConfigRepository = new ProductConfigRepository();
