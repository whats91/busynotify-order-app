/*
 * File Context:
 * Purpose: Implements server-side infrastructure for Task Db.
 * Primary Functionality: Owns server-side persistence, schema initialization, or backend data access for this domain.
 * Interlinked With: src/lib/server/salesmen-db.ts, src/lib/tasks-db.ts, src/shared/types/index.ts
 * Role: server infrastructure.
 */
import 'server-only';

import type { PrismaClient } from '@prisma/client';
import { taskDb } from '@/lib/tasks-db';
import { getSalesmanById, listSalesmen } from '@/lib/server/salesmen-db';
import type {
  CreateTaskPayload,
  Role,
  Salesman,
  Task,
  TaskActivityLog,
  TaskAssignment,
  TaskComment,
  TaskFilter,
  TaskLookups,
  TaskPriority,
  TaskPriorityCode,
  TaskStatus,
  TaskStatusCode,
  UpdateTaskPayload,
  User,
} from '@/shared/types';
import { TASK_PRIORITY_CODES, TASK_STATUS_CODES } from '@/shared/types';

type SqlExecutor = Pick<PrismaClient, '$executeRawUnsafe' | '$queryRawUnsafe'>;

interface TaskPriorityRow {
  code: TaskPriorityCode;
  label: string;
  sort_order: number | bigint;
  is_default: number | bigint;
}

interface TaskStatusRow {
  code: TaskStatusCode;
  label: string;
  sort_order: number | bigint;
  is_terminal: number | bigint;
}

interface TaskRow {
  id: number | bigint;
  task_key: string;
  title: string;
  description: string | null;
  priority_code: TaskPriorityCode;
  status_code: TaskStatusCode;
  company_id: number | bigint | null;
  customer_id: string | null;
  customer_name_snapshot: string | null;
  order_id: string | null;
  start_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_by_user_id: string;
  created_by_role: Role;
  created_by_name_snapshot: string;
  updated_by_user_id: string;
  updated_by_role: Role;
  updated_by_name_snapshot: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface TaskAssignmentRow {
  id: number | bigint;
  task_id: number | bigint;
  assignee_user_id: string;
  assignee_role: Role;
  assignee_name_snapshot: string;
  assigned_by_user_id: string;
  assigned_by_role: Role;
  assigned_by_name_snapshot: string;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: number | bigint;
}

interface TaskCommentRow {
  id: number | bigint;
  task_id: number | bigint;
  author_user_id: string;
  author_role: Role;
  author_name_snapshot: string;
  body: string;
  created_at: string;
}

interface TaskActivityLogRow {
  id: number | bigint;
  task_id: number | bigint;
  actor_user_id: string;
  actor_role: Role;
  actor_name_snapshot: string;
  event_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  meta_json: string | null;
  created_at: string;
}

interface CreateStoredTaskParams extends CreateTaskPayload {
  createdBy: User;
  assignee?: Salesman | null;
}

interface UpdateStoredTaskParams extends UpdateTaskPayload {
  updatedBy: User;
}

interface AssignStoredTaskParams {
  taskId: string;
  assignee?: Salesman | null;
  assignedBy: User;
}

interface UpdateStoredTaskStatusParams {
  taskId: string;
  statusCode: TaskStatusCode;
  updatedBy: User;
}

interface CreateStoredTaskCommentParams {
  taskId: string;
  body: string;
  author: User;
}

declare global {
  var busyNotifyTasksDbInitialized: Promise<void> | undefined;
}

const TASK_PRIORITY_SEED: Array<TaskPriority> = [
  { code: 'low', label: 'Low', sortOrder: 1, isDefault: false },
  { code: 'medium', label: 'Medium', sortOrder: 2, isDefault: true },
  { code: 'high', label: 'High', sortOrder: 3, isDefault: false },
];

const TASK_STATUS_SEED: Array<TaskStatus> = [
  { code: 'pending', label: 'Pending', sortOrder: 1, isTerminal: false },
  { code: 'in_progress', label: 'In Progress', sortOrder: 2, isTerminal: false },
  { code: 'blocked', label: 'Blocked', sortOrder: 3, isTerminal: false },
  { code: 'completed', label: 'Completed', sortOrder: 4, isTerminal: true },
  { code: 'cancelled', label: 'Cancelled', sortOrder: 5, isTerminal: true },
];

function toNumber(value: number | bigint | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return typeof value === 'bigint' ? Number(value) : value;
}

function toBoolean(value: number | bigint): boolean {
  return toNumber(value) === 1;
}

function normalizeNullableText(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeNullableIso(value?: string | null): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function generateTaskKey(id: number): string {
  const year = new Date().getFullYear();
  return `TSK-${year}-${String(id).padStart(6, '0')}`;
}

function mapTaskPriority(row: TaskPriorityRow): TaskPriority {
  return {
    code: row.code,
    label: row.label,
    sortOrder: toNumber(row.sort_order),
    isDefault: toBoolean(row.is_default),
  };
}

function mapTaskStatus(row: TaskStatusRow): TaskStatus {
  return {
    code: row.code,
    label: row.label,
    sortOrder: toNumber(row.sort_order),
    isTerminal: toBoolean(row.is_terminal),
  };
}

function mapTaskAssignment(row: TaskAssignmentRow): TaskAssignment {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    assigneeUserId: row.assignee_user_id,
    assigneeRole: row.assignee_role,
    assigneeName: row.assignee_name_snapshot,
    assignedByUserId: row.assigned_by_user_id,
    assignedByRole: row.assigned_by_role,
    assignedByName: row.assigned_by_name_snapshot,
    assignedAt: row.assigned_at,
    unassignedAt: row.unassigned_at || undefined,
    isActive: toBoolean(row.is_active),
  };
}

function mapTaskComment(row: TaskCommentRow): TaskComment {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    authorUserId: row.author_user_id,
    authorRole: row.author_role,
    authorName: row.author_name_snapshot,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapTaskActivityLog(row: TaskActivityLogRow): TaskActivityLog {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    actorName: row.actor_name_snapshot,
    eventType: row.event_type,
    fieldName: row.field_name || undefined,
    oldValue: row.old_value || undefined,
    newValue: row.new_value || undefined,
    metaJson: row.meta_json || undefined,
    createdAt: row.created_at,
  };
}

function mapTask(
  row: TaskRow,
  activeAssignment?: TaskAssignment | null,
  assignmentHistory?: TaskAssignment[],
  comments?: TaskComment[],
  activityLog?: TaskActivityLog[]
): Task {
  return {
    id: String(row.id),
    taskKey: row.task_key,
    title: row.title,
    description: row.description || undefined,
    priorityCode: row.priority_code,
    statusCode: row.status_code,
    companyId: row.company_id == null ? undefined : toNumber(row.company_id),
    customerId: row.customer_id || undefined,
    customerNameSnapshot: row.customer_name_snapshot || undefined,
    orderId: row.order_id || undefined,
    startAt: row.start_at || undefined,
    dueAt: row.due_at || undefined,
    completedAt: row.completed_at || undefined,
    createdByUserId: row.created_by_user_id,
    createdByRole: row.created_by_role,
    createdByNameSnapshot: row.created_by_name_snapshot,
    updatedByUserId: row.updated_by_user_id,
    updatedByRole: row.updated_by_role,
    updatedByNameSnapshot: row.updated_by_name_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at || undefined,
    activeAssignment: activeAssignment ?? null,
    assignmentHistory,
    comments,
    activityLog,
  };
}

async function insertActivityLog(
  executor: SqlExecutor,
  taskId: number,
  actor: User,
  eventType: string,
  fieldName?: string | null,
  oldValue?: string | null,
  newValue?: string | null,
  meta?: Record<string, unknown> | null
) {
  await executor.$executeRawUnsafe(
    `INSERT INTO task_activity_log (
      task_id,
      actor_user_id,
      actor_role,
      actor_name_snapshot,
      event_type,
      field_name,
      old_value,
      new_value,
      meta_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    taskId,
    actor.id,
    actor.role,
    actor.name,
    eventType,
    fieldName ?? null,
    oldValue ?? null,
    newValue ?? null,
    meta ? JSON.stringify(meta) : null,
    new Date().toISOString()
  );
}

async function loadActiveAssignments(
  executor: SqlExecutor,
  taskIds: number[]
): Promise<Map<number, TaskAssignment>> {
  if (taskIds.length === 0) {
    return new Map();
  }

  const placeholders = taskIds.map(() => '?').join(', ');
  const rows = await executor.$queryRawUnsafe<TaskAssignmentRow[]>(
    `SELECT id, task_id, assignee_user_id, assignee_role, assignee_name_snapshot, assigned_by_user_id,
            assigned_by_role, assigned_by_name_snapshot, assigned_at, unassigned_at, is_active
     FROM task_assignments
     WHERE task_id IN (${placeholders}) AND is_active = 1
     ORDER BY datetime(assigned_at) DESC, id DESC`,
    ...taskIds
  );

  return rows.reduce((result, row) => {
    const taskId = toNumber(row.task_id);
    if (!result.has(taskId)) {
      result.set(taskId, mapTaskAssignment(row));
    }
    return result;
  }, new Map<number, TaskAssignment>());
}

async function loadAssignmentHistory(
  executor: SqlExecutor,
  taskId: number
): Promise<TaskAssignment[]> {
  const rows = await executor.$queryRawUnsafe<TaskAssignmentRow[]>(
    `SELECT id, task_id, assignee_user_id, assignee_role, assignee_name_snapshot, assigned_by_user_id,
            assigned_by_role, assigned_by_name_snapshot, assigned_at, unassigned_at, is_active
     FROM task_assignments
     WHERE task_id = ?
     ORDER BY datetime(assigned_at) DESC, id DESC`,
    taskId
  );

  return rows.map(mapTaskAssignment);
}

async function loadTaskComments(
  executor: SqlExecutor,
  taskId: number
): Promise<TaskComment[]> {
  const rows = await executor.$queryRawUnsafe<TaskCommentRow[]>(
    `SELECT id, task_id, author_user_id, author_role, author_name_snapshot, body, created_at
     FROM task_comments
     WHERE task_id = ?
     ORDER BY datetime(created_at) ASC, id ASC`,
    taskId
  );

  return rows.map(mapTaskComment);
}

async function loadTaskActivity(
  executor: SqlExecutor,
  taskId: number
): Promise<TaskActivityLog[]> {
  const rows = await executor.$queryRawUnsafe<TaskActivityLogRow[]>(
    `SELECT id, task_id, actor_user_id, actor_role, actor_name_snapshot, event_type, field_name,
            old_value, new_value, meta_json, created_at
     FROM task_activity_log
     WHERE task_id = ?
     ORDER BY datetime(created_at) DESC, id DESC`,
    taskId
  );

  return rows.map(mapTaskActivityLog);
}

async function initializeSchema() {
  if (!global.busyNotifyTasksDbInitialized) {
    global.busyNotifyTasksDbInitialized = (async () => {
      await taskDb.$queryRawUnsafe('PRAGMA journal_mode = WAL');
      await taskDb.$executeRawUnsafe('PRAGMA foreign_keys = ON');
      await taskDb.$executeRawUnsafe('PRAGMA synchronous = NORMAL');

      await taskDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS task_priorities (
          code TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
        )`
      );
      await taskDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS task_statuses (
          code TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          is_terminal INTEGER NOT NULL DEFAULT 0 CHECK (is_terminal IN (0, 1))
        )`
      );
      await taskDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          priority_code TEXT NOT NULL,
          status_code TEXT NOT NULL,
          company_id INTEGER,
          customer_id TEXT,
          customer_name_snapshot TEXT,
          order_id TEXT,
          start_at TEXT,
          due_at TEXT,
          completed_at TEXT,
          created_by_user_id TEXT NOT NULL,
          created_by_role TEXT NOT NULL,
          created_by_name_snapshot TEXT NOT NULL,
          updated_by_user_id TEXT NOT NULL,
          updated_by_role TEXT NOT NULL,
          updated_by_name_snapshot TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (priority_code) REFERENCES task_priorities(code),
          FOREIGN KEY (status_code) REFERENCES task_statuses(code)
        )`
      );
      await taskDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS task_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          assignee_user_id TEXT NOT NULL,
          assignee_role TEXT NOT NULL,
          assignee_name_snapshot TEXT NOT NULL,
          assigned_by_user_id TEXT NOT NULL,
          assigned_by_role TEXT NOT NULL,
          assigned_by_name_snapshot TEXT NOT NULL,
          assigned_at TEXT NOT NULL,
          unassigned_at TEXT,
          is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )`
      );
      await taskDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS task_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          author_user_id TEXT NOT NULL,
          author_role TEXT NOT NULL,
          author_name_snapshot TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )`
      );
      await taskDb.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS task_activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          actor_user_id TEXT NOT NULL,
          actor_role TEXT NOT NULL,
          actor_name_snapshot TEXT NOT NULL,
          event_type TEXT NOT NULL,
          field_name TEXT,
          old_value TEXT,
          new_value TEXT,
          meta_json TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )`
      );

      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_status_code ON tasks(status_code)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_priority_code ON tasks(priority_code)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_task_assignments_active_assignee ON task_assignments(assignee_user_id, is_active)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_active_unique ON task_assignments(task_id) WHERE is_active = 1'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id)'
      );
      await taskDb.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity_log(task_id)'
      );

      for (const priority of TASK_PRIORITY_SEED) {
        await taskDb.$executeRawUnsafe(
          `INSERT OR IGNORE INTO task_priorities (code, label, sort_order, is_default)
           VALUES (?, ?, ?, ?)`,
          priority.code,
          priority.label,
          priority.sortOrder,
          priority.isDefault ? 1 : 0
        );
      }

      for (const status of TASK_STATUS_SEED) {
        await taskDb.$executeRawUnsafe(
          `INSERT OR IGNORE INTO task_statuses (code, label, sort_order, is_terminal)
           VALUES (?, ?, ?, ?)`,
          status.code,
          status.label,
          status.sortOrder,
          status.isTerminal ? 1 : 0
        );
      }
    })();
  }

  await global.busyNotifyTasksDbInitialized;
}

async function getTaskRowById(executor: SqlExecutor, numericTaskId: number): Promise<TaskRow | null> {
  const rows = await executor.$queryRawUnsafe<TaskRow[]>(
    `SELECT id, task_key, title, description, priority_code, status_code, company_id, customer_id,
            customer_name_snapshot, order_id, start_at, due_at, completed_at, created_by_user_id,
            created_by_role, created_by_name_snapshot, updated_by_user_id, updated_by_role,
            updated_by_name_snapshot, created_at, updated_at, archived_at
     FROM tasks
     WHERE id = ?`,
    numericTaskId
  );

  return rows[0] ?? null;
}

function parseTaskId(taskId: string): number | null {
  const numericTaskId = Number(taskId);
  return Number.isFinite(numericTaskId) && numericTaskId > 0 ? numericTaskId : null;
}

export async function listTaskPriorities(): Promise<TaskPriority[]> {
  await initializeSchema();

  const rows = await taskDb.$queryRawUnsafe<TaskPriorityRow[]>(
    `SELECT code, label, sort_order, is_default
     FROM task_priorities
     ORDER BY sort_order ASC, label ASC`
  );

  return rows.map(mapTaskPriority);
}

export async function listTaskStatuses(): Promise<TaskStatus[]> {
  await initializeSchema();

  const rows = await taskDb.$queryRawUnsafe<TaskStatusRow[]>(
    `SELECT code, label, sort_order, is_terminal
     FROM task_statuses
     ORDER BY sort_order ASC, label ASC`
  );

  return rows.map(mapTaskStatus);
}

export async function getTaskLookups(): Promise<TaskLookups> {
  const [priorities, statuses, salesmen] = await Promise.all([
    listTaskPriorities(),
    listTaskStatuses(),
    listSalesmen(),
  ]);

  return {
    priorities,
    statuses,
    salesmen: salesmen.filter((salesman) => salesman.isActive),
  };
}

export async function listStoredTasks(filters: TaskFilter = {}): Promise<Task[]> {
  await initializeSchema();

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (!filters.includeArchived) {
    whereClauses.push('archived_at IS NULL');
  }

  if (filters.statusCode) {
    whereClauses.push('status_code = ?');
    params.push(filters.statusCode);
  }

  if (filters.priorityCode) {
    whereClauses.push('priority_code = ?');
    params.push(filters.priorityCode);
  }

  if (filters.companyId != null) {
    whereClauses.push('company_id = ?');
    params.push(filters.companyId);
  }

  if (filters.customerId) {
    whereClauses.push('customer_id = ?');
    params.push(filters.customerId);
  }

  if (filters.orderId) {
    whereClauses.push('order_id = ?');
    params.push(filters.orderId);
  }

  if (filters.dueDate) {
    whereClauses.push('date(due_at) = date(?)');
    params.push(filters.dueDate);
  }

  if (filters.assigneeUserId) {
    whereClauses.push(
      `EXISTS (
        SELECT 1
        FROM task_assignments active_assignment
        WHERE active_assignment.task_id = tasks.id
          AND active_assignment.is_active = 1
          AND active_assignment.assignee_user_id = ?
      )`
    );
    params.push(filters.assigneeUserId);
  }

  if (filters.onlyMine && filters.assigneeUserId) {
    whereClauses.push(
      `EXISTS (
        SELECT 1
        FROM task_assignments my_assignment
        WHERE my_assignment.task_id = tasks.id
          AND my_assignment.is_active = 1
          AND my_assignment.assignee_user_id = ?
      )`
    );
    params.push(filters.assigneeUserId);
  }

  if (filters.search) {
    const searchValue = `%${filters.search.trim()}%`;
    whereClauses.push(
      `(
        task_key LIKE ?
        OR title LIKE ?
        OR COALESCE(description, '') LIKE ?
        OR COALESCE(customer_name_snapshot, '') LIKE ?
        OR COALESCE(order_id, '') LIKE ?
        OR EXISTS (
          SELECT 1
          FROM task_assignments search_assignment
          WHERE search_assignment.task_id = tasks.id
            AND search_assignment.is_active = 1
            AND search_assignment.assignee_name_snapshot LIKE ?
        )
      )`
    );
    params.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const rows = await taskDb.$queryRawUnsafe<TaskRow[]>(
    `SELECT id, task_key, title, description, priority_code, status_code, company_id, customer_id,
            customer_name_snapshot, order_id, start_at, due_at, completed_at, created_by_user_id,
            created_by_role, created_by_name_snapshot, updated_by_user_id, updated_by_role,
            updated_by_name_snapshot, created_at, updated_at, archived_at
     FROM tasks
     ${whereSql}
     ORDER BY
       CASE WHEN due_at IS NULL THEN 1 ELSE 0 END ASC,
       datetime(due_at) ASC,
       datetime(created_at) DESC,
       id DESC`,
    ...params
  );

  const taskIds = rows.map((row) => toNumber(row.id));
  const activeAssignments = await loadActiveAssignments(taskDb, taskIds);

  return rows.map((row) => mapTask(row, activeAssignments.get(toNumber(row.id)) ?? null));
}

export async function getStoredTaskById(taskId: string): Promise<Task | null> {
  await initializeSchema();

  const numericTaskId = parseTaskId(taskId);

  if (!numericTaskId) {
    return null;
  }

  const row = await getTaskRowById(taskDb, numericTaskId);

  if (!row) {
    return null;
  }

  const [assignmentHistory, comments, activityLog] = await Promise.all([
    loadAssignmentHistory(taskDb, numericTaskId),
    loadTaskComments(taskDb, numericTaskId),
    loadTaskActivity(taskDb, numericTaskId),
  ]);

  const activeAssignment =
    assignmentHistory.find((assignment) => assignment.isActive) ?? null;

  return mapTask(row, activeAssignment, assignmentHistory, comments, activityLog);
}

export function canUserAccessTask(user: User, task: Task | null): boolean {
  if (!task) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.role !== 'salesman') {
    return false;
  }

  return task.activeAssignment?.assigneeUserId === user.id;
}

export async function createStoredTask(params: CreateStoredTaskParams): Promise<Task> {
  await initializeSchema();

  if (!params.title.trim()) {
    throw new Error('Task title is required.');
  }

  const priorityCode = params.priorityCode ?? 'medium';

  if (!TASK_PRIORITY_CODES.includes(priorityCode)) {
    throw new Error('Invalid task priority.');
  }

  return taskDb.$transaction(async (tx) => {
    const timestamp = new Date().toISOString();
    const normalizedStartAt = normalizeNullableIso(params.startAt);
    const normalizedDueAt = normalizeNullableIso(params.dueAt);

    await tx.$executeRawUnsafe(
      `INSERT INTO tasks (
        task_key,
        title,
        description,
        priority_code,
        status_code,
        company_id,
        customer_id,
        customer_name_snapshot,
        order_id,
        start_at,
        due_at,
        completed_at,
        created_by_user_id,
        created_by_role,
        created_by_name_snapshot,
        updated_by_user_id,
        updated_by_role,
        updated_by_name_snapshot,
        created_at,
        updated_at,
        archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `task-temp-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      params.title.trim(),
      normalizeNullableText(params.description),
      priorityCode,
      'pending',
      params.companyId ?? null,
      normalizeNullableText(params.customerId),
      normalizeNullableText(params.customerNameSnapshot),
      normalizeNullableText(params.orderId),
      normalizedStartAt,
      normalizedDueAt,
      null,
      params.createdBy.id,
      params.createdBy.role,
      params.createdBy.name,
      params.createdBy.id,
      params.createdBy.role,
      params.createdBy.name,
      timestamp,
      timestamp,
      null
    );

    const idRows = await tx.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      'SELECT last_insert_rowid() AS id'
    );
    const taskId = toNumber(idRows[0]?.id);
    const taskKey = generateTaskKey(taskId);

    await tx.$executeRawUnsafe('UPDATE tasks SET task_key = ? WHERE id = ?', taskKey, taskId);

    await insertActivityLog(tx, taskId, params.createdBy, 'task_created', null, null, null, {
      title: params.title.trim(),
      priorityCode,
    });

    if (params.assignee) {
      await tx.$executeRawUnsafe(
        `INSERT INTO task_assignments (
          task_id,
          assignee_user_id,
          assignee_role,
          assignee_name_snapshot,
          assigned_by_user_id,
          assigned_by_role,
          assigned_by_name_snapshot,
          assigned_at,
          unassigned_at,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        taskId,
        params.assignee.id,
        'salesman',
        params.assignee.name,
        params.createdBy.id,
        params.createdBy.role,
        params.createdBy.name,
        timestamp,
        null,
        1
      );

      await insertActivityLog(
        tx,
        taskId,
        params.createdBy,
        'task_assigned',
        'assignee',
        null,
        params.assignee.name,
        {
          assigneeUserId: params.assignee.id,
        }
      );
    }

    const createdTask = await getTaskByIdFromExecutor(tx, taskId);

    if (!createdTask) {
      throw new Error('Failed to load created task.');
    }

    return createdTask;
  });
}

async function getTaskByIdFromExecutor(
  executor: SqlExecutor,
  numericTaskId: number
): Promise<Task | null> {
  const row = await getTaskRowById(executor, numericTaskId);

  if (!row) {
    return null;
  }

  const [assignmentHistory, comments, activityLog] = await Promise.all([
    loadAssignmentHistory(executor, numericTaskId),
    loadTaskComments(executor, numericTaskId),
    loadTaskActivity(executor, numericTaskId),
  ]);

  const activeAssignment =
    assignmentHistory.find((assignment) => assignment.isActive) ?? null;

  return mapTask(row, activeAssignment, assignmentHistory, comments, activityLog);
}

export async function updateStoredTask(
  taskId: string,
  params: UpdateStoredTaskParams
): Promise<Task | null> {
  await initializeSchema();

  const numericTaskId = parseTaskId(taskId);

  if (!numericTaskId) {
    return null;
  }

  return taskDb.$transaction(async (tx) => {
    const existingRow = await getTaskRowById(tx, numericTaskId);

    if (!existingRow) {
      return null;
    }

    const nextTitle = params.title !== undefined ? params.title.trim() : existingRow.title;
    if (!nextTitle) {
      throw new Error('Task title is required.');
    }

    const nextPriorityCode =
      params.priorityCode !== undefined ? params.priorityCode : existingRow.priority_code;

    if (!TASK_PRIORITY_CODES.includes(nextPriorityCode)) {
      throw new Error('Invalid task priority.');
    }

    const nextDescription =
      params.description !== undefined
        ? normalizeNullableText(params.description)
        : existingRow.description;
    const nextCompanyId =
      params.companyId !== undefined ? params.companyId : existingRow.company_id;
    const nextCustomerId =
      params.customerId !== undefined ? normalizeNullableText(params.customerId) : existingRow.customer_id;
    const nextCustomerName =
      params.customerNameSnapshot !== undefined
        ? normalizeNullableText(params.customerNameSnapshot)
        : existingRow.customer_name_snapshot;
    const nextOrderId =
      params.orderId !== undefined ? normalizeNullableText(params.orderId) : existingRow.order_id;
    const nextStartAt =
      params.startAt !== undefined ? normalizeNullableIso(params.startAt) : existingRow.start_at;
    const nextDueAt =
      params.dueAt !== undefined ? normalizeNullableIso(params.dueAt) : existingRow.due_at;
    const nextArchivedAt =
      params.archive === undefined
        ? existingRow.archived_at
        : params.archive
          ? existingRow.archived_at || new Date().toISOString()
          : null;

    const timestamp = new Date().toISOString();

    await tx.$executeRawUnsafe(
      `UPDATE tasks
       SET title = ?,
           description = ?,
           priority_code = ?,
           company_id = ?,
           customer_id = ?,
           customer_name_snapshot = ?,
           order_id = ?,
           start_at = ?,
           due_at = ?,
           archived_at = ?,
           updated_by_user_id = ?,
           updated_by_role = ?,
           updated_by_name_snapshot = ?,
           updated_at = ?
       WHERE id = ?`,
      nextTitle,
      nextDescription,
      nextPriorityCode,
      nextCompanyId ?? null,
      nextCustomerId,
      nextCustomerName,
      nextOrderId,
      nextStartAt,
      nextDueAt,
      nextArchivedAt,
      params.updatedBy.id,
      params.updatedBy.role,
      params.updatedBy.name,
      timestamp,
      numericTaskId
    );

    const trackedChanges: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [
      { field: 'title', oldValue: existingRow.title, newValue: nextTitle },
      { field: 'description', oldValue: existingRow.description, newValue: nextDescription },
      { field: 'priority_code', oldValue: existingRow.priority_code, newValue: nextPriorityCode },
      {
        field: 'company_id',
        oldValue: existingRow.company_id == null ? null : String(existingRow.company_id),
        newValue: nextCompanyId == null ? null : String(nextCompanyId),
      },
      { field: 'customer_id', oldValue: existingRow.customer_id, newValue: nextCustomerId },
      {
        field: 'customer_name_snapshot',
        oldValue: existingRow.customer_name_snapshot,
        newValue: nextCustomerName,
      },
      { field: 'order_id', oldValue: existingRow.order_id, newValue: nextOrderId },
      { field: 'start_at', oldValue: existingRow.start_at, newValue: nextStartAt },
      { field: 'due_at', oldValue: existingRow.due_at, newValue: nextDueAt },
      { field: 'archived_at', oldValue: existingRow.archived_at, newValue: nextArchivedAt },
    ];

    for (const change of trackedChanges) {
      if ((change.oldValue ?? null) !== (change.newValue ?? null)) {
        await insertActivityLog(
          tx,
          numericTaskId,
          params.updatedBy,
          change.field === 'archived_at'
            ? nextArchivedAt
              ? 'task_archived'
              : 'task_unarchived'
            : 'task_updated',
          change.field,
          change.oldValue,
          change.newValue
        );
      }
    }

    return getTaskByIdFromExecutor(tx, numericTaskId);
  });
}

export async function assignStoredTask(
  params: AssignStoredTaskParams
): Promise<Task | null> {
  await initializeSchema();

  const numericTaskId = parseTaskId(params.taskId);

  if (!numericTaskId) {
    return null;
  }

  return taskDb.$transaction(async (tx) => {
    const existingRow = await getTaskRowById(tx, numericTaskId);

    if (!existingRow) {
      return null;
    }

    const existingAssignments = await loadAssignmentHistory(tx, numericTaskId);
    const currentActiveAssignment =
      existingAssignments.find((assignment) => assignment.isActive) ?? null;
    const timestamp = new Date().toISOString();

    if (currentActiveAssignment) {
      await tx.$executeRawUnsafe(
        `UPDATE task_assignments
         SET is_active = 0,
             unassigned_at = ?
         WHERE id = ?`,
        timestamp,
        Number(currentActiveAssignment.id)
      );
    }

    if (params.assignee) {
      await tx.$executeRawUnsafe(
        `INSERT INTO task_assignments (
          task_id,
          assignee_user_id,
          assignee_role,
          assignee_name_snapshot,
          assigned_by_user_id,
          assigned_by_role,
          assigned_by_name_snapshot,
          assigned_at,
          unassigned_at,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        numericTaskId,
        params.assignee.id,
        'salesman',
        params.assignee.name,
        params.assignedBy.id,
        params.assignedBy.role,
        params.assignedBy.name,
        timestamp,
        null,
        1
      );
    }

    await tx.$executeRawUnsafe(
      `UPDATE tasks
       SET updated_by_user_id = ?,
           updated_by_role = ?,
           updated_by_name_snapshot = ?,
           updated_at = ?
       WHERE id = ?`,
      params.assignedBy.id,
      params.assignedBy.role,
      params.assignedBy.name,
      timestamp,
      numericTaskId
    );

    await insertActivityLog(
      tx,
      numericTaskId,
      params.assignedBy,
      params.assignee
        ? currentActiveAssignment
          ? 'task_reassigned'
          : 'task_assigned'
        : 'task_unassigned',
      'assignee',
      currentActiveAssignment?.assigneeName ?? null,
      params.assignee?.name ?? null,
      {
        previousAssigneeUserId: currentActiveAssignment?.assigneeUserId ?? null,
        assigneeUserId: params.assignee?.id ?? null,
      }
    );

    return getTaskByIdFromExecutor(tx, numericTaskId);
  });
}

export async function updateStoredTaskStatus(
  params: UpdateStoredTaskStatusParams
): Promise<Task | null> {
  await initializeSchema();

  const numericTaskId = parseTaskId(params.taskId);

  if (!numericTaskId) {
    return null;
  }

  if (!TASK_STATUS_CODES.includes(params.statusCode)) {
    throw new Error('Invalid task status.');
  }

  return taskDb.$transaction(async (tx) => {
    const existingRow = await getTaskRowById(tx, numericTaskId);

    if (!existingRow) {
      return null;
    }

    if (existingRow.archived_at) {
      throw new Error('Archived tasks cannot be updated.');
    }

    if (existingRow.status_code === params.statusCode) {
      return getTaskByIdFromExecutor(tx, numericTaskId);
    }

    const completedAt =
      params.statusCode === 'completed'
        ? new Date().toISOString()
        : existingRow.status_code === 'completed'
          ? null
          : existingRow.completed_at;

    const timestamp = new Date().toISOString();

    await tx.$executeRawUnsafe(
      `UPDATE tasks
       SET status_code = ?,
           completed_at = ?,
           updated_by_user_id = ?,
           updated_by_role = ?,
           updated_by_name_snapshot = ?,
           updated_at = ?
       WHERE id = ?`,
      params.statusCode,
      completedAt,
      params.updatedBy.id,
      params.updatedBy.role,
      params.updatedBy.name,
      timestamp,
      numericTaskId
    );

    await insertActivityLog(
      tx,
      numericTaskId,
      params.updatedBy,
      'status_changed',
      'status_code',
      existingRow.status_code,
      params.statusCode,
      {
        completedAt,
      }
    );

    return getTaskByIdFromExecutor(tx, numericTaskId);
  });
}

export async function listStoredTaskComments(taskId: string): Promise<TaskComment[] | null> {
  await initializeSchema();

  const numericTaskId = parseTaskId(taskId);

  if (!numericTaskId) {
    return null;
  }

  const task = await getTaskRowById(taskDb, numericTaskId);
  if (!task) {
    return null;
  }

  return loadTaskComments(taskDb, numericTaskId);
}

export async function createStoredTaskComment(
  params: CreateStoredTaskCommentParams
): Promise<TaskComment | null> {
  await initializeSchema();

  const numericTaskId = parseTaskId(params.taskId);

  if (!numericTaskId) {
    return null;
  }

  if (!params.body.trim()) {
    throw new Error('Comment body is required.');
  }

  return taskDb.$transaction(async (tx) => {
    const existingRow = await getTaskRowById(tx, numericTaskId);

    if (!existingRow) {
      return null;
    }

    const timestamp = new Date().toISOString();

    await tx.$executeRawUnsafe(
      `INSERT INTO task_comments (
        task_id,
        author_user_id,
        author_role,
        author_name_snapshot,
        body,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      numericTaskId,
      params.author.id,
      params.author.role,
      params.author.name,
      params.body.trim(),
      timestamp
    );

    const commentIdRows = await tx.$queryRawUnsafe<Array<{ id: number | bigint }>>(
      'SELECT last_insert_rowid() AS id'
    );
    const commentId = toNumber(commentIdRows[0]?.id);

    await insertActivityLog(tx, numericTaskId, params.author, 'comment_added', 'comment', null, null, {
      commentId,
    });

    const rows = await tx.$queryRawUnsafe<TaskCommentRow[]>(
      `SELECT id, task_id, author_user_id, author_role, author_name_snapshot, body, created_at
       FROM task_comments
       WHERE id = ?`,
      commentId
    );

    return rows[0] ? mapTaskComment(rows[0]) : null;
  });
}

export async function resolveActiveSalesmanAssignee(
  assigneeUserId?: string | null
): Promise<Salesman | null> {
  const normalizedId = assigneeUserId?.trim();

  if (!normalizedId) {
    return null;
  }

  const salesman = await getSalesmanById(normalizedId);

  if (!salesman || !salesman.isActive) {
    throw new Error('Selected salesman is not available for assignment.');
  }

  return salesman;
}
