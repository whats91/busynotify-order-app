/*
 * File Context:
 * Purpose: Implements repository access for Order.Repository.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
// =====================================================
// ORDER REPOSITORY - Data Access Layer for Orders
// =====================================================

import type { Order, OrderItem, OrderStatus, OrderFilter } from '../../../shared/types';

export class OrderRepository {
  /**
   * Get all orders
   */
  async findAll(): Promise<Order[]> {
    const response = await fetch('/api/internal/orders', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Order[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to fetch orders');
    }

    return data.data;
  }

  /**
   * Get order by ID
   */
  async findById(id: string): Promise<Order | null> {
    const response = await fetch(`/api/internal/orders/${id}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (response.status === 404) {
      return null;
    }

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Order;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to fetch order');
    }

    return data.data;
  }

  /**
   * Get orders by customer ID
   */
  async findByCustomerId(customerId: string): Promise<Order[]> {
    const searchParams = new URLSearchParams({ customerId });
    const response = await fetch(`/api/internal/orders?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Order[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to fetch customer orders');
    }

    return data.data;
  }

  /**
   * Get orders by creator (salesman)
   */
  async findByCreator(createdBy: string): Promise<Order[]> {
    const searchParams = new URLSearchParams({ createdBy });
    const response = await fetch(`/api/internal/orders?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Order[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to fetch creator orders');
    }

    return data.data;
  }

  /**
   * Create new order
   */
  async create(
    companyId: number | undefined,
    financialYear: string | undefined,
    customerId: string,
    customerName: string,
    customerState: string,
    companyState: string,
    saleTypeId: string,
    saleTypeName: string,
    voucherSeriesId: string,
    voucherSeriesName: string,
    materialCenterId: string,
    materialCenterName: string,
    items: Array<
      Pick<
        OrderItem,
        | 'productId'
        | 'productName'
        | 'productSku'
        | 'productUnit'
        | 'productUnitCode'
        | 'quantity'
        | 'unitPrice'
      > & { taxRate: number }
    >,
    createdBy: string,
    createdByRole: 'customer' | 'salesman' | 'admin',
    notes?: string
  ): Promise<Order> {
    const response = await fetch('/api/internal/orders', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        financialYear,
        customerId,
        customerName,
        customerState,
        companyState,
        saleTypeId,
        saleTypeName,
        voucherSeriesId,
        voucherSeriesName,
        materialCenterId,
        materialCenterName,
        items,
        createdBy,
        createdByRole,
        notes,
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Order;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to create order');
    }

    return data.data;
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    const response = await fetch(`/api/internal/orders/${orderId}/status`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (response.status === 404) {
      return null;
    }

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Order;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to update order status');
    }

    return data.data;
  }

  /**
   * Get orders with filters
   */
  async findWithFilter(filter: OrderFilter): Promise<Order[]> {
    const searchParams = new URLSearchParams();

    if (filter.customerId) {
      searchParams.set('customerId', filter.customerId);
    }

    if (filter.status) {
      searchParams.set('status', filter.status);
    }

    const response = await fetch(`/api/internal/orders?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Order[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to fetch filtered orders');
    }

    return data.data;
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();
