/*
 * File Context:
 * Purpose: Provides the shared Task Status Badge component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/components/ui/badge.tsx, src/lib/utils.ts, src/shared/types/index.ts
 * Role: shared UI.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskStatusCode } from '@/shared/types';

const taskStatusConfig: Record<TaskStatusCode, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
};

interface TaskStatusBadgeProps {
  status: TaskStatusCode;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = taskStatusConfig[status];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
