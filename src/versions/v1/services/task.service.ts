/*
 * File Context:
 * Purpose: Implements service-layer behavior for Task.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/task.repository.ts
 * Role: application data/service layer.
 */
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
import { taskRepository } from '../repositories/task.repository';

export class TaskService {
  async getTasks(filter: TaskFilter = {}): Promise<Task[]> {
    return taskRepository.findAll(filter);
  }

  async getTaskById(id: string): Promise<Task | null> {
    return taskRepository.findById(id);
  }

  async getTaskLookups(): Promise<TaskLookups> {
    return taskRepository.getLookups();
  }

  async createTask(payload: CreateTaskPayload): Promise<{
    success: boolean;
    task?: Task;
    error?: string;
  }> {
    try {
      const task = await taskRepository.create(payload);
      return { success: true, task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task.',
      };
    }
  }

  async updateTask(id: string, payload: UpdateTaskPayload): Promise<{
    success: boolean;
    task?: Task;
    error?: string;
  }> {
    try {
      const task = await taskRepository.update(id, payload);
      return { success: true, task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task.',
      };
    }
  }

  async assignTask(id: string, payload: AssignTaskPayload): Promise<{
    success: boolean;
    task?: Task;
    error?: string;
  }> {
    try {
      const task = await taskRepository.assign(id, payload);
      return { success: true, task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign task.',
      };
    }
  }

  async updateTaskStatus(id: string, statusCode: TaskStatusCode): Promise<{
    success: boolean;
    task?: Task;
    error?: string;
  }> {
    try {
      const task = await taskRepository.updateStatus(id, statusCode);
      return { success: true, task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task status.',
      };
    }
  }

  async getTaskComments(id: string): Promise<TaskComment[]> {
    return taskRepository.getComments(id);
  }

  async addTaskComment(id: string, payload: CreateTaskCommentPayload): Promise<{
    success: boolean;
    comment?: TaskComment;
    error?: string;
  }> {
    try {
      const comment = await taskRepository.addComment(id, payload);
      return { success: true, comment };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment.',
      };
    }
  }
}

export const taskService = new TaskService();
