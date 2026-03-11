// =====================================================
// APP SHELL - Main Layout with Sidebar and Header
// =====================================================

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  Package,
  Users,
} from 'lucide-react';
import { useAuthStore, useCartStore } from '../lib/stores';
import { useTranslation } from '../lib/language-context';
import { getNavigationForRole } from '../config/navigation.config';
import { UserMenu } from './user-menu';
import { CompanySelector } from './company-selector';
import { LanguageSwitcher } from './language-switcher';
import { HeaderActionProvider, useHeaderActions } from '../lib/header-action-context';
import type { Role, NavigationItem } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  Users,
};

const SIDEBAR_STORAGE_KEY = 'busy-notify-sidebar-collapsed';

interface AppShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  contentContainerClassName?: string;
}

export function AppShell({
  children,
  footer,
  contentClassName,
  contentContainerClassName,
}: AppShellProps) {
  return (
    <HeaderActionProvider>
      <AppShellContent
        footer={footer}
        contentClassName={contentClassName}
        contentContainerClassName={contentContainerClassName}
      >
        {children}
      </AppShellContent>
    </HeaderActionProvider>
  );
}

function AppShellContent({
  children,
  footer,
  contentClassName,
  contentContainerClassName,
}: AppShellProps) {
  const [open, setOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { headerActions, footerContent } = useHeaderActions();
  const t = useTranslation();
  
  const role = user?.role as Role;
  const navigation = getNavigationForRole(role);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((current) => !current);
  };
  
  const renderNavItems = (
    items: NavigationItem[],
    options?: {
      mobile?: boolean;
      collapsed?: boolean;
    }
  ) => {
    const mobile = options?.mobile ?? false;
    const collapsed = options?.collapsed ?? false;

    return items.map((item) => {
      const Icon = iconMap[item.icon || 'LayoutDashboard'];
      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
      const label = item.labelKey.split('.').reduce((obj: unknown, key: string) => {
        if (obj && typeof obj === 'object') {
          return (obj as Record<string, unknown>)[key];
        }
        return item.labelKey;
      }, t) as string;
      
      return (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => mobile && setOpen(false)}
          title={collapsed && !mobile ? label : undefined}
          aria-label={collapsed && !mobile ? label : undefined}
          className={cn(
            'flex rounded-lg text-sm font-medium transition-all duration-200 hover:bg-accent',
            collapsed && !mobile
              ? 'justify-center px-0 py-3'
              : 'items-center gap-3 px-3 py-2',
            isActive
              ? 'bg-primary text-primary-foreground hover:bg-primary'
              : 'text-muted-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed || mobile ? (
            <span className="truncate">{label}</span>
          ) : null}
        </Link>
      );
    });
  };
  
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/20">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-full flex-col">
              <div className="flex h-14 items-center border-b px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                  <Package className="h-6 w-6 text-primary" />
                  <span>{t.common.appName}</span>
                </Link>
              </div>
              <ScrollArea className="flex-1">
                <nav className="flex flex-col gap-1 p-4">
                  {renderNavItems(navigation, { mobile: true })}
                </nav>
              </ScrollArea>
              <SidebarFooter />
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6 text-primary" />
          <span>{t.common.appName}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {/* Dynamic header actions from page context */}
          {headerActions}
          <UserMenu />
        </div>
      </header>
      
      {/* Desktop Layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden h-full shrink-0 overflow-hidden border-r bg-muted/40 transition-[width] duration-300 ease-in-out lg:block',
            isSidebarCollapsed ? 'w-20' : 'w-64'
          )}
        >
          <div className="sticky top-0 flex h-full min-h-0 flex-col">
            <div className={cn(
              'flex h-14 items-center border-b',
              isSidebarCollapsed ? 'justify-center px-2' : 'px-4'
            )}>
              <Link
                href="/"
                className={cn(
                  'flex min-w-0 items-center font-semibold',
                  isSidebarCollapsed ? 'justify-center' : 'gap-2'
                )}
                title={isSidebarCollapsed ? t.common.appName : undefined}
              >
                <Package className="h-6 w-6 text-primary" />
                {!isSidebarCollapsed ? <span className="truncate">{t.common.appName}</span> : null}
              </Link>
            </div>
            <ScrollArea className="flex-1">
              <nav className={cn('flex flex-col gap-1', isSidebarCollapsed ? 'p-2' : 'p-4')}>
                {renderNavItems(navigation, { collapsed: isSidebarCollapsed })}
              </nav>
            </ScrollArea>
            <SidebarFooter collapsed={isSidebarCollapsed} />
          </div>
        </aside>
        
        {/* Main Content Area with Header */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Desktop Header Bar */}
          <header className="sticky top-0 z-40 hidden h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleSidebar}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              {/* Dynamic header actions from page context */}
              {headerActions}
            </div>
          </header>
          
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Main Content */}
            <main className={cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto", contentClassName)}>
              <div className={cn(
                "mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-4 lg:px-6 lg:py-6",
                contentContainerClassName
              )}>
                {children}
              </div>
            </main>

            {footer ?? footerContent ? (
              <div className="relative z-30 shrink-0">
                {footer ?? footerContent}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarFooter({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  return (
    <div className={cn('border-t bg-background/80', collapsed ? 'p-2' : 'p-4')}>
      <div className="flex flex-col gap-3">
        <CompanySelector
          collapsed={collapsed}
          side={collapsed ? 'right' : 'top'}
          className={collapsed ? 'mx-auto' : undefined}
        />
        <div className={cn(
          'flex items-center',
          collapsed ? 'flex-col gap-2' : 'justify-between'
        )}>
          <CartBadge />
          <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : undefined)}>
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Badge Component
function CartBadge() {
  const { user } = useAuthStore();
  const { items } = useCartStore();
  
  const showCart = user?.role === 'customer' || user?.role === 'salesman';
  const itemCount = showCart ? items.length : 0;
  
  return (
    <Link href="/order?cart=true">
      <Button variant="ghost" size="icon" className="relative">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {itemCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
