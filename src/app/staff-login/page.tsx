/*
 * File Context:
 * Purpose: Implements the Next.js page for staff login.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/alert.tsx, src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/input.tsx
 * Role: public authentication UI.
 */
// =====================================================
// STAFF LOGIN PAGE
// =====================================================

'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useAuthStore,
  useCompanyStore,
  useCustomerStore,
  useHasHydrated,
} from '@/shared/lib/stores';
import { useTranslation } from '@/shared/lib/language-context';
import { authService } from '@/versions/v1/services';

export default function StaffLoginPage() {
  const { isAuthenticated, setSession, setLoading, setError, error, isLoading } =
    useAuthStore();
  const clearCompany = useCompanyStore((state) => state.clearCompany);
  const clearCustomer = useCustomerStore((state) => state.clearCustomer);
  const hasHydrated = useHasHydrated();
  const t = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [hasHydrated, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login({ username, password });

      if (result.success && result.session) {
        clearCustomer();
        clearCompany();
        setSession(result.session);
        window.location.href = '/dashboard';
      } else {
        setError(result.error || t.auth.invalidCredentials);
        setLoading(false);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t.auth.loginTitle}</CardTitle>
            <CardDescription>Sign in with staff credentials.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                t.auth.loginButton
              )}
            </Button>

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p className="mb-1 font-medium">Staff Demo Credentials:</p>
              <ul className="space-y-0.5 text-xs">
                <li>
                  <code className="rounded bg-background px-1">admin / admin</code> -
                  Admin access
                </li>
                <li>
                  Salesman accounts are created by the admin from the dashboard and stored in SQLite.
                </li>
              </ul>
            </div>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Customer?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Use customer login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
