/*
 * File Context:
 * Purpose: Implements server-side infrastructure for Order Db.
 * Primary Functionality: Owns server-side persistence, schema initialization, or backend data access for this domain.
 * Interlinked With: src/lib/db.ts, src/shared/types/index.ts
 * Role: server infrastructure.
 */
import 'server-only';

import type { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import type { Order, OrderItem, OrderStatus } from '@/shared/types';

interface OrderRow {
  id: number | bigint;
  order_number: string;
  company_id: number | bigint | null;
  financial_year: string | null;
  product_id: string | null;
  customer_id: string;
  customer_name: string;
  customer_state: string | null;
  company_state: string | null;
  sale_type_id: string | null;
  sale_type_name: string | null;
  voucher_series_id: string | null;
  voucher_series_name: string | null;
  material_center_id: string | null;
  material_center_name: string | null;
  salesman_id: string | null;
  cart_value: number;
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  created_by: string;
  created_by_role: 'customer' | 'salesman' | 'admin';
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  id: number | bigint;
  order_id: number | bigint;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_unit: string | null;
  product_unit_code: number | bigint | null;
  quantity: number | bigint;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  cart_value: number;
}

interface CreateOrderParams {
  companyId?: number;
  financialYear?: string;
  customerId: string;
  customerName: string;
  customerState?: string;
  companyState?: string;
  saleTypeId?: string;
  saleTypeName?: string;
  voucherSeriesId?: string;
  voucherSeriesName?: string;
  materialCenterId?: string;
  materialCenterName?: string;
  createdBy: string;
  createdByRole: 'customer' | 'salesman' | 'admin';
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    productUnit?: string;
    productUnitCode?: number;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

interface OrderQueryOptions {
  companyId?: number;
  customerId?: string;
  createdBy?: string;
  status?: OrderStatus;
  statuses?: OrderStatus[];
}

type SqlExecutor = Pick<PrismaClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

declare global {
  var busyNotifyOrderDbInitialized: Promise<void> | undefined;
}

function toNumber(value: number | bigint | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return typeof value === 'bigint' ? Number(value) : value;
}

function mapOrderItems(rows: OrderItemRow[]): OrderItem[] {
  return rows.map((row) => ({
    id: String(row.id),
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    productUnit: row.product_unit || undefined,
    productUnitCode: row.product_unit_code == null ? undefined : toNumber(row.product_unit_code),
    quantity: toNumber(row.quantity),
    unitPrice: row.unit_price,
    totalPrice: row.line_total,
    taxAmount: row.tax_amount,
    taxPercentage: row.tax_rate,
  }));
}

function mapOrder(orderRow: OrderRow, itemRows: OrderItemRow[]): Order {
  return {
    id: String(orderRow.id),
    orderNumber: orderRow.order_number,
    customerId: orderRow.customer_id,
    customerName: orderRow.customer_name,
    customerState: orderRow.customer_state || undefined,
    companyState: orderRow.company_state || undefined,
    saleTypeId: orderRow.sale_type_id || undefined,
    saleTypeName: orderRow.sale_type_name || undefined,
    voucherSeriesId: orderRow.voucher_series_id || undefined,
    voucherSeriesName: orderRow.voucher_series_name || undefined,
    materialCenterId: orderRow.material_center_id || undefined,
    materialCenterName: orderRow.material_center_name || undefined,
    items: mapOrderItems(itemRows),
    subtotal: orderRow.subtotal,
    tax: orderRow.tax,
    total: orderRow.total,
    status: orderRow.status,
    createdAt: orderRow.created_at,
    updatedAt: orderRow.updated_at,
    createdBy: orderRow.created_by,
    createdByRole: orderRow.created_by_role,
    notes: orderRow.notes || undefined,
  };
}

async function ensureColumnExists(
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const existingColumns = await db.$queryRawUnsafe<Array<{ name?: string }>>(
    `PRAGMA table_info(${tableName})`
  );

  const hasColumn = existingColumns.some((column) => column.name === columnName);

  if (!hasColumn) {
    await db.$executeRawUnsafe(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
    );
  }
}

async function initializeSchema() {
  if (!global.busyNotifyOrderDbInitialized) {
    global.busyNotifyOrderDbInitialized = (async () => {
      await db.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await db.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT NOT NULL UNIQUE,
          company_id INTEGER,
          financial_year TEXT,
          product_id TEXT,
          customer_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_state TEXT,
          company_state TEXT,
          sale_type_id TEXT,
          sale_type_name TEXT,
          voucher_series_id TEXT,
          voucher_series_name TEXT,
          material_center_id TEXT,
          material_center_name TEXT,
          salesman_id TEXT,
          cart_value REAL NOT NULL,
          subtotal REAL NOT NULL,
          tax REAL NOT NULL,
          total REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          notes TEXT,
          created_by TEXT NOT NULL,
          created_by_role TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      );
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          product_sku TEXT NOT NULL,
          product_unit TEXT,
          product_unit_code INTEGER,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          tax_rate REAL NOT NULL DEFAULT 18,
          tax_amount REAL NOT NULL DEFAULT 0,
          line_total REAL NOT NULL,
          cart_value REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )`
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_orders_salesman_id ON orders(salesman_id)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)'
      );
      await ensureColumnExists('orders', 'product_id', 'TEXT');
      await ensureColumnExists('orders', 'customer_state', 'TEXT');
      await ensureColumnExists('orders', 'company_state', 'TEXT');
      await ensureColumnExists('orders', 'sale_type_id', 'TEXT');
      await ensureColumnExists('orders', 'sale_type_name', 'TEXT');
      await ensureColumnExists('orders', 'voucher_series_id', 'TEXT');
      await ensureColumnExists('orders', 'voucher_series_name', 'TEXT');
      await ensureColumnExists('orders', 'material_center_id', 'TEXT');
      await ensureColumnExists('orders', 'material_center_name', 'TEXT');
      await ensureColumnExists('order_items', 'tax_amount', 'REAL NOT NULL DEFAULT 0');
      await ensureColumnExists('order_items', 'product_unit', 'TEXT');
      await ensureColumnExists('order_items', 'product_unit_code', 'INTEGER');
      await db.$executeRawUnsafe(
        `UPDATE order_items
         SET tax_amount = ROUND(line_total * (tax_rate / 100.0), 6)
         WHERE tax_rate > 0 AND (tax_amount IS NULL OR tax_amount = 0)`
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id)'
      );
    })();
  }

  await global.busyNotifyOrderDbInitialized;
}

async function loadOrderItems(
  executor: SqlExecutor,
  orderIds: number[]
): Promise<Map<number, OrderItemRow[]>> {
  if (orderIds.length === 0) {
    return new Map();
  }

  const placeholders = orderIds.map(() => '?').join(', ');
  const rows = await executor.$queryRawUnsafe<OrderItemRow[]>(
    `SELECT id, order_id, product_id, product_name, product_sku, product_unit, product_unit_code,
            quantity, unit_price, tax_rate,
            COALESCE(tax_amount, ROUND(line_total * (tax_rate / 100.0), 6)) AS tax_amount,
            line_total, cart_value
     FROM order_items
     WHERE order_id IN (${placeholders})
     ORDER BY id ASC`,
    ...orderIds
  );

  return rows.reduce((itemsByOrderId, row) => {
    const orderId = toNumber(row.order_id);
    const orderItems = itemsByOrderId.get(orderId) ?? [];
    orderItems.push(row);
    itemsByOrderId.set(orderId, orderItems);
    return itemsByOrderId;
  }, new Map<number, OrderItemRow[]>());
}

function generateOrderNumber(nextId: number): string {
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(nextId).padStart(6, '0')}`;
}

export async function listStoredOrders(filters: OrderQueryOptions = {}): Promise<Order[]> {
  await initializeSchema();

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.companyId != null) {
    whereClauses.push('company_id = ?');
    params.push(filters.companyId);
  }

  if (filters.customerId) {
    whereClauses.push('customer_id = ?');
    params.push(filters.customerId);
  }

  if (filters.createdBy) {
    whereClauses.push('created_by = ?');
    params.push(filters.createdBy);
  }

  if (filters.status) {
    whereClauses.push('status = ?');
    params.push(filters.status);
  } else if (filters.statuses && filters.statuses.length > 0) {
    const statusPlaceholders = filters.statuses.map(() => '?').join(', ');
    whereClauses.push(`status IN (${statusPlaceholders})`);
    params.push(...filters.statuses);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderRows = await db.$queryRawUnsafe<OrderRow[]>(
    `SELECT id, order_number, company_id, financial_year, product_id, customer_id, customer_name, customer_state, company_state, sale_type_id, sale_type_name, voucher_series_id, voucher_series_name, material_center_id, material_center_name, salesman_id, cart_value, subtotal, tax, total, status, notes, created_by, created_by_role, created_at, updated_at
     FROM orders
     ${whereSql}
     ORDER BY datetime(created_at) DESC, id DESC`,
    ...params
  );

  const itemsByOrderId = await loadOrderItems(
    db,
    orderRows.map((row) => toNumber(row.id))
  );

  return orderRows.map((row) => mapOrder(row, itemsByOrderId.get(toNumber(row.id)) ?? []));
}

export async function getStoredOrderById(
  orderId: string,
  companyId?: number
): Promise<Order | null> {
  await initializeSchema();

  const numericOrderId = Number(orderId);

  if (!Number.isFinite(numericOrderId)) {
    return null;
  }

  const params: Array<string | number> = [numericOrderId];
  const companyFilterSql =
    companyId != null
      ? (() => {
          params.push(companyId);
          return ' AND company_id = ?';
        })()
      : '';

  const orderRows = await db.$queryRawUnsafe<OrderRow[]>(
    `SELECT id, order_number, company_id, financial_year, product_id, customer_id, customer_name, customer_state, company_state, sale_type_id, sale_type_name, voucher_series_id, voucher_series_name, material_center_id, material_center_name, salesman_id, cart_value, subtotal, tax, total, status, notes, created_by, created_by_role, created_at, updated_at
     FROM orders
     WHERE id = ?${companyFilterSql}`,
    ...params
  );

  const orderRow = orderRows[0];

  if (!orderRow) {
    return null;
  }

  const itemRows = (await loadOrderItems(db, [numericOrderId])).get(numericOrderId) ?? [];
  return mapOrder(orderRow, itemRows);
}

export async function createStoredOrder(params: CreateOrderParams): Promise<Order> {
  await initializeSchema();

  const timestamp = new Date().toISOString();
  const subtotal = params.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = params.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity * (item.taxRate / 100),
    0
  );
  const total = subtotal + tax;
  const cartValue = total;
  const salesmanId = params.createdByRole === 'salesman' ? params.createdBy : null;

  const orderId = await db.$transaction(async (tx) => {
    const nextIdRows = await tx.$queryRawUnsafe<Array<{ nextId: number | bigint }>>(
      'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM orders'
    );
    const nextId = toNumber(nextIdRows[0]?.nextId);
    const orderNumber = generateOrderNumber(nextId || 1);

    await tx.$executeRawUnsafe(
      `INSERT INTO orders (
        order_number,
        company_id,
        financial_year,
        product_id,
        customer_id,
        customer_name,
        customer_state,
        company_state,
        sale_type_id,
        sale_type_name,
        voucher_series_id,
        voucher_series_name,
        material_center_id,
        material_center_name,
        salesman_id,
        cart_value,
        subtotal,
        tax,
        total,
        status,
        notes,
        created_by,
        created_by_role,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      orderNumber,
      params.companyId ?? null,
      params.financialYear ?? null,
      params.items[0]?.productId ?? null,
      params.customerId,
      params.customerName,
      params.customerState?.trim() || null,
      params.companyState?.trim() || null,
      params.saleTypeId?.trim() || null,
      params.saleTypeName?.trim() || null,
      params.voucherSeriesId?.trim() || null,
      params.voucherSeriesName?.trim() || null,
      params.materialCenterId?.trim() || null,
      params.materialCenterName?.trim() || null,
      salesmanId,
      cartValue,
      subtotal,
      tax,
      total,
      'pending',
      params.notes ?? null,
      params.createdBy,
      params.createdByRole,
      timestamp,
      timestamp
    );

    const orderIdRows = await tx.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      'SELECT last_insert_rowid() AS id'
    );
    const createdOrderId = toNumber(orderIdRows[0]?.id);

    for (const item of params.items) {
      const lineTotal = item.unitPrice * item.quantity;
      const lineTaxAmount = Number((lineTotal * (item.taxRate / 100)).toFixed(6));

      await tx.$executeRawUnsafe(
        `INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          product_sku,
          product_unit,
          product_unit_code,
          quantity,
          unit_price,
          tax_rate,
          tax_amount,
          line_total,
          cart_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        createdOrderId,
        item.productId,
        item.productName,
        item.productSku,
        item.productUnit?.trim() || null,
        item.productUnitCode ?? null,
        item.quantity,
        item.unitPrice,
        item.taxRate,
        lineTaxAmount,
        lineTotal,
        lineTotal
      );
    }

    return createdOrderId;
  });

  const order = await getStoredOrderById(String(orderId));

  if (!order) {
    throw new Error('Order was created but could not be reloaded.');
  }

  return order;
}

export async function updateStoredOrderStatus(
  orderId: string,
  status: OrderStatus,
  companyId?: number
): Promise<Order | null> {
  await initializeSchema();

  const numericOrderId = Number(orderId);

  if (!Number.isFinite(numericOrderId)) {
    return null;
  }

  const params: Array<string | number> = [status, new Date().toISOString(), numericOrderId];
  const companyFilterSql =
    companyId != null
      ? (() => {
          params.push(companyId);
          return ' AND company_id = ?';
        })()
      : '';

  const updatedCount = await db.$executeRawUnsafe(
    `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?${companyFilterSql}`,
    ...params
  );

  if (updatedCount === 0) {
    return null;
  }

  return getStoredOrderById(String(numericOrderId), companyId);
}
