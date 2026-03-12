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
import { taskService } from '../services/task.service';

export class TaskController {
  async getTasks(filter: TaskFilter): Promise<{ success: boolean; data?: Task[]; error?: string }> {
    try {
      const tasks = await taskService.getTasks(filter);
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tasks.',
      };
    }
  }

  async getTaskById(id: string): Promise<{ success: boolean; data?: Task | null; error?: string }> {
    try {
      const task = await taskService.getTaskById(id);
      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task.',
      };
    }
  }

  async getLookups(): Promise<{ success: boolean; data?: TaskLookups; error?: string }> {
    try {
      const lookups = await taskService.getTaskLookups();
      return { success: true, data: lookups };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task lookups.',
      };
    }
  }

  async createTask(payload: CreateTaskPayload): Promise<{ success: boolean; data?: Task; error?: string }> {
    const result = await taskService.createTask(payload);
    return {
      success: result.success,
      data: result.task,
      error: result.error,
    };
  }

  async updateTask(
    id: string,
    payload: UpdateTaskPayload
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    const result = await taskService.updateTask(id, payload);
    return {
      success: result.success,
      data: result.task,
      error: result.error,
    };
  }

  async assignTask(
    id: string,
    payload: AssignTaskPayload
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    const result = await taskService.assignTask(id, payload);
    return {
      success: result.success,
      data: result.task,
      error: result.error,
    };
  }

  async updateTaskStatus(
    id: string,
    statusCode: TaskStatusCode
  ): Promise<{ success: boolean; data?: Task; error?: string }> {
    const result = await taskService.updateTaskStatus(id, statusCode);
    return {
      success: result.success,
      data: result.task,
      error: result.error,
    };
  }

  async getTaskComments(
    id: string
  ): Promise<{ success: boolean; data?: TaskComment[]; error?: string }> {
    try {
      const comments = await taskService.getTaskComments(id);
      return { success: true, data: comments };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch task comments.',
      };
    }
  }

  async addTaskComment(
    id: string,
    payload: CreateTaskCommentPayload
  ): Promise<{ success: boolean; data?: TaskComment; error?: string }> {
    const result = await taskService.addTaskComment(id, payload);
    return {
      success: result.success,
      data: result.comment,
      error: result.error,
    };
  }
}

export const taskController = new TaskController();
