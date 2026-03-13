/*
 * File Context:
 * Purpose: Implements server-side infrastructure for Product Config Db.
 * Primary Functionality: Owns server-side persistence, schema initialization, or backend data access for this domain.
 * Interlinked With: src/lib/db.ts, src/shared/config/index.ts, src/shared/types/index.ts
 * Role: server infrastructure.
 */
import 'server-only';

import type { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { defaultProductFieldConfig, defaultProductStockDisplaySettings } from '@/shared/config';
import type {
  ProductConfiguration,
  ProductFieldConfig,
  ProductFieldKey,
  ProductStockDisplaySettings,
  UpdateProductFieldConfigPayload,
} from '@/shared/types';

interface ProductFieldConfigRow {
  field_key: ProductFieldKey;
  label: string;
  description: string | null;
  is_visible: number | bigint;
  sort_order: number | bigint;
  updated_at: string;
}

interface ProductStockDisplaySettingsRow {
  show_exact_stock_quantity: number | bigint;
  show_out_of_stock_products: number | bigint;
  updated_at: string;
}

type SqlExecutor = Pick<PrismaClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

declare global {
  var busyNotifyProductConfigDbInitialized: Promise<void> | undefined;
}

function mapProductFieldConfig(row: ProductFieldConfigRow): ProductFieldConfig {
  return {
    fieldKey: row.field_key,
    label: row.label,
    description: row.description || undefined,
    isVisible: Number(row.is_visible) === 1,
    sortOrder: Number(row.sort_order),
  };
}

function mapProductStockDisplaySettings(
  row: ProductStockDisplaySettingsRow
): ProductStockDisplaySettings {
  return {
    showExactStockQuantity: Number(row.show_exact_stock_quantity) === 1,
    showOutOfStockProducts: Number(row.show_out_of_stock_products) === 1,
  };
}

async function seedDefaultConfig(executor: SqlExecutor) {
  const timestamp = new Date().toISOString();

  for (const field of defaultProductFieldConfig) {
    await executor.$executeRawUnsafe(
      `INSERT INTO product_field_config (
        field_key,
        label,
        description,
        is_visible,
        sort_order,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(field_key) DO UPDATE SET
        label = excluded.label,
        description = excluded.description,
        sort_order = excluded.sort_order`,
      field.fieldKey,
      field.label,
      field.description || null,
      field.isVisible ? 1 : 0,
      field.sortOrder,
      timestamp
    );
  }
}

async function seedDefaultStockDisplaySettings(executor: SqlExecutor) {
  const timestamp = new Date().toISOString();

  await executor.$executeRawUnsafe(
    `INSERT INTO product_stock_display_config (
      id,
      show_exact_stock_quantity,
      show_out_of_stock_products,
      updated_at
    ) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`,
    1,
    defaultProductStockDisplaySettings.showExactStockQuantity ? 1 : 0,
    defaultProductStockDisplaySettings.showOutOfStockProducts ? 1 : 0,
    timestamp
  );
}

async function initializeSchema() {
  if (!global.busyNotifyProductConfigDbInitialized) {
    global.busyNotifyProductConfigDbInitialized = (async () => {
      await db.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await db.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS product_field_config (
          field_key TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          description TEXT,
          is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
          sort_order INTEGER NOT NULL,
          updated_at TEXT NOT NULL
        )`
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_product_field_config_sort_order
         ON product_field_config(sort_order)`
      );
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS product_stock_display_config (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          show_exact_stock_quantity INTEGER NOT NULL DEFAULT 1
            CHECK (show_exact_stock_quantity IN (0, 1)),
          show_out_of_stock_products INTEGER NOT NULL DEFAULT 1
            CHECK (show_out_of_stock_products IN (0, 1)),
          updated_at TEXT NOT NULL
        )`
      );
      await seedDefaultConfig(db);
      await seedDefaultStockDisplaySettings(db);
    })();
  }

  await global.busyNotifyProductConfigDbInitialized;
}

export async function listProductFieldConfig(): Promise<ProductFieldConfig[]> {
  await initializeSchema();
  await seedDefaultConfig(db);

  const rows = await db.$queryRawUnsafe<ProductFieldConfigRow[]>(
    `SELECT field_key, label, description, is_visible, sort_order, updated_at
     FROM product_field_config
     ORDER BY sort_order ASC, field_key ASC`
  );

  return rows.map(mapProductFieldConfig);
}

export async function getProductStockDisplaySettings(): Promise<ProductStockDisplaySettings> {
  await initializeSchema();
  await seedDefaultStockDisplaySettings(db);

  const rows = await db.$queryRawUnsafe<ProductStockDisplaySettingsRow[]>(
    `SELECT show_exact_stock_quantity, show_out_of_stock_products, updated_at
     FROM product_stock_display_config
     WHERE id = 1
     LIMIT 1`
  );

  if (!rows[0]) {
    return defaultProductStockDisplaySettings;
  }

  return mapProductStockDisplaySettings(rows[0]);
}

export async function getProductConfiguration(): Promise<ProductConfiguration> {
  const [fields, stockSettings] = await Promise.all([
    listProductFieldConfig(),
    getProductStockDisplaySettings(),
  ]);

  return {
    fields,
    stockSettings,
  };
}

export async function updateProductFieldConfig(
  updates: UpdateProductFieldConfigPayload[]
): Promise<ProductFieldConfig[]> {
  await initializeSchema();

  await db.$transaction(async (tx) => {
    await seedDefaultConfig(tx);

    const timestamp = new Date().toISOString();

    for (const update of updates) {
      await tx.$executeRawUnsafe(
        `UPDATE product_field_config
         SET is_visible = ?, updated_at = ?
         WHERE field_key = ?`,
        update.isVisible ? 1 : 0,
        timestamp,
        update.fieldKey
      );
    }
  });

  return listProductFieldConfig();
}

export async function updateProductStockDisplaySettings(
  settings: ProductStockDisplaySettings
): Promise<ProductStockDisplaySettings> {
  await initializeSchema();

  const timestamp = new Date().toISOString();

  await db.$transaction(async (tx) => {
    await seedDefaultStockDisplaySettings(tx);
    await tx.$executeRawUnsafe(
      `UPDATE product_stock_display_config
       SET show_exact_stock_quantity = ?,
           show_out_of_stock_products = ?,
           updated_at = ?
       WHERE id = 1`,
      settings.showExactStockQuantity ? 1 : 0,
      settings.showOutOfStockProducts ? 1 : 0,
      timestamp
    );
  });

  return getProductStockDisplaySettings();
}

export async function updateProductConfiguration(
  updates: UpdateProductFieldConfigPayload[],
  stockSettings: ProductStockDisplaySettings
): Promise<ProductConfiguration> {
  await initializeSchema();

  await db.$transaction(async (tx) => {
    await seedDefaultConfig(tx);
    await seedDefaultStockDisplaySettings(tx);

    const timestamp = new Date().toISOString();

    for (const update of updates) {
      await tx.$executeRawUnsafe(
        `UPDATE product_field_config
         SET is_visible = ?, updated_at = ?
         WHERE field_key = ?`,
        update.isVisible ? 1 : 0,
        timestamp,
        update.fieldKey
      );
    }

    await tx.$executeRawUnsafe(
      `UPDATE product_stock_display_config
       SET show_exact_stock_quantity = ?,
           show_out_of_stock_products = ?,
           updated_at = ?
       WHERE id = 1`,
      stockSettings.showExactStockQuantity ? 1 : 0,
      stockSettings.showOutOfStockProducts ? 1 : 0,
      timestamp
    );
  });

  return getProductConfiguration();
}
