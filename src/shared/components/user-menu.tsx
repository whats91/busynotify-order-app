/*
 * File Context:
 * Purpose: Provides the shared User Menu component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/components/ui/avatar.tsx, src/components/ui/button.tsx, src/components/ui/dropdown-menu.tsx, src/shared/lib/language-context.tsx
 * Role: shared UI.
 */
// =====================================================
// USER MENU COMPONENT
// =====================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuthStore, useCartStore, useCompanyStore, useCustomerStore } from '../lib/stores';
import { useTranslation } from '../lib/language-context';

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const resetCart = useCartStore((state) => state.resetCart);
  const { clearCompany } = useCompanyStore();
  const clearCustomer = useCustomerStore((state) => state.clearCustomer);
  const t = useTranslation();
  
  const handleLogout = async () => {
    const loginPath = user?.role === 'customer' ? '/login' : '/staff-login';
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    logout();
    resetCart();
    clearCompany();
    clearCustomer();
    router.push(loginPath);
  };
  
  if (!user) return null;
  
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {user.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>{t.common.profile}</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t.common.settings}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t.common.logout}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
