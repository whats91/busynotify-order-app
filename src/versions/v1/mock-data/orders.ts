/*
 * File Context:
 * Purpose: Defines the project file for Orders.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
// =====================================================
// MOCK DATA - Orders
// =====================================================

import type { Order, OrderItem, OrderSummary, OrderStatus } from '../../../shared/types';

const DEFAULT_ORDER_ITEM_TAX_PERCENTAGE = 18;

function withDefaultTax(
  item: Omit<
    OrderItem,
    | 'taxAmount'
    | 'taxPercentage'
    | 'unitPriceExcludingTax'
    | 'subtotal'
    | 'cgstPercentage'
    | 'cgstAmount'
    | 'sgstPercentage'
    | 'sgstAmount'
    | 'igstPercentage'
    | 'igstAmount'
  >
): OrderItem {
  const taxAmount = item.totalPrice * (DEFAULT_ORDER_ITEM_TAX_PERCENTAGE / 100);

  return {
    ...item,
    unitPriceExcludingTax: item.unitPrice,
    subtotal: item.totalPrice,
    totalPrice: item.totalPrice + taxAmount,
    taxAmount,
    taxPercentage: DEFAULT_ORDER_ITEM_TAX_PERCENTAGE,
    cgstPercentage: null,
    cgstAmount: null,
    sgstPercentage: null,
    sgstAmount: null,
    igstPercentage: DEFAULT_ORDER_ITEM_TAX_PERCENTAGE,
    igstAmount: taxAmount,
  };
}

// In-memory order storage (Phase 1)
let mockOrders: Order[] = [
  {
    id: 'ord_001',
    orderNumber: 'ORD-2024-0001',
    customerId: 'cust_001',
    customerName: 'Rahul Sharma',
    items: [
      withDefaultTax({
        id: 'item_001',
        productId: 'prod_001',
        productName: 'Wireless Mouse',
        productSku: 'ELEC-001',
        quantity: 5,
        unitPrice: 899,
        totalPrice: 4495,
      }),
      withDefaultTax({
        id: 'item_002',
        productId: 'prod_002',
        productName: 'Bluetooth Keyboard',
        productSku: 'ELEC-002',
        quantity: 3,
        unitPrice: 1499,
        totalPrice: 4497,
      }),
    ],
    subtotal: 8992,
    tax: 1618.56,
    total: 10610.56,
    status: 'delivered',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-18T14:00:00Z',
    createdBy: 'usr_002',
    createdByRole: 'customer',
  },
  {
    id: 'ord_002',
    orderNumber: 'ORD-2024-0002',
    customerId: 'cust_002',
    customerName: 'Priya Patel',
    items: [
      withDefaultTax({
        id: 'item_003',
        productId: 'prod_009',
        productName: 'Ergonomic Office Chair',
        productSku: 'FRN-001',
        quantity: 2,
        unitPrice: 8999,
        totalPrice: 17998,
      }),
    ],
    subtotal: 17998,
    tax: 3239.64,
    total: 21237.64,
    status: 'shipped',
    createdAt: '2024-01-20T09:15:00Z',
    updatedAt: '2024-01-21T11:00:00Z',
    createdBy: 'usr_003',
    createdByRole: 'salesman',
    notes: 'Delivery before 5 PM',
  },
  {
    id: 'ord_003',
    orderNumber: 'ORD-2024-0003',
    customerId: 'cust_003',
    customerName: 'Amit Kumar',
    items: [
      withDefaultTax({
        id: 'item_004',
        productId: 'prod_012',
        productName: 'HDMI Cable 2m',
        productSku: 'IT-001',
        quantity: 10,
        unitPrice: 299,
        totalPrice: 2990,
      }),
      withDefaultTax({
        id: 'item_005',
        productId: 'prod_013',
        productName: 'Laptop Stand',
        productSku: 'IT-002',
        quantity: 5,
        unitPrice: 1299,
        totalPrice: 6495,
      }),
      withDefaultTax({
        id: 'item_006',
        productId: 'prod_014',
        productName: 'Mouse Pad Large',
        productSku: 'IT-003',
        quantity: 5,
        unitPrice: 599,
        totalPrice: 2995,
      }),
    ],
    subtotal: 12480,
    tax: 2246.4,
    total: 14726.4,
    status: 'processing',
    createdAt: '2024-01-22T14:45:00Z',
    updatedAt: '2024-01-22T14:45:00Z',
    createdBy: 'usr_003',
    createdByRole: 'salesman',
  },
  {
    id: 'ord_004',
    orderNumber: 'ORD-2024-0004',
    customerId: 'cust_001',
    customerName: 'Rahul Sharma',
    items: [
      withDefaultTax({
        id: 'item_007',
        productId: 'prod_005',
        productName: 'A4 Copy Paper (500 sheets)',
        productSku: 'OFF-001',
        quantity: 20,
        unitPrice: 350,
        totalPrice: 7000,
      }),
      withDefaultTax({
        id: 'item_008',
        productId: 'prod_006',
        productName: 'Ball Pen Pack (10 pcs)',
        productSku: 'OFF-002',
        quantity: 10,
        unitPrice: 120,
        totalPrice: 1200,
      }),
    ],
    subtotal: 8200,
    tax: 1476,
    total: 9676,
    status: 'pending',
    createdAt: '2024-01-25T11:00:00Z',
    updatedAt: '2024-01-25T11:00:00Z',
    createdBy: 'usr_002',
    createdByRole: 'customer',
  },
];

// Generate order number
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const orderCount = mockOrders.length + 1;
  return `ORD-${year}-${orderCount.toString().padStart(4, '0')}`;
}

// Get all orders
export function getAllOrders(): Order[] {
  return mockOrders;
}

// Get orders by customer ID
export function getOrdersByCustomerId(customerId: string): Order[] {
  return mockOrders.filter(o => o.customerId === customerId);
}

// Get orders by creator (for salesman)
export function getOrdersByCreator(createdBy: string): Order[] {
  return mockOrders.filter(o => o.createdBy === createdBy);
}

// Get order by ID
export function getOrderById(id: string): Order | undefined {
  return mockOrders.find(o => o.id === id);
}

// Get order summaries
export function getOrderSummaries(): OrderSummary[] {
  return mockOrders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    total: o.total,
    status: o.status,
    createdAt: o.createdAt,
    itemCount: o.items.length,
  }));
}

// Create new order
export function createOrder(
  customerId: string,
  customerName: string,
  items: OrderItem[],
  createdBy: string,
  createdByRole: 'customer' | 'salesman' | 'admin',
  notes?: string
): Order {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal + tax;
  
  const newOrder: Order = {
    id: `ord_${Date.now()}`,
    orderNumber: generateOrderNumber(),
    customerId,
    customerName,
    items,
    subtotal,
    tax,
    total,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    createdByRole,
    notes,
  };
  
  mockOrders.unshift(newOrder);
  return newOrder;
}

// Update order status
export function updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
  const order = mockOrders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    return order;
  }
  return null;
}

// Get orders with filters
export function getFilteredOrders(filters: {
  customerId?: string;
  status?: OrderStatus;
  createdBy?: string;
}): Order[] {
  let orders = [...mockOrders];
  
  if (filters.customerId) {
    orders = orders.filter(o => o.customerId === filters.customerId);
  }
  
  if (filters.status) {
    orders = orders.filter(o => o.status === filters.status);
  }
  
  if (filters.createdBy) {
    orders = orders.filter(o => o.createdBy === filters.createdBy);
  }
  
  return orders;
}
