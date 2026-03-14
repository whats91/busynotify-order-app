/*
 * File Context:
 * Purpose: Implements server-side persistence for company-scoped order-number configuration.
 * Primary Functionality: Stores admin-defined formatting rules and atomically reserves the next serial value.
 * Interlinked With: src/lib/db.ts, src/lib/server/order-db.ts, src/shared/lib/order-number-format.ts, src/shared/types/index.ts
 * Role: server infrastructure.
 */
import 'server-only';

import type { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { buildOrderNumberFromConfig } from '@/shared/lib/order-number-format';
import type {
  OrderNumberConfig,
  UpdateOrderNumberConfigPayload,
} from '@/shared/types';

interface OrderNumberConfigRow {
  company_id: number | bigint;
  financial_year: string;
  prefix: string;
  suffix: string;
  separator_value: string;
  include_year: number | bigint;
  include_month: number | bigint;
  include_day: number | bigint;
  serial_position: OrderNumberConfig['serialPosition'];
  serial_padding: number | bigint;
  last_serial: number | bigint;
  updated_at: string;
}

type SqlExecutor = Pick<PrismaClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

declare global {
  var busyNotifyOrderNumberConfigDbInitialized: Promise<void> | undefined;
}

function toNumber(value: number | bigint | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return typeof value === 'bigint' ? Number(value) : value;
}

function buildDefaultOrderNumberConfig(
  companyId: number,
  financialYear: string,
  lastSerial = 0
): OrderNumberConfig {
  return {
    companyId,
    financialYear,
    prefix: 'ORD',
    suffix: '',
    separator: '-',
    includeYear: true,
    includeMonth: false,
    includeDay: false,
    serialPosition: 'beforeSuffix',
    serialPadding: 6,
    lastSerial,
  };
}

function mapConfigRow(row: OrderNumberConfigRow): OrderNumberConfig {
  return {
    companyId: toNumber(row.company_id),
    financialYear: row.financial_year,
    prefix: row.prefix,
    suffix: row.suffix,
    separator: row.separator_value,
    includeYear: toNumber(row.include_year) === 1,
    includeMonth: toNumber(row.include_month) === 1,
    includeDay: toNumber(row.include_day) === 1,
    serialPosition: row.serial_position,
    serialPadding: toNumber(row.serial_padding),
    lastSerial: toNumber(row.last_serial),
    updatedAt: row.updated_at,
  };
}

async function initializeSchema() {
  if (!global.busyNotifyOrderNumberConfigDbInitialized) {
    global.busyNotifyOrderNumberConfigDbInitialized = (async () => {
      await db.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await db.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS order_number_config (
          company_id INTEGER NOT NULL,
          financial_year TEXT NOT NULL,
          prefix TEXT NOT NULL DEFAULT 'ORD',
          suffix TEXT NOT NULL DEFAULT '',
          separator_value TEXT NOT NULL DEFAULT '-',
          include_year INTEGER NOT NULL DEFAULT 1,
          include_month INTEGER NOT NULL DEFAULT 0,
          include_day INTEGER NOT NULL DEFAULT 0,
          serial_position TEXT NOT NULL DEFAULT 'beforeSuffix',
          serial_padding INTEGER NOT NULL DEFAULT 6,
          last_serial INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (company_id, financial_year)
        )`
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_order_number_config_updated_at
         ON order_number_config(updated_at DESC)`
      );
    })();
  }

  await global.busyNotifyOrderNumberConfigDbInitialized;
}

async function getCurrentOrderSerial(
  executor: SqlExecutor,
  companyId: number,
  financialYear: string
) {
  const rows = await executor.$queryRawUnsafe<Array<{ lastSerial: number | bigint }>>(
    `SELECT COALESCE(MAX(id), 0) AS lastSerial
     FROM orders
     WHERE company_id = ? AND financial_year = ?`,
    companyId,
    financialYear
  );

  return toNumber(rows[0]?.lastSerial);
}

export async function getOrderNumberConfig(
  companyId: number,
  financialYear: string
): Promise<OrderNumberConfig> {
  await initializeSchema();

  const rows = await db.$queryRawUnsafe<OrderNumberConfigRow[]>(
    `SELECT company_id, financial_year, prefix, suffix, separator_value, include_year,
            include_month, include_day, serial_position, serial_padding, last_serial, updated_at
     FROM order_number_config
     WHERE company_id = ? AND financial_year = ?`,
    companyId,
    financialYear
  );

  const row = rows[0];

  if (row) {
    return mapConfigRow(row);
  }

  const lastSerial = await getCurrentOrderSerial(db, companyId, financialYear);
  return buildDefaultOrderNumberConfig(companyId, financialYear, lastSerial);
}

export async function upsertOrderNumberConfig(
  payload: UpdateOrderNumberConfigPayload
): Promise<OrderNumberConfig> {
  await initializeSchema();

  const updatedAt = new Date().toISOString();
  const existing = await db.$queryRawUnsafe<OrderNumberConfigRow[]>(
    `SELECT company_id, financial_year, prefix, suffix, separator_value, include_year,
            include_month, include_day, serial_position, serial_padding, last_serial, updated_at
     FROM order_number_config
     WHERE company_id = ? AND financial_year = ?`,
    payload.companyId,
    payload.financialYear
  );
  const lastSerial =
    existing[0] != null
      ? toNumber(existing[0].last_serial)
      : await getCurrentOrderSerial(db, payload.companyId, payload.financialYear);

  await db.$executeRawUnsafe(
    `INSERT INTO order_number_config (
      company_id,
      financial_year,
      prefix,
      suffix,
      separator_value,
      include_year,
      include_month,
      include_day,
      serial_position,
      serial_padding,
      last_serial,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_id, financial_year) DO UPDATE SET
      prefix = excluded.prefix,
      suffix = excluded.suffix,
      separator_value = excluded.separator_value,
      include_year = excluded.include_year,
      include_month = excluded.include_month,
      include_day = excluded.include_day,
      serial_position = excluded.serial_position,
      serial_padding = excluded.serial_padding,
      updated_at = excluded.updated_at`,
    payload.companyId,
    payload.financialYear,
    payload.prefix.trim(),
    payload.suffix.trim(),
    payload.separator,
    payload.includeYear ? 1 : 0,
    payload.includeMonth ? 1 : 0,
    payload.includeDay ? 1 : 0,
    payload.serialPosition,
    payload.serialPadding,
    lastSerial,
    updatedAt
  );

  return getOrderNumberConfig(payload.companyId, payload.financialYear);
}

export async function reserveNextOrderNumber(
  executor: SqlExecutor,
  companyId: number,
  financialYear: string
) {
  await initializeSchema();

  const timestamp = new Date().toISOString();
  const defaultConfig = buildDefaultOrderNumberConfig(
    companyId,
    financialYear,
    await getCurrentOrderSerial(executor, companyId, financialYear)
  );

  await executor.$executeRawUnsafe(
    `INSERT INTO order_number_config (
      company_id,
      financial_year,
      prefix,
      suffix,
      separator_value,
      include_year,
      include_month,
      include_day,
      serial_position,
      serial_padding,
      last_serial,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_id, financial_year) DO NOTHING`,
    companyId,
    financialYear,
    defaultConfig.prefix,
    defaultConfig.suffix,
    defaultConfig.separator,
    defaultConfig.includeYear ? 1 : 0,
    defaultConfig.includeMonth ? 1 : 0,
    defaultConfig.includeDay ? 1 : 0,
    defaultConfig.serialPosition,
    defaultConfig.serialPadding,
    defaultConfig.lastSerial,
    timestamp
  );

  const updatedRows = await executor.$queryRawUnsafe<OrderNumberConfigRow[]>(
    `UPDATE order_number_config
     SET last_serial = last_serial + 1, updated_at = ?
     WHERE company_id = ? AND financial_year = ?
     RETURNING company_id, financial_year, prefix, suffix, separator_value, include_year,
               include_month, include_day, serial_position, serial_padding, last_serial, updated_at`,
    timestamp,
    companyId,
    financialYear
  );

  const updatedConfigRow = updatedRows[0];

  if (!updatedConfigRow) {
    throw new Error('Failed to reserve the next order number.');
  }

  const updatedConfig = mapConfigRow(updatedConfigRow);
  return buildOrderNumberFromConfig(updatedConfig, updatedConfig.lastSerial);
}
