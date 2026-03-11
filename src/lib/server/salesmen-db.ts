import 'server-only';

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { CreateSalesmanPayload, Salesman, UpdateSalesmanPayload, User } from '@/shared/types';

interface SalesmanRow {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const FALLBACK_DB_PATH = path.join(process.cwd(), 'data', 'busy-notify.sqlite');

declare global {
  var busyNotifySalesmenDb: DatabaseSync | undefined;
  var busyNotifySalesmenDbInitialized: boolean | undefined;
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

function resolveDatabasePath(): string {
  const normalizedPath = normalizeDatabaseUrl(process.env.DATABASE_URL?.trim());

  if (normalizedPath) {
    try {
      mkdirSync(path.dirname(normalizedPath), { recursive: true });
      return normalizedPath;
    } catch (error) {
      console.warn('Falling back to local SQLite path for salesmen:', error);
    }
  }

  mkdirSync(path.dirname(FALLBACK_DB_PATH), { recursive: true });
  return FALLBACK_DB_PATH;
}

function getDb(): DatabaseSync {
  if (!global.busyNotifySalesmenDb) {
    global.busyNotifySalesmenDb = new DatabaseSync(resolveDatabasePath());
  }

  if (!global.busyNotifySalesmenDbInitialized) {
    initializeSchema(global.busyNotifySalesmenDb);
    global.busyNotifySalesmenDbInitialized = true;
  }

  return global.busyNotifySalesmenDb;
}

function initializeSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS salesmen (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_salesmen_username ON salesmen(username);
    CREATE INDEX IF NOT EXISTS idx_salesmen_is_active ON salesmen(is_active);
    CREATE INDEX IF NOT EXISTS idx_salesmen_created_at ON salesmen(created_at DESC);
  `);
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
    isActive: row.is_active === 1,
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

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

export async function listSalesmen(): Promise<Salesman[]> {
  const rows = getDb()
    .prepare(
      `SELECT id, username, name, email, phone, password_hash, is_active, created_at, updated_at
       FROM salesmen
       ORDER BY is_active DESC, datetime(created_at) DESC`
    )
    .all() as unknown as SalesmanRow[];

  return rows.map(mapSalesman);
}

export async function getSalesmanById(id: string): Promise<Salesman | null> {
  const row = getDb()
    .prepare(
      `SELECT id, username, name, email, phone, password_hash, is_active, created_at, updated_at
       FROM salesmen
       WHERE id = ?`
    )
    .get(id) as SalesmanRow | undefined;

  return row ? mapSalesman(row) : null;
}

export async function createSalesman(payload: CreateSalesmanPayload): Promise<Salesman> {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const id = randomUUID();

  try {
    db.prepare(
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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

export async function updateSalesman(id: string, payload: UpdateSalesmanPayload): Promise<Salesman | null> {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id, username, name, email, phone, password_hash, is_active, created_at, updated_at
       FROM salesmen
       WHERE id = ?`
    )
    .get(id) as SalesmanRow | undefined;

  if (!existing) {
    return null;
  }

  try {
    db.prepare(
      `UPDATE salesmen
       SET username = ?,
           name = ?,
           email = ?,
           phone = ?,
           password_hash = ?,
           is_active = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(
      payload.username ? normalizeUsername(payload.username) : existing.username,
      payload.name?.trim() || existing.name,
      payload.email !== undefined ? normalizeNullable(payload.email) : existing.email,
      payload.phone !== undefined ? normalizeNullable(payload.phone) : existing.phone,
      payload.password ? hashPassword(payload.password) : existing.password_hash,
      payload.isActive === undefined ? existing.is_active : payload.isActive ? 1 : 0,
      new Date().toISOString(),
      id
    );
  } catch (error) {
    throw mapPersistenceError(error, 'Failed to update salesman.');
  }

  return getSalesmanById(id);
}

export async function deleteSalesman(id: string): Promise<boolean> {
  const result = getDb()
    .prepare('DELETE FROM salesmen WHERE id = ?')
    .run(id);

  return result.changes > 0;
}

export async function authenticateSalesman(username: string, password: string): Promise<User | null> {
  const row = getDb()
    .prepare(
      `SELECT id, username, name, email, phone, password_hash, is_active, created_at, updated_at
       FROM salesmen
       WHERE username = ?`
    )
    .get(normalizeUsername(username)) as SalesmanRow | undefined;

  if (!row || row.is_active !== 1) {
    return null;
  }

  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }

  return mapToStaffUser(row);
}
