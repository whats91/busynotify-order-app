/*
 * File Context:
 * Purpose: Provides the shared Language Switcher component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/components/ui/button.tsx, src/components/ui/dropdown-menu.tsx, src/shared/lib/language-context.tsx
 * Role: shared UI.
 */
// =====================================================
// LANGUAGE SWITCHER COMPONENT
// =====================================================

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useLanguage } from '../lib/language-context';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t.common.language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          {t.common.english}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('hi')}
          className={language === 'hi' ? 'bg-accent' : ''}
        >
          {t.common.hindi}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
