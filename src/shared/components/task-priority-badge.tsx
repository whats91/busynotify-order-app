/*
 * File Context:
 * Purpose: Provides the shared Task Priority Badge component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/components/ui/badge.tsx, src/lib/utils.ts, src/shared/types/index.ts
 * Role: shared UI.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskPriorityCode } from '@/shared/types';

const taskPriorityConfig: Record<TaskPriorityCode, { label: string; className: string }> = {
  low: {
    label: 'Low',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  medium: {
    label: 'Medium',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  high: {
    label: 'High',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
};

interface TaskPriorityBadgeProps {
  priority: TaskPriorityCode;
  className?: string;
}

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
  const config = taskPriorityConfig[priority];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
