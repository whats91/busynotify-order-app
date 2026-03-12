'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MessageSquarePlus, Save, UserPlus } from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
import { TaskPriorityBadge } from '@/shared/components/task-priority-badge';
import { TaskStatusBadge } from '@/shared/components/task-status-badge';
import { useAuthStore, useHasHydrated } from '@/shared/lib/stores';
import { taskService } from '@/versions/v1/services';
import type { Task, TaskLookups, TaskStatusCode, UpdateTaskPayload } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface TaskEditFormState {
  title: string;
  description: string;
  priorityCode: string;
  companyId: string;
  customerId: string;
  customerNameSnapshot: string;
  orderId: string;
  startAt: string;
  dueAt: string;
  archive: boolean;
}

const salesmanStatusOptions: TaskStatusCode[] = [
  'pending',
  'in_progress',
  'blocked',
  'completed',
];

function formatDateTime(value?: string): string {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toInputDateTime(value?: string): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offsetMinutes = parsed.getTimezoneOffset();
  const localDate = new Date(parsed.getTime() - offsetMinutes * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildEditFormState(task: Task): TaskEditFormState {
  return {
    title: task.title,
    description: task.description || '',
    priorityCode: task.priorityCode,
    companyId: task.companyId ? String(task.companyId) : '',
    customerId: task.customerId || '',
    customerNameSnapshot: task.customerNameSnapshot || '',
    orderId: task.orderId || '',
    startAt: toInputDateTime(task.startAt),
    dueAt: toInputDateTime(task.dueAt),
    archive: Boolean(task.archivedAt),
  };
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();

  const [task, setTask] = useState<Task | null>(null);
  const [lookups, setLookups] = useState<TaskLookups | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormState, setEditFormState] = useState<TaskEditFormState | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('unassigned');
  const [commentBody, setCommentBody] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);

  const taskId = params?.id;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated || !user) {
      window.location.href = '/staff-login';
      return;
    }

    if (user.role === 'customer') {
      window.location.href = '/dashboard';
      return;
    }

    if (!taskId) {
      return;
    }

    void loadTaskDetail(taskId);
  }, [hasHydrated, isAuthenticated, taskId, user]);

  const allowedStatusOptions = useMemo(
    () =>
      isAdmin
        ? lookups?.statuses.map((status) => status.code) ?? []
        : salesmanStatusOptions,
    [isAdmin, lookups?.statuses]
  );

  async function loadTaskDetail(id: string) {
    setIsLoading(true);

    try {
      const [nextTask, nextLookups] = await Promise.all([
        taskService.getTaskById(id),
        taskService.getTaskLookups(),
      ]);

      if (!nextTask) {
        toast({
          variant: 'destructive',
          title: 'Task not found',
        });
        router.push('/tasks');
        return;
      }

      setTask(nextTask);
      setLookups(nextLookups);
      setSelectedStatus(nextTask.statusCode);
      setSelectedAssigneeId(nextTask.activeAssignment?.assigneeUserId || 'unassigned');
      setEditFormState(buildEditFormState(nextTask));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load task',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      router.push('/tasks');
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshTask() {
    if (!taskId) {
      return;
    }

    const nextTask = await taskService.getTaskById(taskId);
    if (nextTask) {
      setTask(nextTask);
      setSelectedStatus(nextTask.statusCode);
      setSelectedAssigneeId(nextTask.activeAssignment?.assigneeUserId || 'unassigned');
      setEditFormState(buildEditFormState(nextTask));
    }
  }

  async function handleStatusUpdate() {
    if (!task || !selectedStatus) {
      return;
    }

    setIsSavingStatus(true);

    try {
      const result = await taskService.updateTaskStatus(task.id, selectedStatus as TaskStatusCode);

      if (!result.success || !result.task) {
        throw new Error(result.error || 'Failed to update task status.');
      }

      setTask(result.task);
      setSelectedStatus(result.task.statusCode);
      toast({
        title: 'Status updated',
        description: `${result.task.taskKey} is now ${result.task.statusCode.replace('_', ' ')}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Status update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleAssignmentUpdate() {
    if (!task || !isAdmin) {
      return;
    }

    setIsSavingAssignment(true);

    try {
      const result = await taskService.assignTask(task.id, {
        assigneeUserId: selectedAssigneeId === 'unassigned' ? null : selectedAssigneeId,
      });

      if (!result.success || !result.task) {
        throw new Error(result.error || 'Failed to update assignment.');
      }

      setTask(result.task);
      setSelectedAssigneeId(result.task.activeAssignment?.assigneeUserId || 'unassigned');
      toast({
        title: 'Assignment updated',
        description: result.task.activeAssignment
          ? `Assigned to ${result.task.activeAssignment.assigneeName}.`
          : 'Task is now unassigned.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Assignment update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!task || !editFormState) {
      return;
    }

    setIsSavingEdit(true);

    try {
      const payload: UpdateTaskPayload = {
        title: editFormState.title,
        description: editFormState.description || null,
        priorityCode: editFormState.priorityCode as UpdateTaskPayload['priorityCode'],
        companyId: editFormState.companyId ? Number(editFormState.companyId) : null,
        customerId: editFormState.customerId || null,
        customerNameSnapshot: editFormState.customerNameSnapshot || null,
        orderId: editFormState.orderId || null,
        startAt: toIsoOrNull(editFormState.startAt),
        dueAt: toIsoOrNull(editFormState.dueAt),
        archive: editFormState.archive,
      };

      const result = await taskService.updateTask(task.id, payload);

      if (!result.success || !result.task) {
        throw new Error(result.error || 'Failed to update task.');
      }

      setTask(result.task);
      setEditFormState(buildEditFormState(result.task));
      setIsEditDialogOpen(false);
      toast({
        title: 'Task updated',
        description: `${result.task.taskKey} has been saved.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Task update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!task || !commentBody.trim()) {
      return;
    }

    setIsSavingComment(true);

    try {
      const result = await taskService.addTaskComment(task.id, {
        body: commentBody.trim(),
      });

      if (!result.success || !result.comment) {
        throw new Error(result.error || 'Failed to add comment.');
      }

      setCommentBody('');
      await refreshTask();
      toast({
        title: 'Comment added',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Comment failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSavingComment(false);
    }
  }

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role === 'customer') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Button variant="ghost" className="w-fit px-0" onClick={() => router.push('/tasks')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Button>
            {isLoading || !task ? (
              <div className="space-y-2">
                <div className="h-8 w-56 animate-pulse rounded bg-muted" />
                <div className="h-4 w-72 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
                  <TaskStatusBadge status={task.statusCode} />
                  <TaskPriorityBadge priority={task.priorityCode} />
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{task.taskKey}</span>
                  <span>Created {formatDateTime(task.createdAt)}</span>
                  {task.archivedAt ? <span>Archived {formatDateTime(task.archivedAt)}</span> : null}
                </div>
              </>
            )}
          </div>

          {isAdmin && task ? (
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              Edit Task
            </Button>
          ) : null}
        </div>

        {isLoading || !task ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.description || 'No additional description provided.'}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Start At</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(task.startAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Due At</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(task.dueAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.companyId ? `#${task.companyId}` : 'Not linked'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Order</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.orderId || 'Not linked'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Customer ID</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.customerId || 'Not linked'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Customer Name</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.customerNameSnapshot || 'Not linked'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form className="space-y-3" onSubmit={handleCommentSubmit}>
                    <Textarea
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                      rows={3}
                      placeholder="Add an update, note, or blocker for this task."
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSavingComment || !commentBody.trim()}>
                        {isSavingComment ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="mr-2 h-4 w-4" />
                        )}
                        Add Comment
                      </Button>
                    </div>
                  </form>

                  <ScrollArea className="h-80 rounded-lg border">
                    <div className="space-y-4 p-4">
                      {task.comments && task.comments.length > 0 ? (
                        task.comments.map((comment) => (
                          <div key={comment.id} className="rounded-lg border bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-medium">{comment.authorName}</p>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  {comment.authorRole}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(comment.createdAt)}
                              </p>
                            </div>
                            <p className="mt-3 text-sm text-foreground">{comment.body}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No comments yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80 rounded-lg border">
                    <div className="space-y-4 p-4">
                      {task.activityLog && task.activityLog.length > 0 ? (
                        task.activityLog.map((entry) => (
                          <div key={entry.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium">{entry.eventType.replaceAll('_', ' ')}</p>
                                <p className="text-sm text-muted-foreground">
                                  {entry.actorName} ({entry.actorRole})
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(entry.createdAt)}
                              </p>
                            </div>
                            {entry.fieldName || entry.oldValue || entry.newValue ? (
                              <div className="mt-3 text-sm text-muted-foreground">
                                {entry.fieldName ? <p>Field: {entry.fieldName}</p> : null}
                                {entry.oldValue ? <p>From: {entry.oldValue}</p> : null}
                                {entry.newValue ? <p>To: {entry.newValue}</p> : null}
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStatusOptions.map((statusCode) => (
                        <SelectItem key={statusCode} value={statusCode}>
                          {statusCode.replaceAll('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full"
                    onClick={handleStatusUpdate}
                    disabled={isSavingStatus || selectedStatus === task.statusCode}
                  >
                    {isSavingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Status
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Current Assignee</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.activeAssignment?.assigneeName || 'Unassigned'}
                    </p>
                  </div>

                  {isAdmin ? (
                    <>
                      <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {lookups?.salesmen.map((salesman) => (
                            <SelectItem key={salesman.id} value={salesman.id}>
                              {salesman.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button className="w-full" onClick={handleAssignmentUpdate} disabled={isSavingAssignment}>
                        {isSavingAssignment ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        Save Assignment
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Assignment can only be changed by an admin.
                    </p>
                  )}

                  {task.assignmentHistory && task.assignmentHistory.length > 0 ? (
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-sm font-medium">Assignment History</p>
                      <div className="space-y-2">
                        {task.assignmentHistory.map((assignment) => (
                          <div key={assignment.id} className="text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">{assignment.assigneeName}</p>
                            <p>Assigned {formatDateTime(assignment.assignedAt)}</p>
                            {assignment.unassignedAt ? (
                              <p>Unassigned {formatDateTime(assignment.unassignedAt)}</p>
                            ) : (
                              <p>Currently assigned</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Created By</p>
                    <p>
                      {task.createdByNameSnapshot} ({task.createdByRole})
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Last Updated By</p>
                    <p>
                      {task.updatedByNameSnapshot} ({task.updatedByRole})
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Completed At</p>
                    <p>{formatDateTime(task.completedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details, due dates, and archive state.
            </DialogDescription>
          </DialogHeader>

          {editFormState ? (
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="edit-task-title">Title</Label>
                  <Input
                    id="edit-task-title"
                    className="mt-2"
                    value={editFormState.title}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current ? { ...current, title: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-task-description">Description</Label>
                  <Textarea
                    id="edit-task-description"
                    className="mt-2"
                    value={editFormState.description}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current ? { ...current, description: event.target.value } : current
                      )
                    }
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={editFormState.priorityCode}
                    onValueChange={(value) =>
                      setEditFormState((current) =>
                        current ? { ...current, priorityCode: value } : current
                      )
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups?.priorities.map((priority) => (
                        <SelectItem key={priority.code} value={priority.code}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-task-company">Company ID</Label>
                  <Input
                    id="edit-task-company"
                    className="mt-2"
                    value={editFormState.companyId}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current
                          ? {
                              ...current,
                              companyId: event.target.value.replace(/[^\d]/g, ''),
                            }
                          : current
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-customer-id">Customer ID</Label>
                  <Input
                    id="edit-task-customer-id"
                    className="mt-2"
                    value={editFormState.customerId}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current ? { ...current, customerId: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-customer-name">Customer Name</Label>
                  <Input
                    id="edit-task-customer-name"
                    className="mt-2"
                    value={editFormState.customerNameSnapshot}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current
                          ? { ...current, customerNameSnapshot: event.target.value }
                          : current
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-order-id">Order ID</Label>
                  <Input
                    id="edit-task-order-id"
                    className="mt-2"
                    value={editFormState.orderId}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current ? { ...current, orderId: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-start-at">Start At</Label>
                  <Input
                    id="edit-task-start-at"
                    className="mt-2"
                    type="datetime-local"
                    value={editFormState.startAt}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current ? { ...current, startAt: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-task-due-at">Due At</Label>
                  <Input
                    id="edit-task-due-at"
                    className="mt-2"
                    type="datetime-local"
                    value={editFormState.dueAt}
                    onChange={(event) =>
                      setEditFormState((current) =>
                        current ? { ...current, dueAt: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-between rounded-lg border px-3 py-3">
                  <div>
                    <p className="text-sm font-medium">Archive Task</p>
                    <p className="text-sm text-muted-foreground">
                      Archived tasks stay in history but stop accepting status updates.
                    </p>
                  </div>
                  <Switch
                    checked={editFormState.archive}
                    onCheckedChange={(checked) =>
                      setEditFormState((current) =>
                        current ? { ...current, archive: checked } : current
                      )
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
