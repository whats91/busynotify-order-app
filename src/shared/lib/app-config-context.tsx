'use client';

/*
 * File Context:
 * Purpose: Provides shared client state for App Config Context.
 * Primary Functionality: Exposes runtime app branding values from the server layout to client components.
 * Interlinked With: src/app/layout.tsx, src/shared/components/providers.tsx, src/shared/components/app-shell.tsx
 * Role: shared client state.
 */
import { createContext, useContext } from 'react';

export interface AppConfigValue {
  appName: string;
  appTitle: string;
}

const defaultAppConfig: AppConfigValue = {
  appName: 'Busy Notify',
  appTitle: 'Busy Notify - Internal Ordering Portal',
};

const AppConfigContext = createContext<AppConfigValue>(defaultAppConfig);

interface AppConfigProviderProps {
  value: AppConfigValue;
  children: React.ReactNode;
}

export function AppConfigProvider({ value, children }: AppConfigProviderProps) {
  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
