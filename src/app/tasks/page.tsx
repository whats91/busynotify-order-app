/*
 * File Context:
 * Purpose: Implements the Next.js page for tasks.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/badge.tsx, src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/command.tsx
 * Role: role-based user-facing UI.
 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ChevronsUpDown,
  Filter,
  Loader2,
  Plus,
  Search,
  SquareArrowOutUpRight,
  UserRound,
} from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
import { TaskPriorityBadge } from '@/shared/components/task-priority-badge';
import { TaskStatusBadge } from '@/shared/components/task-status-badge';
import { cn } from '@/lib/utils';
import {
  useAuthStore,
  useHasHydrated,
  useSelectedCompany,
} from '@/shared/lib/stores';
import { useSetHeaderActions } from '@/shared/lib/header-action-context';
import { customerService, taskService } from '@/versions/v1/services';
import type {
  Company,
  CreateTaskPayload,
  Customer,
  Task,
  TaskFilter,
  TaskLookups,
} from '@/shared/types';
import { Badge } from '@/components/ui/badge';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

interface TaskFormState {
  title: string;
  description: string;
  priorityCode: CreateTaskPayload['priorityCode'];
  companyId: string;
  customerId: string;
  customerNameSnapshot: string;
  orderId: string;
  startAt: string;
  dueAt: string;
  assigneeUserId: string;
}

function getCurrentDateTimeLocalValue(referenceDate: Date = new Date()): string {
  const offsetMinutes = referenceDate.getTimezoneOffset();
  const localDate = new Date(referenceDate.getTime() - offsetMinutes * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function createTaskFormState(defaultCompanyId?: string): TaskFormState {
  const currentDateTime = getCurrentDateTimeLocalValue();

  return {
    title: '',
    description: '',
    priorityCode: 'medium',
    companyId: defaultCompanyId || '',
    customerId: '',
    customerNameSnapshot: '',
    orderId: '',
    startAt: currentDateTime,
    dueAt: currentDateTime,
    assigneeUserId: '',
  };
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

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

function TaskHeaderActions({
  isAdmin,
  onCreateTask,
}: {
  isAdmin: boolean;
  onCreateTask: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {isAdmin ? (
        <Button size="sm" onClick={onCreateTask}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      ) : null}
    </div>
  );
}

function TasksPageInner() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();
  const selectedCompany = useSelectedCompany();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [lookups, setLookups] = useState<TaskLookups | null>(null);
  const [companyOptions, setCompanyOptions] = useState<Company[]>([]);
  const [createCustomerOptions, setCreateCustomerOptions] = useState<Customer[]>([]);
  const [filterCustomerOptions, setFilterCustomerOptions] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [isCreateCustomersLoading, setIsCreateCustomersLoading] = useState(false);
  const [isFilterCustomersLoading, setIsFilterCustomersLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = useState(false);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [isFilterCustomerPopoverOpen, setIsFilterCustomerPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState<string>('all');
  const [priorityCode, setPriorityCode] = useState<string>('all');
  const [assigneeUserId, setAssigneeUserId] = useState<string>('all');
  const [customerId, setCustomerId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [formState, setFormState] = useState<TaskFormState>(() =>
    createTaskFormState()
  );

  const isAdmin = user?.role === 'admin';
  const selectedCreateCompany =
    companyOptions.find((company) => String(company.companyId) === formState.companyId) || null;
  const selectedCreateCustomer =
    createCustomerOptions.find((customer) => customer.id === formState.customerId) || null;
  const selectedFilterCustomer =
    filterCustomerOptions.find((customer) => customer.id === customerId) || null;
  const companyNameById = useMemo(
    () =>
      new Map(
        [selectedCompany, ...companyOptions]
          .filter((company): company is Company => Boolean(company))
          .map((company) => [company.companyId, company.companyName])
      ),
    [companyOptions, selectedCompany]
  );

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

    void loadPageData();
  }, [hasHydrated, isAuthenticated, user]);

  const taskFilter = useMemo<TaskFilter>(
    () => ({
      search: search.trim() || undefined,
      statusCode: statusCode === 'all' ? undefined : (statusCode as TaskFilter['statusCode']),
      priorityCode:
        priorityCode === 'all' ? undefined : (priorityCode as TaskFilter['priorityCode']),
      assigneeUserId:
        isAdmin && assigneeUserId !== 'all' ? assigneeUserId : undefined,
      companyId: selectedCompany?.companyId,
      customerId: customerId.trim() || undefined,
      orderId: orderId.trim() || undefined,
      dueDate: dueDate || undefined,
      includeArchived,
    }),
    [
      assigneeUserId,
      customerId,
      dueDate,
      includeArchived,
      isAdmin,
      orderId,
      priorityCode,
      search,
      selectedCompany?.companyId,
      statusCode,
    ]
  );

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user || user.role === 'customer') {
      return;
    }

    void loadTasks(taskFilter);
  }, [hasHydrated, isAuthenticated, taskFilter, user]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user || !selectedCompany) {
      setFilterCustomerOptions([]);
      if (customerId) {
        setCustomerId('');
      }
      return;
    }

    let isCancelled = false;

    const loadFilterCustomers = async () => {
      setIsFilterCustomersLoading(true);

      try {
        const nextCustomers = await customerService.getCustomersByCompany(
          selectedCompany.companyId,
          selectedCompany.financialYear
        );

        if (isCancelled) {
          return;
        }

        setFilterCustomerOptions(nextCustomers);

        if (customerId && !nextCustomers.some((customer) => customer.id === customerId)) {
          setCustomerId('');
        }
      } catch (error) {
        if (!isCancelled) {
          setFilterCustomerOptions([]);
          toast({
            variant: 'destructive',
            title: 'Failed to load customer filter',
            description: error instanceof Error ? error.message : 'Please try again.',
          });
        }
      } finally {
        if (!isCancelled) {
          setIsFilterCustomersLoading(false);
        }
      }
    };

    void loadFilterCustomers();

    return () => {
      isCancelled = true;
    };
  }, [customerId, hasHydrated, isAuthenticated, selectedCompany, user]);

  useEffect(() => {
    if (!isDialogOpen) {
      setCreateCustomerOptions([]);
      setIsCustomerPopoverOpen(false);
      return;
    }

    if (!formState.companyId || companyOptions.length === 0) {
      setCreateCustomerOptions([]);
      setFormState((current) =>
        current.customerId || current.customerNameSnapshot
          ? {
              ...current,
              customerId: '',
              customerNameSnapshot: '',
            }
          : current
      );
      return;
    }

    const company = companyOptions.find(
      (option) => String(option.companyId) === formState.companyId
    );

    if (!company) {
      return;
    }

    let isCancelled = false;

    const loadCustomersForCompany = async () => {
      setIsCreateCustomersLoading(true);

      try {
        const nextCustomers = await customerService.getCustomersByCompany(
          company.companyId,
          company.financialYear
        );

        if (isCancelled) {
          return;
        }

        setCreateCustomerOptions(nextCustomers);
        setFormState((current) => {
          const matchedCustomer = nextCustomers.find(
            (customer) => customer.id === current.customerId
          );

          if (!matchedCustomer) {
            return {
              ...current,
              customerId: '',
              customerNameSnapshot: '',
            };
          }

          if (current.customerNameSnapshot !== matchedCustomer.name) {
            return {
              ...current,
              customerNameSnapshot: matchedCustomer.name,
            };
          }

          return current;
        });
      } catch (error) {
        if (!isCancelled) {
          setCreateCustomerOptions([]);
          toast({
            variant: 'destructive',
            title: 'Failed to load customers',
            description: error instanceof Error ? error.message : 'Please try again.',
          });
        }
      } finally {
        if (!isCancelled) {
          setIsCreateCustomersLoading(false);
        }
      }
    };

    void loadCustomersForCompany();

    return () => {
      isCancelled = true;
    };
  }, [companyOptions, formState.companyId, isDialogOpen]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.statusCode === 'completed').length;
  const blockedTasks = tasks.filter((task) => task.statusCode === 'blocked').length;
  const openTasks = totalTasks - completedTasks;

  const openCreateDialog = React.useCallback(() => {
    resetForm();
    setIsDialogOpen(true);
  }, [selectedCompany]);

  const headerActions = useMemo(
    () => (
      <TaskHeaderActions
        isAdmin={isAdmin}
        onCreateTask={openCreateDialog}
      />
    ),
    [isAdmin, openCreateDialog]
  );

  useSetHeaderActions(headerActions);

  async function loadPageData() {
    setIsLoading(true);

    try {
      const [nextLookups, companiesResponse] = await Promise.all([
        taskService.getTaskLookups(),
        isAdmin
          ? fetch('/api/internal/companies', {
              method: 'POST',
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'application/json',
              },
            })
          : Promise.resolve(null),
      ]);

      setLookups(nextLookups);

      if (companiesResponse) {
        setIsCompaniesLoading(true);
        const companiesPayload = (await companiesResponse.json()) as {
          success?: boolean;
          error?: string;
          data?: Company[];
        };

        if (
          !companiesResponse.ok ||
          companiesPayload.success !== true ||
          !Array.isArray(companiesPayload.data)
        ) {
          throw new Error(companiesPayload.error || 'Failed to fetch companies.');
        }

        setCompanyOptions(companiesPayload.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load tasks',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsCompaniesLoading(false);
    }
  }

  async function loadTasks(filter: TaskFilter) {
    try {
      const nextTasks = await taskService.getTasks(filter);
      setTasks(nextTasks);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to refresh tasks',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormState(createTaskFormState(selectedCompany ? String(selectedCompany.companyId) : ''));
    setCreateCustomerOptions([]);
    setIsCompanyPopoverOpen(false);
    setIsCustomerPopoverOpen(false);
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Task title is required',
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await taskService.createTask({
        title: formState.title,
        description: formState.description || undefined,
        priorityCode: formState.priorityCode,
        companyId: formState.companyId ? Number(formState.companyId) : undefined,
        customerId: formState.customerId || undefined,
        customerNameSnapshot: formState.customerNameSnapshot || undefined,
        orderId: formState.orderId || undefined,
        startAt: toIsoOrUndefined(formState.startAt),
        dueAt: toIsoOrUndefined(formState.dueAt),
        assigneeUserId: formState.assigneeUserId || undefined,
      });

      if (!result.success || !result.task) {
        throw new Error(result.error || 'Failed to create task.');
      }

      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Task created',
        description: `${result.task.taskKey} is now available in the task list.`,
      });

      await loadTasks(taskFilter);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Task creation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
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
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/80 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="mr-1 min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">
                {isAdmin ? 'Task Manager' : 'My Tasks'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? 'Create, assign, and monitor operational work in a compact view.'
                  : 'Track the work currently assigned to you.'}
              </p>
            </div>
            <Badge variant="outline">{totalTasks} total</Badge>
            <Badge variant="outline">{openTasks} open</Badge>
            <Badge variant="outline">{completedTasks} completed</Badge>
            <Badge variant="outline">{blockedTasks} blocked</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Compact filter bar</span>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            <div className="relative min-w-[18rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="task-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search task, customer, order, or assignee"
                className="pl-10"
              />
            </div>

            <div className="min-w-[10rem]">
              <Select value={statusCode} onValueChange={setStatusCode}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {lookups?.statuses.map((status) => (
                    <SelectItem key={status.code} value={status.code}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[9rem]">
              <Select value={priorityCode} onValueChange={setPriorityCode}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {lookups?.priorities.map((priority) => (
                    <SelectItem key={priority.code} value={priority.code}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin ? (
              <div className="min-w-[10rem]">
                <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assignees</SelectItem>
                    {lookups?.salesmen.map((salesman) => (
                      <SelectItem key={salesman.id} value={salesman.id}>
                        {salesman.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="min-w-[12rem]">
              <Popover
                open={isFilterCustomerPopoverOpen}
                onOpenChange={setIsFilterCustomerPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={!selectedCompany || isFilterCustomersLoading}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {isFilterCustomersLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                      ) : (
                        <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">
                        {selectedFilterCustomer
                          ? selectedFilterCustomer.name
                          : selectedCompany
                            ? 'All customers'
                            : 'Select company first'}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList>
                      <CommandEmpty>
                        {selectedCompany
                          ? 'No customer found.'
                          : 'Select a company to load customers.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {selectedCompany ? (
                          <CommandItem
                            value="All customers"
                            onSelect={() => {
                              setCustomerId('');
                              setIsFilterCustomerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                customerId ? 'opacity-0' : 'opacity-100'
                              )}
                            />
                            <span>All customers</span>
                          </CommandItem>
                        ) : null}
                        {filterCustomerOptions.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.phone} ${customer.city} ${customer.state}`}
                            onSelect={() => {
                              setCustomerId(customer.id);
                              setIsFilterCustomerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedFilterCustomer?.id === customer.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {customer.state || 'No state'} • {customer.phone || 'No phone'}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="min-w-[11rem]">
              <Input
                id="task-order-filter"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="Filter by order"
              />
            </div>

            <div className="min-w-[10rem]">
              <Input
                id="task-due-date-filter"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            {isAdmin ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
                <span className="text-sm text-muted-foreground">Archived</span>
              </div>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusCode('all');
                setPriorityCode('all');
                setAssigneeUserId('all');
                setCustomerId('');
                setOrderId('');
                setDueDate('');
                setIncludeArchived(false);
              }}
            >
              Reset
            </Button>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <p className="font-medium">Task List</p>
              <p className="text-sm text-muted-foreground">{tasks.length} tasks in scope</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[60vh] justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex min-h-[60vh] items-center justify-center px-6 py-12 text-center">
              <div className="rounded-lg border border-dashed px-6 py-12">
                <p className="text-lg font-medium">No tasks found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Adjust your filters or create a new task to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-[60vh] overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">{task.taskKey}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.statusCode} />
                      </TableCell>
                      <TableCell>
                        <TaskPriorityBadge priority={task.priorityCode} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{task.activeAssignment?.assigneeName || 'Unassigned'}</p>
                          {task.activeAssignment ? (
                            <p className="text-muted-foreground">
                              {task.activeAssignment.assigneeRole}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(task.dueAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {!selectedCompany && task.companyId ? (
                            <p>
                              {companyNameById.get(task.companyId) || `Company #${task.companyId}`}
                            </p>
                          ) : null}
                          {task.customerNameSnapshot ? <p>{task.customerNameSnapshot}</p> : null}
                          {task.orderId ? <p>Order {task.orderId}</p> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/tasks/${task.id}`)}
                        >
                          <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Create a new operational task and optionally assign it to an active salesman.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleCreateTask}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  className="mt-2"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="e.g. Follow up on overdue order"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  className="mt-2"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Include context, expected outcome, and any blockers."
                />
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={formState.priorityCode}
                  onValueChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      priorityCode: value as TaskFormState['priorityCode'],
                    }))
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
                <Label>Assignee</Label>
                <Select
                  value={formState.assigneeUserId || 'unassigned'}
                  onValueChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      assigneeUserId: value === 'unassigned' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger className="mt-2">
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
              </div>

              <div>
                <Label>Company</Label>
                <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="mt-2 w-full justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isCompaniesLoading ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                        ) : (
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {selectedCreateCompany
                            ? selectedCreateCompany.companyName
                            : 'Select company'}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search company..." />
                      <CommandList>
                        <CommandEmpty>No company found.</CommandEmpty>
                        <CommandGroup>
                          {companyOptions.map((company) => (
                            <CommandItem
                              key={`${company.companyId}:${company.financialYear}`}
                              value={`${company.companyName} ${company.erpCode} ${company.financialYear}`}
                              onSelect={() => {
                                setFormState((current) => ({
                                  ...current,
                                  companyId: String(company.companyId),
                                  customerId: '',
                                  customerNameSnapshot: '',
                                }));
                                setCreateCustomerOptions([]);
                                setIsCompanyPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedCreateCompany?.companyId === company.companyId
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">{company.companyName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {company.erpCode} • FY {company.financialYear}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Customer</Label>
                <Popover
                  open={isCustomerPopoverOpen}
                  onOpenChange={setIsCustomerPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="mt-2 w-full justify-between"
                      disabled={!formState.companyId || isCreateCustomersLoading}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isCreateCustomersLoading ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                        ) : (
                          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {selectedCreateCustomer
                            ? selectedCreateCustomer.name
                            : formState.companyId
                              ? 'Select customer'
                              : 'Select company first'}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>
                          {formState.companyId
                            ? 'No customer found.'
                            : 'Select a company to load customers.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {createCustomerOptions.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.name} ${customer.phone} ${customer.city} ${customer.state}`}
                              onSelect={() => {
                                setFormState((current) => ({
                                  ...current,
                                  customerId: customer.id,
                                  customerNameSnapshot: customer.name,
                                }));
                                setIsCustomerPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedCreateCustomer?.id === customer.id
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">{customer.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.state || 'No state'} • {customer.phone || 'No phone'}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="task-order-id">Order ID</Label>
                <Input
                  id="task-order-id"
                  className="mt-2"
                  value={formState.orderId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, orderId: event.target.value }))
                  }
                  placeholder="Optional linked order"
                />
              </div>

              <div>
                <Label htmlFor="task-start-at">Start At</Label>
                <Input
                  id="task-start-at"
                  className="mt-2"
                  type="datetime-local"
                  value={formState.startAt}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, startAt: event.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="task-due-at">Due At</Label>
                <Input
                  id="task-due-at"
                  className="mt-2"
                  type="datetime-local"
                  value={formState.dueAt}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, dueAt: event.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TasksPage() {
  return (
    <AppShell contentContainerClassName="max-w-none py-4 lg:py-4">
      <TasksPageInner />
    </AppShell>
  );
}
