/*
 * File Context:
 * Purpose: Defines shared configuration for Navigation.Config.
 * Primary Functionality: Exports static configuration values that other modules consume directly.
 * Interlinked With: src/shared/types/index.ts
 * Role: shared configuration.
 */
// =====================================================
// NAVIGATION CONFIGURATION
// Role-based navigation items
// =====================================================

import type { NavigationItem, Role } from '../types';

export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    labelKey: 'navigation.dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'customer', 'salesman'],
  },
  {
    id: 'new-order',
    labelKey: 'navigation.newOrder',
    href: '/order',
    icon: 'ShoppingCart',
    roles: ['admin', 'customer', 'salesman'],
  },
  {
    id: 'orders',
    labelKey: 'navigation.orders',
    href: '/orders',
    icon: 'ClipboardList',
    roles: ['admin', 'customer', 'salesman'],
  },
  {
    id: 'tasks',
    labelKey: 'navigation.tasks',
    href: '/tasks',
    icon: 'ClipboardCheck',
    roles: ['admin', 'salesman'],
  },
  {
    id: 'salesmen',
    labelKey: 'navigation.salesmen',
    href: '/admin/salesmen',
    icon: 'Users',
    roles: ['admin'],
  },
  {
    id: 'theme',
    labelKey: 'navigation.theme',
    icon: 'Palette',
    roles: ['admin'],
    children: [
      {
        id: 'theme-brand-assets',
        labelKey: 'navigation.themeBrandAssets',
        href: '/admin/theme',
        icon: 'Palette',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'configuration',
    labelKey: 'navigation.configuration',
    icon: 'Settings2',
    roles: ['admin'],
    children: [
      {
        id: 'product-configuration',
        labelKey: 'navigation.productConfiguration',
        href: '/admin/product-configuration',
        icon: 'Package',
        roles: ['admin'],
      },
      {
        id: 'sales-type-settings',
        labelKey: 'navigation.salesTypeSettings',
        href: '/admin/sales-type-settings',
        icon: 'BadgePercent',
        roles: ['admin'],
      },
      {
        id: 'material-center-configuration',
        labelKey: 'navigation.materialCenterConfiguration',
        href: '/configuration/material-center',
        icon: 'Warehouse',
        roles: ['admin'],
      },
      {
        id: 'voucher-series-configuration',
        labelKey: 'navigation.voucherSeriesConfiguration',
        href: '/admin/voucher-series-configuration',
        icon: 'FileText',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'ecommerce',
    labelKey: 'navigation.ecommerce',
    icon: 'Store',
    roles: ['admin'],
    children: [
      {
        id: 'ecommerce-storefront-settings',
        labelKey: 'navigation.ecommerceStorefrontSettings',
        href: '/admin/ecommerce',
        icon: 'Settings2',
        roles: ['admin'],
      },
      {
        id: 'ecommerce-pages',
        labelKey: 'navigation.ecommercePages',
        href: '/admin/ecommerce/pages',
        icon: 'FileText',
        roles: ['admin'],
      },
    ],
  },
];

function filterNavigationItem(item: NavigationItem, role: Role): NavigationItem | null {
  const filteredChildren = item.children
    ?.map((child) => filterNavigationItem(child, role))
    .filter((child): child is NavigationItem => Boolean(child));

  if (filteredChildren && filteredChildren.length > 0) {
    return {
      ...item,
      children: filteredChildren,
    };
  }

  if (item.roles.includes(role)) {
    return {
      ...item,
      children: undefined,
    };
  }

  return null;
}

export function getNavigationForRole(role: Role): NavigationItem[] {
  return navigationItems
    .map((item) => filterNavigationItem(item, role))
    .filter((item): item is NavigationItem => Boolean(item));
}

function matchesNavigationItem(route: string, item: NavigationItem, role: Role): boolean {
  const itemMatches =
    item.href !== undefined &&
    item.roles.includes(role) &&
    (route === item.href || route.startsWith(`${item.href}/`));

  if (itemMatches) {
    return true;
  }

  if (!item.children || item.children.length === 0) {
    return false;
  }

  return item.children.some((child) => matchesNavigationItem(route, child, role));
}

export function isRouteAccessible(route: string, role: Role): boolean {
  const normalizedRoute = route.split('?')[0];

  const publicRoutes = ['/login', '/staff-login', '/'];
  if (publicRoutes.includes(normalizedRoute)) {
    return true;
  }

  if (navigationItems.some((item) => matchesNavigationItem(normalizedRoute, item, role))) {
    return true;
  }

  if (role === 'admin') {
    return true;
  }

  return false;
}
