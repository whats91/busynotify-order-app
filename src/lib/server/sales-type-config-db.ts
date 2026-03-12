/*
 * File Context:
 * Purpose: Implements server-side infrastructure for Sales Type Config Db.
 * Primary Functionality: Owns server-side persistence, schema initialization, or backend data access for this domain.
 * Interlinked With: src/lib/db.ts, src/shared/types/index.ts
 * Role: server infrastructure.
 */
import 'server-only';

import { db } from '@/lib/db';
import type { SalesTypeConfig, UpdateSalesTypeConfigPayload } from '@/shared/types';

interface SalesTypeConfigRow {
  company_id: number | bigint;
  financial_year: string;
  company_state: string;
  same_state_sale_type_id: string | null;
  same_state_sale_type_name: string | null;
  interstate_sale_type_id: string | null;
  interstate_sale_type_name: string | null;
  updated_at: string;
}

declare global {
  var busyNotifySalesTypeConfigDbInitialized: Promise<void> | undefined;
}

function mapConfigRow(row: SalesTypeConfigRow): SalesTypeConfig {
  return {
    companyId: Number(row.company_id),
    financialYear: row.financial_year,
    companyState: row.company_state,
    sameStateSaleTypeId: row.same_state_sale_type_id || '',
    sameStateSaleTypeName: row.same_state_sale_type_name || '',
    interstateSaleTypeId: row.interstate_sale_type_id || '',
    interstateSaleTypeName: row.interstate_sale_type_name || '',
    updatedAt: row.updated_at,
  };
}

function buildEmptyConfig(companyId: number, financialYear: string): SalesTypeConfig {
  return {
    companyId,
    financialYear,
    companyState: '',
    sameStateSaleTypeId: '',
    sameStateSaleTypeName: '',
    interstateSaleTypeId: '',
    interstateSaleTypeName: '',
  };
}

async function initializeSchema() {
  if (!global.busyNotifySalesTypeConfigDbInitialized) {
    global.busyNotifySalesTypeConfigDbInitialized = (async () => {
      await db.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await db.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS sales_type_config (
          company_id INTEGER NOT NULL,
          financial_year TEXT NOT NULL,
          company_state TEXT NOT NULL DEFAULT '',
          same_state_sale_type_id TEXT NOT NULL DEFAULT '',
          same_state_sale_type_name TEXT NOT NULL DEFAULT '',
          interstate_sale_type_id TEXT NOT NULL DEFAULT '',
          interstate_sale_type_name TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          PRIMARY KEY (company_id, financial_year)
        )`
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_sales_type_config_updated_at
         ON sales_type_config(updated_at DESC)`
      );
    })();
  }

  await global.busyNotifySalesTypeConfigDbInitialized;
}

export async function getSalesTypeConfig(
  companyId: number,
  financialYear: string
): Promise<SalesTypeConfig> {
  await initializeSchema();

  const rows = await db.$queryRawUnsafe<SalesTypeConfigRow[]>(
    `SELECT company_id, financial_year, company_state, same_state_sale_type_id, same_state_sale_type_name, interstate_sale_type_id, interstate_sale_type_name, updated_at
     FROM sales_type_config
     WHERE company_id = ? AND financial_year = ?`,
    companyId,
    financialYear
  );

  const row = rows[0];
  return row ? mapConfigRow(row) : buildEmptyConfig(companyId, financialYear);
}

export async function upsertSalesTypeConfig(
  payload: UpdateSalesTypeConfigPayload
): Promise<SalesTypeConfig> {
  await initializeSchema();

  const updatedAt = new Date().toISOString();

  await db.$executeRawUnsafe(
    `INSERT INTO sales_type_config (
      company_id,
      financial_year,
      company_state,
      same_state_sale_type_id,
      same_state_sale_type_name,
      interstate_sale_type_id,
      interstate_sale_type_name,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_id, financial_year) DO UPDATE SET
      company_state = excluded.company_state,
      same_state_sale_type_id = excluded.same_state_sale_type_id,
      same_state_sale_type_name = excluded.same_state_sale_type_name,
      interstate_sale_type_id = excluded.interstate_sale_type_id,
      interstate_sale_type_name = excluded.interstate_sale_type_name,
      updated_at = excluded.updated_at`,
    payload.companyId,
    payload.financialYear,
    payload.companyState.trim(),
    payload.sameStateSaleTypeId.trim(),
    payload.sameStateSaleTypeName.trim(),
    payload.interstateSaleTypeId.trim(),
    payload.interstateSaleTypeName.trim(),
    updatedAt
  );

  return getSalesTypeConfig(payload.companyId, payload.financialYear);
}
