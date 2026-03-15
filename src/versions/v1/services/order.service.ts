/*
 * File Context:
 * Purpose: Implements service-layer behavior for Order.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/order.repository.ts
 * Role: application data/service layer.
 */
// =====================================================
// ORDER SERVICE - Business Logic for Order Operations
// =====================================================

import type { Order, OrderItem, OrderStatus, OrderFilter } from '../../../shared/types';
import { orderRepository } from '../repositories/order.repository';

function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function normalizeState(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase();
  return normalizedValue ? normalizedValue.replace(/\s+/g, ' ') : null;
}

export class OrderService {
  /**
   * Get all orders
   */
  async getAllOrders(): Promise<Order[]> {
    return orderRepository.findAll();
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<Order | null> {
    return orderRepository.findById(id);
  }

  /**
   * Get orders for a customer
   */
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return orderRepository.findByCustomerId(customerId);
  }

  /**
   * Get orders created by a user (salesman)
   */
  async getOrdersByCreator(createdBy: string): Promise<Order[]> {
    return orderRepository.findByCreator(createdBy);
  }

  /**
   * Get orders with filters
   */
  async getFilteredOrders(filter: OrderFilter): Promise<Order[]> {
    return orderRepository.findWithFilter(filter);
  }

  /**
   * Create new order
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
    voucherSeriesId: string;
    voucherSeriesName: string;
    materialCenterId: string;
    materialCenterName: string;
    items: Array<{
      productId: string;
      productName: string;
      productSku: string;
      productUnit?: string;
      productUnitCode?: number;
      quantity: number;
      unitPrice: number;
      subtotal?: number;
      totalPrice?: number;
      taxAmount?: number;
      taxRate: number;
    }>;
    createdBy: string;
    createdByRole: 'customer' | 'salesman' | 'admin';
    notes?: string;
  }): Promise<{
    success: boolean;
    order?: Order;
    error?: string;
  }> {
    try {
      const customerState = normalizeState(params.customerState);
      const companyState = normalizeState(params.companyState);
      const sameState =
        customerState && companyState ? customerState === companyState : null;

      const orderItems: OrderItem[] = params.items.map((item) => {
        const rawSubtotal = item.subtotal ?? item.totalPrice ?? item.unitPrice * item.quantity;
        const subtotal = roundCurrency(rawSubtotal);
        const taxAmount = roundCurrency(
          item.taxAmount ?? rawSubtotal * (item.taxRate / 100)
        );
        const totalPrice = roundCurrency(subtotal + taxAmount);
        const unitPriceExcludingTax =
          item.quantity > 0 ? roundCurrency(subtotal / item.quantity) : roundCurrency(item.unitPrice);
        const taxPercentage = roundCurrency(item.taxRate);
        const cgstPercentage = sameState === true ? roundCurrency(taxPercentage / 2) : null;
        const cgstAmount = sameState === true ? roundCurrency(taxAmount / 2) : null;
        const sgstPercentage =
          sameState === true && cgstPercentage != null
            ? roundCurrency(taxPercentage - cgstPercentage)
            : null;
        const sgstAmount =
          sameState === true && cgstAmount != null
            ? roundCurrency(taxAmount - cgstAmount)
            : null;

        return {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          productUnit: item.productUnit,
          productUnitCode: item.productUnitCode,
          quantity: item.quantity,
          unitPrice: roundCurrency(item.unitPrice),
          unitPriceExcludingTax,
          subtotal,
          totalPrice,
          taxAmount,
          taxPercentage,
          cgstPercentage,
          cgstAmount,
          sgstPercentage,
          sgstAmount,
          igstPercentage: sameState === false ? taxPercentage : null,
          igstAmount: sameState === false ? taxAmount : null,
        };
      });

      const order = await orderRepository.create(
        params.companyId,
        params.financialYear,
        params.customerId,
        params.customerName,
        params.customerState,
        params.companyState,
        params.saleTypeId,
        params.saleTypeName,
        params.voucherSeriesId,
        params.voucherSeriesName,
        params.materialCenterId,
        params.materialCenterName,
        orderItems.map((orderItem, index) => ({
          ...orderItem,
          productUnit: params.items[index]?.productUnit,
          productUnitCode: params.items[index]?.productUnitCode,
          subtotal: orderItem.subtotal,
          taxRate: params.items[index]?.taxRate ?? 18,
        })),
        params.createdBy,
        params.createdByRole,
        params.notes
      );
      
      return {
        success: true,
        order,
      };
    } catch (error) {
      console.error('Failed to create order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<{
    success: boolean;
    order?: Order;
    error?: string;
  }> {
    try {
      const order = await orderRepository.updateStatus(orderId, status);
      
      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        };
      }
      
      return {
        success: true,
        order,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update order status',
      };
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const wasDeleted = await orderRepository.delete(orderId);

      if (!wasDeleted) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete order',
      };
    }
  }
}

// Singleton instance
export const orderService = new OrderService();
