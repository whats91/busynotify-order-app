import 'server-only';

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Order, OrderItem, OrderStatus } from '@/shared/types';

interface OrderRow {
  id: number;
  order_number: string;
  company_id: number | null;
  financial_year: string | null;
  product_id: string | null;
  customer_id: string;
  customer_name: string;
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
  id: number;
  order_id: number;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
  cart_value: number;
}

interface CreateOrderParams {
  companyId?: number;
  financialYear?: string;
  customerId: string;
  customerName: string;
  createdBy: string;
  createdByRole: 'customer' | 'salesman' | 'admin';
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

interface OrderQueryOptions {
  customerId?: string;
  createdBy?: string;
  status?: OrderStatus;
}

const FALLBACK_DB_PATH = path.join(process.cwd(), 'data', 'busy-notify.sqlite');

declare global {
  var busyNotifyOrderDb: DatabaseSync | undefined;
  var busyNotifyOrderDbInitialized: boolean | undefined;
}

function resolveDatabasePath(): string {
  const rawUrl = process.env.DATABASE_URL?.trim();
  const normalizedPath = normalizeDatabaseUrl(rawUrl);

  if (normalizedPath) {
    try {
      mkdirSync(path.dirname(normalizedPath), { recursive: true });
      return normalizedPath;
    } catch (error) {
      console.warn('Falling back to local SQLite path:', error);
    }
  }

  mkdirSync(path.dirname(FALLBACK_DB_PATH), { recursive: true });
  return FALLBACK_DB_PATH;
}

function normalizeDatabaseUrl(databaseUrl?: string): string | null {
  if (!databaseUrl) {
    return null;
  }

  if (databaseUrl.startsWith('file:')) {
    const filePath = databaseUrl.slice(5);
    if (!filePath) {
      return null;
    }

    return path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
  }

  if (
    databaseUrl.endsWith('.db') ||
    databaseUrl.endsWith('.sqlite') ||
    databaseUrl.endsWith('.sqlite3')
  ) {
    return path.isAbsolute(databaseUrl)
      ? databaseUrl
      : path.resolve(process.cwd(), databaseUrl);
  }

  return null;
}

function initializeSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      company_id INTEGER,
      financial_year TEXT,
      product_id TEXT,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
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
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 18,
      line_total REAL NOT NULL,
      cart_value REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_salesman_id ON orders(salesman_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
  `);

  ensureColumnExists(db, 'orders', 'product_id', 'TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id)');
}

function ensureColumnExists(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const existingColumns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as unknown as Array<{ name?: string }>;

  const hasColumn = existingColumns.some((column) => column.name === columnName);

  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function getDb(): DatabaseSync {
  if (!global.busyNotifyOrderDb) {
    global.busyNotifyOrderDb = new DatabaseSync(resolveDatabasePath());
  }

  if (!global.busyNotifyOrderDbInitialized) {
    initializeSchema(global.busyNotifyOrderDb);
    global.busyNotifyOrderDbInitialized = true;
  }

  return global.busyNotifyOrderDb;
}

function mapOrderItems(rows: OrderItemRow[]): OrderItem[] {
  return rows.map((row) => ({
    id: String(row.id),
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.line_total,
  }));
}

function mapOrder(orderRow: OrderRow, itemRows: OrderItemRow[]): Order {
  return {
    id: String(orderRow.id),
    orderNumber: orderRow.order_number,
    customerId: orderRow.customer_id,
    customerName: orderRow.customer_name,
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

function loadOrderItems(orderIds: number[]): Map<number, OrderItemRow[]> {
  const db = getDb();

  if (orderIds.length === 0) {
    return new Map();
  }

  const placeholders = orderIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT id, order_id, product_id, product_name, product_sku, quantity, unit_price, tax_rate, line_total, cart_value
       FROM order_items
       WHERE order_id IN (${placeholders})
       ORDER BY id ASC`
    )
    .all(...orderIds) as unknown as OrderItemRow[];

  return rows.reduce((itemsByOrderId, row) => {
    const orderItems = itemsByOrderId.get(row.order_id) ?? [];
    orderItems.push(row);
    itemsByOrderId.set(row.order_id, orderItems);
    return itemsByOrderId;
  }, new Map<number, OrderItemRow[]>());
}

function generateOrderNumber(nextId: number): string {
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(nextId).padStart(6, '0')}`;
}

export function listStoredOrders(filters: OrderQueryOptions = {}): Order[] {
  const db = getDb();
  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

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
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderRows = db
    .prepare(
      `SELECT id, order_number, company_id, financial_year, product_id, customer_id, customer_name, salesman_id, cart_value, subtotal, tax, total, status, notes, created_by, created_by_role, created_at, updated_at
       FROM orders
       ${whereSql}
       ORDER BY datetime(created_at) DESC, id DESC`
    )
    .all(...params) as unknown as OrderRow[];

  const itemsByOrderId = loadOrderItems(orderRows.map((row) => row.id));

  return orderRows.map((row) => mapOrder(row, itemsByOrderId.get(row.id) ?? []));
}

export function getStoredOrderById(orderId: string): Order | null {
  const db = getDb();
  const numericOrderId = Number(orderId);

  if (!Number.isFinite(numericOrderId)) {
    return null;
  }

  const orderRow = db
    .prepare(
      `SELECT id, order_number, company_id, financial_year, product_id, customer_id, customer_name, salesman_id, cart_value, subtotal, tax, total, status, notes, created_by, created_by_role, created_at, updated_at
       FROM orders
       WHERE id = ?`
    )
    .get(numericOrderId) as OrderRow | undefined;

  if (!orderRow) {
    return null;
  }

  const itemRows = loadOrderItems([orderRow.id]).get(orderRow.id) ?? [];
  return mapOrder(orderRow, itemRows);
}

export function createStoredOrder(params: CreateOrderParams): Order {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const subtotal = params.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const tax = params.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity * (item.taxRate / 100),
    0
  );
  const total = subtotal + tax;
  const cartValue = total;
  const salesmanId = params.createdByRole === 'salesman' ? params.createdBy : null;

  db.exec('BEGIN');

  try {
    const nextIdRow = db
      .prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM orders')
      .get() as { nextId: number };
    const orderNumber = generateOrderNumber(nextIdRow.nextId);

    const orderInsert = db.prepare(`
      INSERT INTO orders (
        order_number,
        company_id,
        financial_year,
        product_id,
        customer_id,
        customer_name,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertResult = orderInsert.run(
      orderNumber,
      params.companyId ?? null,
      params.financialYear ?? null,
      params.items[0]?.productId ?? null,
      params.customerId,
      params.customerName,
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

    const orderId = Number(insertResult.lastInsertRowid);
    const itemInsert = db.prepare(`
      INSERT INTO order_items (
        order_id,
        product_id,
        product_name,
        product_sku,
        quantity,
        unit_price,
        tax_rate,
        line_total,
        cart_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of params.items) {
      const lineTotal = item.unitPrice * item.quantity;
      itemInsert.run(
        orderId,
        item.productId,
        item.productName,
        item.productSku,
        item.quantity,
        item.unitPrice,
        item.taxRate,
        lineTotal,
        lineTotal
      );
    }

    db.exec('COMMIT');
    return getStoredOrderById(String(orderId)) as Order;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function updateStoredOrderStatus(orderId: string, status: OrderStatus): Order | null {
  const db = getDb();
  const numericOrderId = Number(orderId);

  if (!Number.isFinite(numericOrderId)) {
    return null;
  }

  const result = db
    .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), numericOrderId);

  if (result.changes === 0) {
    return null;
  }

  return getStoredOrderById(String(numericOrderId));
}
