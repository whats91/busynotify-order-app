/*
 * File Context:
 * Purpose: Implements the Next.js page for admin / salesmen.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/badge.tsx, src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/dialog.tsx
 * Role: admin-facing UI.
 */
// =====================================================
// ADMIN SALESMEN PAGE - CRUD Management for Salesmen
// =====================================================

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { AppShell } from '@/shared/components/app-shell';
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
import { Badge } from '@/components/ui/badge';
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
import { useAuthStore, useHasHydrated } from '@/shared/lib/stores';
import { useTranslation } from '@/shared/lib/language-context';
import { salesmanService } from '@/versions/v1/services';
import type { CreateSalesmanPayload, Salesman, UpdateSalesmanPayload } from '@/shared/types';

interface SalesmanFormState {
  username: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
}

const emptyFormState: SalesmanFormState = {
  username: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  isActive: true,
};

export default function AdminSalesmenPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();
  const t = useTranslation();

  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSalesman, setEditingSalesman] = useState<Salesman | null>(null);
  const [formState, setFormState] = useState<SalesmanFormState>(emptyFormState);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated || !user) {
      window.location.href = '/staff-login';
      return;
    }

    if (user.role !== 'admin') {
      window.location.href = '/dashboard';
      return;
    }

    void loadSalesmen();
  }, [hasHydrated, isAuthenticated, user]);

  const activeSalesmen = useMemo(
    () => salesmen.filter((salesman) => salesman.isActive).length,
    [salesmen]
  );
  const inactiveSalesmen = salesmen.length - activeSalesmen;

  const loadSalesmen = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const records = await salesmanService.getSalesmen();
      setSalesmen(records);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load salesmen.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingSalesman(null);
    setFormState(emptyFormState);
    setIsDialogOpen(true);
  };

  const openEditDialog = (salesman: Salesman) => {
    setEditingSalesman(salesman);
    setFormState({
      username: salesman.username,
      name: salesman.name,
      email: salesman.email || '',
      phone: salesman.phone || '',
      password: '',
      isActive: salesman.isActive,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSalesman(null);
    setFormState(emptyFormState);
  };

  const handleChange = (field: keyof SalesmanFormState, value: string | boolean) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.username.trim() || !formState.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing required fields',
        description: 'Username and name are required.',
      });
      return;
    }

    if (!editingSalesman && formState.password.trim().length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password required',
        description: 'New salesmen must have a password of at least 6 characters.',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingSalesman) {
        const payload: UpdateSalesmanPayload = {
          username: formState.username,
          name: formState.name,
          email: formState.email,
          phone: formState.phone,
          isActive: formState.isActive,
          password: formState.password || undefined,
        };

        const result = await salesmanService.updateSalesman(editingSalesman.id, payload);

        if (!result.success || !result.salesman) {
          throw new Error(result.error || 'Failed to update salesman.');
        }

        setSalesmen((current) =>
          current.map((salesman) =>
            salesman.id === result.salesman?.id ? result.salesman : salesman
          )
        );
        toast({
          title: 'Salesman updated',
          description: `${result.salesman.name} has been updated.`,
        });
      } else {
        const payload: CreateSalesmanPayload = {
          username: formState.username,
          name: formState.name,
          email: formState.email,
          phone: formState.phone,
          password: formState.password,
          isActive: formState.isActive,
        };

        const result = await salesmanService.createSalesman(payload);

        if (!result.success || !result.salesman) {
          throw new Error(result.error || 'Failed to create salesman.');
        }

        setSalesmen((current) => [result.salesman!, ...current]);
        toast({
          title: 'Salesman created',
          description: `${result.salesman.name} can now sign in from the staff login page.`,
        });
      }

      closeDialog();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: editingSalesman ? 'Update failed' : 'Creation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (salesman: Salesman) => {
    const confirmed = window.confirm(`Delete salesman "${salesman.name}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(salesman.id);

    try {
      const result = await salesmanService.deleteSalesman(salesman.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete salesman.');
      }

      setSalesmen((current) => current.filter((record) => record.id !== salesman.id));
      toast({
        title: 'Salesman deleted',
        description: `${salesman.name} has been removed.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.manageSalesmen}</h1>
            <p className="text-muted-foreground">
              Create, update, and deactivate salesman accounts for staff access.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Salesman
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.totalSalesmen}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesmen.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.activeSalesmen}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSalesmen}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.inactiveSalesmen}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inactiveSalesmen}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Salesman Accounts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void loadSalesmen()}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : salesmen.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">No salesmen created yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Add your first salesman to enable staff logins.
                  </p>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Salesman
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesmen.map((salesman) => (
                      <TableRow key={salesman.id}>
                        <TableCell className="font-medium">{salesman.name}</TableCell>
                        <TableCell>{salesman.username}</TableCell>
                        <TableCell>{salesman.email || '-'}</TableCell>
                        <TableCell>{salesman.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={salesman.isActive ? 'default' : 'secondary'}>
                            {salesman.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(salesman)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingId === salesman.id}
                              onClick={() => void handleDelete(salesman)}
                            >
                              {deletingId === salesman.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !isSaving && (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSalesman ? 'Edit Salesman' : 'Add Salesman'}</DialogTitle>
            <DialogDescription>
              {editingSalesman
                ? 'Update account details and access status.'
                : 'Create a new salesman account for staff login.'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salesman-name">Name</Label>
                <Input
                  id="salesman-name"
                  value={formState.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesman-username">Username</Label>
                <Input
                  id="salesman-username"
                  value={formState.username}
                  onChange={(event) => handleChange('username', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salesman-email">Email</Label>
                <Input
                  id="salesman-email"
                  type="email"
                  value={formState.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesman-phone">Phone</Label>
                <Input
                  id="salesman-phone"
                  value={formState.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesman-password">
                {editingSalesman ? 'Password (leave blank to keep current)' : 'Password'}
              </Label>
              <Input
                id="salesman-password"
                type="password"
                value={formState.password}
                onChange={(event) => handleChange('password', event.target.value)}
                required={!editingSalesman}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <div>
                <p className="text-sm font-medium">Active Account</p>
                <p className="text-xs text-muted-foreground">
                  Inactive salesmen cannot sign in.
                </p>
              </div>
              <Switch
                checked={formState.isActive}
                onCheckedChange={(checked) => handleChange('isActive', checked)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingSalesman ? (
                  'Save Changes'
                ) : (
                  'Create Salesman'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
