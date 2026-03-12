import 'server-only';

import type { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { defaultProductFieldConfig } from '@/shared/config';
import type {
  ProductFieldConfig,
  ProductFieldKey,
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
      await seedDefaultConfig(db);
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
