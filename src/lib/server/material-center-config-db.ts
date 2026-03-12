import 'server-only';

import { db } from '@/lib/db';
import type {
  MaterialCenterConfig,
  UpdateMaterialCenterConfigPayload,
} from '@/shared/types';

interface MaterialCenterConfigRow {
  company_id: number | bigint;
  financial_year: string;
  material_center_id: string | null;
  material_center_name: string | null;
  updated_at: string;
}

declare global {
  var busyNotifyMaterialCenterConfigDbInitialized: Promise<void> | undefined;
}

function mapConfigRow(row: MaterialCenterConfigRow): MaterialCenterConfig {
  return {
    companyId: Number(row.company_id),
    financialYear: row.financial_year,
    materialCenterId: row.material_center_id || '',
    materialCenterName: row.material_center_name || '',
    updatedAt: row.updated_at,
  };
}

function buildEmptyConfig(companyId: number, financialYear: string): MaterialCenterConfig {
  return {
    companyId,
    financialYear,
    materialCenterId: '',
    materialCenterName: '',
  };
}

async function initializeSchema() {
  if (!global.busyNotifyMaterialCenterConfigDbInitialized) {
    global.busyNotifyMaterialCenterConfigDbInitialized = (async () => {
      await db.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await db.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS material_center_config (
          company_id INTEGER NOT NULL,
          financial_year TEXT NOT NULL,
          material_center_id TEXT NOT NULL DEFAULT '',
          material_center_name TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          PRIMARY KEY (company_id, financial_year)
        )`
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS idx_material_center_config_updated_at
         ON material_center_config(updated_at DESC)`
      );
    })();
  }

  await global.busyNotifyMaterialCenterConfigDbInitialized;
}

export async function getMaterialCenterConfig(
  companyId: number,
  financialYear: string
): Promise<MaterialCenterConfig> {
  await initializeSchema();

  const rows = await db.$queryRawUnsafe<MaterialCenterConfigRow[]>(
    `SELECT company_id, financial_year, material_center_id, material_center_name, updated_at
     FROM material_center_config
     WHERE company_id = ? AND financial_year = ?`,
    companyId,
    financialYear
  );

  const row = rows[0];
  return row ? mapConfigRow(row) : buildEmptyConfig(companyId, financialYear);
}

export async function upsertMaterialCenterConfig(
  payload: UpdateMaterialCenterConfigPayload
): Promise<MaterialCenterConfig> {
  await initializeSchema();

  const updatedAt = new Date().toISOString();

  await db.$executeRawUnsafe(
    `INSERT INTO material_center_config (
      company_id,
      financial_year,
      material_center_id,
      material_center_name,
      updated_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(company_id, financial_year) DO UPDATE SET
      material_center_id = excluded.material_center_id,
      material_center_name = excluded.material_center_name,
      updated_at = excluded.updated_at`,
    payload.companyId,
    payload.financialYear,
    payload.materialCenterId.trim(),
    payload.materialCenterName.trim(),
    updatedAt
  );

  return getMaterialCenterConfig(payload.companyId, payload.financialYear);
}
