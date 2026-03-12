import type {
  AssignTaskPayload,
  CreateTaskCommentPayload,
  CreateTaskPayload,
  Task,
  TaskComment,
  TaskFilter,
  TaskLookups,
  TaskStatusCode,
  UpdateTaskPayload,
} from '../../../shared/types';

function buildTaskSearchParams(filter: TaskFilter): string {
  const searchParams = new URLSearchParams();

  if (filter.search) {
    searchParams.set('search', filter.search);
  }
  if (filter.statusCode) {
    searchParams.set('statusCode', filter.statusCode);
  }
  if (filter.priorityCode) {
    searchParams.set('priorityCode', filter.priorityCode);
  }
  if (filter.assigneeUserId) {
    searchParams.set('assigneeUserId', filter.assigneeUserId);
  }
  if (filter.companyId != null) {
    searchParams.set('companyId', String(filter.companyId));
  }
  if (filter.customerId) {
    searchParams.set('customerId', filter.customerId);
  }
  if (filter.orderId) {
    searchParams.set('orderId', filter.orderId);
  }
  if (filter.dueDate) {
    searchParams.set('dueDate', filter.dueDate);
  }
  if (filter.includeArchived) {
    searchParams.set('includeArchived', 'true');
  }
  if (filter.onlyMine) {
    searchParams.set('onlyMine', 'true');
  }

  return searchParams.toString();
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = (await response.json()) as {
    success?: boolean;
    error?: string;
    data?: T;
  };

  if (!response.ok || data.success !== true || data.data === undefined) {
    throw new Error(data.error || fallbackMessage);
  }

  return data.data;
}

export class TaskRepository {
  async findAll(filter: TaskFilter = {}): Promise<Task[]> {
    const query = buildTaskSearchParams(filter);
    const response = await fetch(`/api/internal/tasks${query ? `?${query}` : ''}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    return parseResponse<Task[]>(response, 'Failed to fetch tasks.');
  }

  async findById(id: string): Promise<Task | null> {
    const response = await fetch(`/api/internal/tasks/${id}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (response.status === 404) {
      return null;
    }

    return parseResponse<Task>(response, 'Failed to fetch task.');
  }

  async getLookups(): Promise<TaskLookups> {
    const response = await fetch('/api/internal/tasks/lookups', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    return parseResponse<TaskLookups>(response, 'Failed to fetch task lookups.');
  }

  async create(payload: CreateTaskPayload): Promise<Task> {
    const response = await fetch('/api/internal/tasks', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseResponse<Task>(response, 'Failed to create task.');
  }

  async update(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const response = await fetch(`/api/internal/tasks/${id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseResponse<Task>(response, 'Failed to update task.');
  }

  async assign(id: string, payload: AssignTaskPayload): Promise<Task> {
    const response = await fetch(`/api/internal/tasks/${id}/assign`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseResponse<Task>(response, 'Failed to assign task.');
  }

  async updateStatus(id: string, statusCode: TaskStatusCode): Promise<Task> {
    const response = await fetch(`/api/internal/tasks/${id}/status`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ statusCode }),
    });

    return parseResponse<Task>(response, 'Failed to update task status.');
  }

  async getComments(id: string): Promise<TaskComment[]> {
    const response = await fetch(`/api/internal/tasks/${id}/comments`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    return parseResponse<TaskComment[]>(response, 'Failed to fetch comments.');
  }

  async addComment(id: string, payload: CreateTaskCommentPayload): Promise<TaskComment> {
    const response = await fetch(`/api/internal/tasks/${id}/comments`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseResponse<TaskComment>(response, 'Failed to add comment.');
  }
}

export const taskRepository = new TaskRepository();
