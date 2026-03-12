import 'server-only';

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import type { CreateSalesmanPayload, Salesman, UpdateSalesmanPayload, User } from '@/shared/types';

interface SalesmanRow {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  is_active: number | bigint;
  created_at: string;
  updated_at: string;
}

declare global {
  var busyNotifySalesmenDbInitialized: Promise<void> | undefined;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function normalizeNullable(value?: string): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function mapSalesman(row: SalesmanRow): Salesman {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    isActive: Number(row.is_active) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapToStaffUser(row: SalesmanRow): User {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: 'salesman',
    email: row.email || undefined,
    phone: row.phone || undefined,
  };
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hash, 'hex');

  if (storedBuffer.length !== computedHash.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, computedHash);
}

function mapPersistenceError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    return new Error('A salesman with the same username or email already exists.');
  }

  if (error instanceof Error && error.message.includes('unique constraint')) {
    return new Error('A salesman with the same username or email already exists.');
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

async function initializeSchema() {
  if (!global.busyNotifySalesmenDbInitialized) {
    global.busyNotifySalesmenDbInitialized = (async () => {
      await db.$executeRawUnsafe('PRAGMA journal_mode = WAL');
      await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await db.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS salesmen (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT,
          password_hash TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_salesmen_username ON salesmen(username)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_salesmen_is_active ON salesmen(is_active)'
      );
      await db.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_salesmen_created_at ON salesmen(created_at DESC)'
      );
    })();
  }

  await global.busyNotifySalesmenDbInitialized;
}

async function getSalesmanRowById(id: string): Promise<SalesmanRow | null> {
  await initializeSchema();

  const rows = await db.$queryRawUnsafe<SalesmanRow[]>(
    `SELECT id, username, name, email, phone, password_hash, is_active, created_at, updated_at
     FROM salesmen
     WHERE id = ?`,
    id
  );

  return rows[0] ?? null;
}

export async function listSalesmen(): Promise<Salesman[]> {
  await initializeSchema();

  const rows = await db.$queryRawUnsafe<SalesmanRow[]>(
    `SELECT id, username, name, email, phone, password_hash, is_active, created_at, updated_at
     FROM salesmen
     ORDER BY is_active DESC, datetime(created_at) DESC`
  );

  return rows.map(mapSalesman);
}

export async function getSalesmanById(id: string): Promise<Salesman | null> {
  const row = await getSalesmanRowById(id);
  return row ? mapSalesman(row) : null;
}

export async function createSalesman(payload: CreateSalesmanPayload): Promise<Salesman> {
  await initializeSchema();

  const timestamp = new Date().toISOString();
  const id = randomUUID();

  try {
    await db.$executeRawUnsafe(
      `INSERT INTO salesmen (
        id,
        username,
        name,
        email,
        phone,
        password_hash,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      normalizeUsername(payload.username),
      payload.name.trim(),
      normalizeNullable(payload.email),
      normalizeNullable(payload.phone),
      hashPassword(payload.password),
      payload.isActive === false ? 0 : 1,
      timestamp,
      timestamp
    );
  } catch (error) {
    throw mapPersistenceError(error, 'Failed to create salesman.');
  }

  return (await getSalesmanById(id)) as Salesman;
}

export async function updateSalesman(
  id: string,
  payload: UpdateSalesmanPayload
): Promise<Salesman | null> {
  const existing = await getSalesmanRowById(id);

  if (!existing) {
    return null;
  }

  try {
    await db.$executeRawUnsafe(
      `UPDATE salesmen
       SET username = ?,
           name = ?,
           email = ?,
           phone = ?,
           password_hash = ?,
           is_active = ?,
           updated_at = ?
       WHERE id = ?`,
      payload.username ? normalizeUsername(payload.username) : existing.username,
      payload.name?.trim() || existing.name,
      payload.email !== undefined ? normalizeNullable(payload.email) : existing.email,
      payload.phone !== undefined ? normalizeNullable(payload.phone) : existing.phone,
      payload.password ? hashPassword(payload.password) : existing.password_hash,
      payload.isActive === undefined ? Number(existing.is_active) : payload.isActive ? 1 : 0,
      new Date().toISOString(),
      id
    );
  } catch (error) {
    throw mapPersistenceError(error, 'Failed to update salesman.');
  }

  return getSalesmanById(id);
}

export async function deleteSalesman(id: string): Promise<boolean> {
  await initializeSchema();
  const deletedCount = await db.$executeRawUnsafe('DELETE FROM salesmen WHERE id = ?', id);
  return deletedCount > 0;
}

export async function authenticateSalesman(username: string, password: string): Promise<User | null> {
  await initializeSchema();

  const rows = await db.$queryRawUnsafe<SalesmanRow[]>(
    `SELECT id, username, name, email, phone, password_hash, is_active, created_at, updated_at
     FROM salesmen
     WHERE username = ?`,
    normalizeUsername(username)
  );

  const row = rows[0];

  if (!row || Number(row.is_active) !== 1) {
    return null;
  }

  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }

  return mapToStaffUser(row);
}
