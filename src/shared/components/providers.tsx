/*
 * File Context:
 * Purpose: Provides the shared Providers component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/shared/lib/language-context.tsx
 * Role: shared UI.
 */
// =====================================================
// PROVIDERS - Client-side wrapper for all providers
// =====================================================

'use client';

import React, { ReactNode, useEffect, useLayoutEffect } from 'react';
import { AppConfigProvider } from '../lib/app-config-context';
import { LanguageProvider } from '../lib/language-context';
import { THEME_ASSETS_UPDATED_EVENT } from '../lib/theme-asset-events';
import {
  useAuthStore,
  useCartStore,
  useCompanyStore,
  useCustomerStore,
  useEcommerceCartStore,
} from '../lib/stores';

type BusyNotifyWindow = Window &
  typeof globalThis & {
    __busyNotifyPrivateApiFetchPatched?: boolean;
    __busyNotifySessionRedirecting?: boolean;
  };

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicApiPath(pathname: string): boolean {
  return (
    matchesRoutePrefix(pathname, '/api/order') ||
    matchesRoutePrefix(pathname, '/api/public') ||
    pathname === '/api/auth/request-customer-otp' ||
    pathname === '/api/auth/verify-customer-otp' ||
    pathname === '/api/auth/complete-customer-login' ||
    pathname === '/api/auth/staff-login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/webhooks/deploy'
  );
}

function isPrivateApiPath(pathname: string): boolean {
  return matchesRoutePrefix(pathname, '/api') && !isPublicApiPath(pathname);
}

function resolveRequestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === 'string') {
      return new URL(input, window.location.origin);
    }

    if (input instanceof URL) {
      return new URL(input.toString(), window.location.origin);
    }

    return new URL(input.url, window.location.origin);
  } catch {
    return null;
  }
}

function redirectToLoginForExpiredSession() {
  const appWindow = window as BusyNotifyWindow;

  if (appWindow.__busyNotifySessionRedirecting) {
    return;
  }

  appWindow.__busyNotifySessionRedirecting = true;

  const currentUser = useAuthStore.getState().user;
  const redirectPath =
    currentUser?.role === 'admin' || currentUser?.role === 'salesman'
      ? '/staff-login'
      : '/login';

  useAuthStore.getState().logout();
  useCartStore.getState().resetCart();
  useCompanyStore.getState().clearCompany();
  useCustomerStore.getState().clearCustomer();
  useEcommerceCartStore.getState().clearCart();

  window.location.replace(redirectPath);
}

function installPrivateApiSessionRedirect() {
  const appWindow = window as BusyNotifyWindow;

  if (appWindow.__busyNotifyPrivateApiFetchPatched) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    const requestUrl = resolveRequestUrl(input);

    if (
      response.status === 401 &&
      requestUrl &&
      requestUrl.origin === window.location.origin &&
      isPrivateApiPath(requestUrl.pathname)
    ) {
      redirectToLoginForExpiredSession();

      // Prevent downstream UI from rendering stale unauthorized errors
      // while the browser is navigating back to login.
      return new Promise<Response>(() => undefined);
    }

    return response;
  };

  appWindow.__busyNotifyPrivateApiFetchPatched = true;
}

interface ProvidersProps {
  children: ReactNode;
  appName: string;
  appTitle: string;
}

export function Providers({ children, appName, appTitle }: ProvidersProps) {
  useLayoutEffect(() => {
    installPrivateApiSessionRedirect();
  }, []);

  useEffect(() => {
    const updateThemeIcons = () => {
      const href = `/theme/icon?v=${Date.now()}`;
      const relValues = ['icon', 'shortcut icon', 'apple-touch-icon'];

      relValues.forEach((rel) => {
        let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          document.head.appendChild(link);
        }

        link.href = href;
      });
    };

    updateThemeIcons();
    window.addEventListener(THEME_ASSETS_UPDATED_EVENT, updateThemeIcons);

    return () => {
      window.removeEventListener(THEME_ASSETS_UPDATED_EVENT, updateThemeIcons);
    };
  }, []);

  return (
    <AppConfigProvider value={{ appName, appTitle }}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </AppConfigProvider>
  );
}
