# Task Management System v1

## Overview

This module uses a dedicated SQLite database, separate from the main app database.

- Environment variable: `TASKS_DATABASE_URL`
- Fallback path: `file:data/busy-notify-tasks.sqlite`
- Auth model: existing app login and private API session
- Roles:
  - `admin`: full task management
  - `salesman`: view and update only currently assigned tasks
  - `customer`: no task access

## Database Schema

### `task_priorities`
- `code TEXT PRIMARY KEY`
- `label TEXT NOT NULL`
- `sort_order INTEGER NOT NULL`
- `is_default INTEGER NOT NULL`

Seeded values:
- `low`
- `medium`
- `high`

### `task_statuses`
- `code TEXT PRIMARY KEY`
- `label TEXT NOT NULL`
- `sort_order INTEGER NOT NULL`
- `is_terminal INTEGER NOT NULL`

Seeded values:
- `pending`
- `in_progress`
- `blocked`
- `completed`
- `cancelled`

### `tasks`
- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `task_key TEXT NOT NULL UNIQUE`
- `title TEXT NOT NULL`
- `description TEXT`
- `priority_code TEXT NOT NULL`
- `status_code TEXT NOT NULL`
- `company_id INTEGER`
- `customer_id TEXT`
- `customer_name_snapshot TEXT`
- `order_id TEXT`
- `start_at TEXT`
- `due_at TEXT`
- `completed_at TEXT`
- `created_by_user_id TEXT NOT NULL`
- `created_by_role TEXT NOT NULL`
- `created_by_name_snapshot TEXT NOT NULL`
- `updated_by_user_id TEXT NOT NULL`
- `updated_by_role TEXT NOT NULL`
- `updated_by_name_snapshot TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `archived_at TEXT`

### `task_assignments`
- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `task_id INTEGER NOT NULL`
- `assignee_user_id TEXT NOT NULL`
- `assignee_role TEXT NOT NULL`
- `assignee_name_snapshot TEXT NOT NULL`
- `assigned_by_user_id TEXT NOT NULL`
- `assigned_by_role TEXT NOT NULL`
- `assigned_by_name_snapshot TEXT NOT NULL`
- `assigned_at TEXT NOT NULL`
- `unassigned_at TEXT`
- `is_active INTEGER NOT NULL`

Rules:
- one active assignment per task via partial unique index
- assignment history is preserved

### `task_comments`
- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `task_id INTEGER NOT NULL`
- `author_user_id TEXT NOT NULL`
- `author_role TEXT NOT NULL`
- `author_name_snapshot TEXT NOT NULL`
- `body TEXT NOT NULL`
- `created_at TEXT NOT NULL`

Comments are append-only in v1.

### `task_activity_log`
- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `task_id INTEGER NOT NULL`
- `actor_user_id TEXT NOT NULL`
- `actor_role TEXT NOT NULL`
- `actor_name_snapshot TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `field_name TEXT`
- `old_value TEXT`
- `new_value TEXT`
- `meta_json TEXT`
- `created_at TEXT NOT NULL`

This table stores creation, edit, assignment, status, archive, and comment events.

## Relationships

- `tasks.priority_code -> task_priorities.code`
- `tasks.status_code -> task_statuses.code`
- `task_assignments.task_id -> tasks.id`
- `task_comments.task_id -> tasks.id`
- `task_activity_log.task_id -> tasks.id`

The task database does not include a local `users` table. It stores external app user IDs, roles, and name snapshots.

## Internal APIs

- `GET /api/internal/tasks`
- `POST /api/internal/tasks`
- `GET /api/internal/tasks/lookups`
- `GET /api/internal/tasks/:id`
- `PATCH /api/internal/tasks/:id`
- `POST /api/internal/tasks/:id/assign`
- `PATCH /api/internal/tasks/:id/status`
- `GET /api/internal/tasks/:id/comments`
- `POST /api/internal/tasks/:id/comments`

## Permissions

### Admin
- create tasks
- edit task details
- assign and reassign tasks
- archive and unarchive tasks
- change any task status
- comment on any task
- view all tasks

### Salesman
- view only currently assigned tasks
- update status for currently assigned tasks
- add comments on currently assigned tasks
- cannot edit title, description, dates, priority, or assignments

### Customer
- no task access in v1

## Status Flow

Admin can move tasks to any seeded status.

Salesman can move assigned tasks between:
- `pending`
- `in_progress`
- `blocked`
- `completed`

`completed_at` is set when a task becomes `completed` and cleared when it is reopened.

Archived tasks remain queryable but reject status changes.

## UI Layout

### Sidebar
- top-level `Tasks` menu item
- visible to `admin` and `salesman`

### `/tasks`
- admin:
  - full task list
  - create dialog
  - filters for status, priority, assignee, company, customer, order, due date, archived state, and search
- salesman:
  - `My Tasks` view only
  - server-scoped to active assignments

### `/tasks/[id]`
- task header with key, status, and priority
- task detail card
- status control
- assignment panel
- comments panel
- activity log
- admin edit dialog

## Lifecycle Rules

1. Admin creates a task.
2. Task may be left unassigned or assigned immediately.
3. Assignment history is preserved across reassignments.
4. Admin or active assignee adds comments.
5. Admin or active assignee updates status.
6. Admin can archive/unarchive as needed.

## Verification Targets

- schema bootstrap is idempotent
- list/detail APIs respect role boundaries
- only one active assignment exists per task
- salesman visibility is limited to active assignments
- comment and status events create audit log entries
