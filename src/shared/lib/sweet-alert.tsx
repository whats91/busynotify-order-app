/*
 * File Context:
 * Purpose: Provides a global SweetAlert-style alert controller and provider for client-side dialogs.
 * Primary Functionality: Centralizes confirmation and modal alert behavior behind one reusable API and UI surface.
 * Interlinked With: src/components/ui/alert-dialog.tsx, src/lib/utils.ts, src/shared/components/providers.tsx
 * Role: shared UI infrastructure.
 */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  XCircle,
} from 'lucide-react';

export type SweetAlertVariant = 'success' | 'error' | 'warning' | 'info' | 'question';

interface SweetAlertRequest {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  variant?: SweetAlertVariant;
  destructive?: boolean;
}

interface SweetAlertState extends SweetAlertRequest {
  resolve: (confirmed: boolean) => void;
}

type SweetAlertHandler = (request: SweetAlertRequest) => Promise<boolean>;

let activeSweetAlertHandler: SweetAlertHandler | null = null;

const variantStyles: Record<
  SweetAlertVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconClassName: string;
    confirmClassName?: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClassName: 'text-emerald-600',
    confirmClassName: 'bg-emerald-600 hover:bg-emerald-700',
  },
  error: {
    icon: XCircle,
    iconClassName: 'text-destructive',
    confirmClassName: 'bg-destructive hover:bg-destructive/90',
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: 'text-amber-500',
    confirmClassName: 'bg-amber-500 text-black hover:bg-amber-600',
  },
  info: {
    icon: Info,
    iconClassName: 'text-sky-600',
    confirmClassName: 'bg-sky-600 hover:bg-sky-700',
  },
  question: {
    icon: HelpCircle,
    iconClassName: 'text-primary',
  },
};

function buildFallbackMessage(request: SweetAlertRequest): string {
  return request.text ? `${request.title}\n\n${request.text}` : request.title;
}

function runNativeFallback(request: SweetAlertRequest): boolean {
  const message = buildFallbackMessage(request);

  if (request.showCancel) {
    return window.confirm(message);
  }

  window.alert(message);
  return true;
}

export function showSweetAlert(request: SweetAlertRequest): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (!activeSweetAlertHandler) {
    return Promise.resolve(runNativeFallback(request));
  }

  return activeSweetAlertHandler(request);
}

export function confirmAlert(
  request: Omit<SweetAlertRequest, 'showCancel' | 'variant'>
): Promise<boolean> {
  return showSweetAlert({
    ...request,
    variant: request.destructive ? 'warning' : 'question',
    showCancel: true,
    confirmText: request.confirmText || 'Confirm',
    cancelText: request.cancelText || 'Cancel',
  });
}

export async function successAlert(
  request: Omit<SweetAlertRequest, 'showCancel' | 'variant'>
): Promise<void> {
  await showSweetAlert({
    ...request,
    variant: 'success',
    confirmText: request.confirmText || 'OK',
  });
}

export async function errorAlert(
  request: Omit<SweetAlertRequest, 'showCancel' | 'variant'>
): Promise<void> {
  await showSweetAlert({
    ...request,
    variant: 'error',
    confirmText: request.confirmText || 'OK',
    destructive: true,
  });
}

export async function warningAlert(
  request: Omit<SweetAlertRequest, 'showCancel' | 'variant'>
): Promise<void> {
  await showSweetAlert({
    ...request,
    variant: 'warning',
    confirmText: request.confirmText || 'OK',
  });
}

export async function infoAlert(
  request: Omit<SweetAlertRequest, 'showCancel' | 'variant'>
): Promise<void> {
  await showSweetAlert({
    ...request,
    variant: 'info',
    confirmText: request.confirmText || 'OK',
  });
}

export function SweetAlertProvider() {
  const [alertState, setAlertState] = useState<SweetAlertState | null>(null);
  const activeAlertRef = useRef<SweetAlertState | null>(null);

  useEffect(() => {
    activeSweetAlertHandler = (request) =>
      new Promise<boolean>((resolve) => {
        setAlertState({
          confirmText: 'OK',
          cancelText: 'Cancel',
          variant: 'info',
          ...request,
          resolve,
        });
      });

    return () => {
      if (activeSweetAlertHandler) {
        activeSweetAlertHandler = null;
      }
    };
  }, []);

  useEffect(() => {
    activeAlertRef.current = alertState;
  }, [alertState]);

  const handleResolve = (confirmed: boolean) => {
    const currentAlert = activeAlertRef.current;

    if (!currentAlert) {
      return;
    }

    activeAlertRef.current = null;
    currentAlert.resolve(confirmed);
    setAlertState(null);
  };

  const variant = alertState?.variant || 'info';
  const variantConfig = variantStyles[variant];
  const Icon = variantConfig.icon;

  return (
    <AlertDialog
      open={!!alertState}
      onOpenChange={(open) => {
        if (!open) {
          handleResolve(false);
        }
      }}
    >
      <AlertDialogContent className="max-w-md">
        {alertState ? (
          <>
            <AlertDialogHeader className="items-center text-center">
              <div
                className={cn(
                  'mb-2 flex h-14 w-14 items-center justify-center rounded-full border bg-muted/30',
                  variantConfig.iconClassName
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="text-xl">{alertState.title}</AlertDialogTitle>
              {alertState.text ? (
                <AlertDialogDescription className="max-w-sm text-sm leading-6">
                  {alertState.text}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter
              className={cn(
                'flex-col-reverse gap-2 sm:flex-row sm:justify-center',
                !alertState.showCancel && 'sm:flex-row'
              )}
            >
              {alertState.showCancel ? (
                <AlertDialogCancel
                  onClick={(event) => {
                    event.preventDefault();
                    handleResolve(false);
                  }}
                >
                  {alertState.cancelText}
                </AlertDialogCancel>
              ) : null}
              <AlertDialogAction
                className={cn(
                  alertState.destructive && 'bg-destructive hover:bg-destructive/90',
                  !alertState.destructive && variantConfig.confirmClassName
                )}
                onClick={(event) => {
                  event.preventDefault();
                  handleResolve(true);
                }}
              >
                {alertState.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
