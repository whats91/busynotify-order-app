import 'server-only';

import { db } from '@/lib/db';
import type {
  UpdateVoucherSeriesConfigPayload,
  VoucherSeriesConfig,
} from '@/shared/types';

interface VoucherSeriesConfigRow {
  company_id: number | bigint;
  financial_year: string;
  voucher_series_id: string | null;
  voucher_series_name: string | null;
  updated_at: string;
}

declare global {
  var busyNotifyVoucherSeriesConfigDbInitialized: Promise<void> | undefined;
}

function mapConfigRow(row: VoucherSeriesConfigRow): VoucherSeriesConfig {
  return {
    companyId: Number(row.company_id),
    financialYear: row.financial_year,
    voucherSeriesId: row.voucher_series_id || '',
    voucherSeriesName: row.voucher_series_name || '',
    updatedAt: row.updated_at,
  };
}

function buildEmptyConfig(companyId: number, financialYear: string): VoucherSeriesConfig {
  return {
    companyId,
    financialYear,
    voucherSeriesId: '',
    voucherSeriesName: '',
  };
}

async function initializeSchema() {
  if (!global.busyNotifyVoucherSeriesConfigDbInitialized) {
    global.busyNotifyVoucherSeriesConfigDbInitialized = (async () => {
      await db.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await db.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS voucher_series_config (
          company_id INTEGER NOT NULL,
          financial_year TEXT NOT NULL,
          voucher_series_id TEXT NOT NULL DEFAULT '',
          voucher_series_name TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          PRIMARY KEY (company_id, financial_year)
        )`
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_voucher_series_config_updated_at
         ON voucher_series_config(updated_at DESC)`
      );
    })();
  }

  await global.busyNotifyVoucherSeriesConfigDbInitialized;
}

export async function getVoucherSeriesConfig(
  companyId: number,
  financialYear: string
): Promise<VoucherSeriesConfig> {
  await initializeSchema();

  const rows = await db.$queryRawUnsafe<VoucherSeriesConfigRow[]>(
    `SELECT company_id, financial_year, voucher_series_id, voucher_series_name, updated_at
     FROM voucher_series_config
     WHERE company_id = ? AND financial_year = ?`,
    companyId,
    financialYear
  );

  const row = rows[0];
  return row ? mapConfigRow(row) : buildEmptyConfig(companyId, financialYear);
}

export async function upsertVoucherSeriesConfig(
  payload: UpdateVoucherSeriesConfigPayload
): Promise<VoucherSeriesConfig> {
  await initializeSchema();

  const updatedAt = new Date().toISOString();

  await db.$executeRawUnsafe(
    `INSERT INTO voucher_series_config (
      company_id,
      financial_year,
      voucher_series_id,
      voucher_series_name,
      updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(company_id, financial_year) DO UPDATE SET
      voucher_series_id = excluded.voucher_series_id,
      voucher_series_name = excluded.voucher_series_name,
      updated_at = excluded.updated_at`,
    payload.companyId,
    payload.financialYear,
    payload.voucherSeriesId.trim(),
    payload.voucherSeriesName.trim(),
    updatedAt
  );

  return getVoucherSeriesConfig(payload.companyId, payload.financialYear);
}
