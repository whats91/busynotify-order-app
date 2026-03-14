/*
 * File Context:
 * Purpose: Implements controller-level coordination for Order.Controller.
 * Primary Functionality: Bridges UI or orchestration needs with the underlying service layer.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/services/order.service.ts
 * Role: application data/service layer.
 */
// =====================================================
// ORDER CONTROLLER - Request/Response Handling for Orders
// =====================================================

import type { Order, OrderFilter, ApiResponse, OrderStatus } from '../../../shared/types';
import { orderService } from '../services/order.service';

export class OrderController {
  /**
   * Get all orders
   * @future This will be called by GET /api/orders
   */
  async getAllOrders(): Promise<ApiResponse<{ orders: Order[] }>> {
    try {
      const orders = await orderService.getAllOrders();
      
      return {
        success: true,
        data: { orders },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch orders',
      };
    }
  }

  /**
   * Get order by ID
   * @future This will be called by GET /api/orders/:id
   */
  async getOrderById(id: string): Promise<ApiResponse<{ order: Order }>> {
    try {
      const order = await orderService.getOrderById(id);
      
      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        };
      }
      
      return {
        success: true,
        data: { order },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch order',
      };
    }
  }

  /**
   * Get orders by customer
   * @future This will be called by GET /api/orders?customerId=xxx
   */
  async getOrdersByCustomer(customerId: string): Promise<ApiResponse<{ orders: Order[] }>> {
    try {
      const orders = await orderService.getOrdersByCustomer(customerId);
      
      return {
        success: true,
        data: { orders },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch orders',
      };
    }
  }

  /**
   * Get orders by creator
   * @future This will be called by GET /api/orders?createdBy=xxx
   */
  async getOrdersByCreator(createdBy: string): Promise<ApiResponse<{ orders: Order[] }>> {
    try {
      const orders = await orderService.getOrdersByCreator(createdBy);
      
      return {
        success: true,
        data: { orders },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch orders',
      };
    }
  }

  /**
   * Create order
   * @future This will be called by POST /api/orders
   */
  async createOrder(params: {
    companyId?: number;
    financialYear?: string;
    customerId: string;
    customerName: string;
    customerState: string;
    companyState: string;
    saleTypeId: string;
    saleTypeName: string;
    materialCenterId: string;
    materialCenterName: string;
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
    createdBy: string;
    createdByRole: 'customer' | 'salesman' | 'admin';
    notes?: string;
  }): Promise<ApiResponse<{ order: Order }>> {
    const result = await orderService.createOrder(params);
    
    if (result.success && result.order) {
      return {
        success: true,
        data: { order: result.order },
        message: 'Order created successfully',
      };
    }
    
    return {
      success: false,
      error: result.error || 'Failed to create order',
    };
  }

  /**
   * Update order status
   * @future This will be called by PATCH /api/orders/:id/status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<ApiResponse<{ order: Order }>> {
    const result = await orderService.updateOrderStatus(orderId, status);
    
    if (result.success && result.order) {
      return {
        success: true,
        data: { order: result.order },
        message: 'Order status updated',
      };
    }
    
    return {
      success: false,
      error: result.error || 'Failed to update order status',
    };
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId: string): Promise<ApiResponse<Record<string, never>>> {
    const result = await orderService.deleteOrder(orderId);

    if (result.success) {
      return {
        success: true,
        data: {},
        message: 'Order deleted',
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to delete order',
    };
  }
}

// Singleton instance
export const orderController = new OrderController();
