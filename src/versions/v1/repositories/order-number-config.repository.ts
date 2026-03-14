/*
 * File Context:
 * Purpose: Implements repository access for Order Number Config.Repository.
 * Primary Functionality: Wraps lower-level fetch calls for admin order-number configuration.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
import type {
  OrderNumberConfig,
  UpdateOrderNumberConfigPayload,
} from '../../../shared/types';

export class OrderNumberConfigRepository {
  async findByCompany(companyId: number, financialYear: string): Promise<OrderNumberConfig> {
    const searchParams = new URLSearchParams({
      companyId: String(companyId),
      financialYear,
    });
    const response = await fetch(
      `/api/internal/admin/order-number-configuration?${searchParams.toString()}`,
      {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }
    );

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: OrderNumberConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to load order number configuration.');
    }

    return data.data;
  }

  async update(payload: UpdateOrderNumberConfigPayload): Promise<OrderNumberConfig> {
    const response = await fetch('/api/internal/admin/order-number-configuration', {
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
      data?: OrderNumberConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to update order number configuration.');
    }

    return data.data;
  }
}

export const orderNumberConfigRepository = new OrderNumberConfigRepository();
