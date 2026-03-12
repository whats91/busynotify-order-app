/*
 * File Context:
 * Purpose: Defines the project file for Header Action Context.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: No direct internal imports; primarily used by framework or toolchain entry points.
 * Role: shared project asset.
 */
// =====================================================
// HEADER ACTION CONTEXT - Dynamic Header Actions per Page
// =====================================================

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface HeaderActionContextType {
  // The actions to render in the header
  headerActions: React.ReactNode;
  // Footer content rendered by the shell
  footerContent: React.ReactNode;
  // Set header actions from a page
  setHeaderActions: (actions: React.ReactNode) => void;
  // Set footer content from a page
  setFooterContent: (content: React.ReactNode) => void;
  // Clear header actions when leaving page
  clearHeaderActions: () => void;
  // Clear footer content when leaving page
  clearFooterContent: () => void;
}

const HeaderActionContext = createContext<HeaderActionContextType | undefined>(undefined);

export function HeaderActionProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActionsState] = useState<React.ReactNode>(null);
  const [footerContent, setFooterContentState] = useState<React.ReactNode>(null);

  const setHeaderActions = useCallback((actions: React.ReactNode) => {
    setHeaderActionsState(actions);
  }, []);

  const setFooterContent = useCallback((content: React.ReactNode) => {
    setFooterContentState(content);
  }, []);

  const clearHeaderActions = useCallback(() => {
    setHeaderActionsState(null);
  }, []);

  const clearFooterContent = useCallback(() => {
    setFooterContentState(null);
  }, []);

  return (
    <HeaderActionContext.Provider
      value={{
        headerActions,
        footerContent,
        setHeaderActions,
        setFooterContent,
        clearHeaderActions,
        clearFooterContent,
      }}
    >
      {children}
    </HeaderActionContext.Provider>
  );
}

export function useHeaderActions() {
  const context = useContext(HeaderActionContext);
  if (context === undefined) {
    throw new Error('useHeaderActions must be used within a HeaderActionProvider');
  }
  return context;
}

// Hook to set header actions on mount and clear on unmount
export function useSetHeaderActions(actions: React.ReactNode) {
  const { setHeaderActions, clearHeaderActions } = useHeaderActions();

  React.useEffect(() => {
    setHeaderActions(actions);
    return () => {
      clearHeaderActions();
    };
  }, [actions, setHeaderActions, clearHeaderActions]);
}

export function useSetFooterContent(content: React.ReactNode) {
  const { setFooterContent, clearFooterContent } = useHeaderActions();

  React.useEffect(() => {
    setFooterContent(content);
    return () => {
      clearFooterContent();
    };
  }, [content, setFooterContent, clearFooterContent]);
}
