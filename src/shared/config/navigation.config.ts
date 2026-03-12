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
    id: 'salesmen',
    labelKey: 'navigation.salesmen',
    href: '/admin/salesmen',
    icon: 'Users',
    roles: ['admin'],
  },
  {
    id: 'product-configuration',
    labelKey: 'navigation.productConfiguration',
    href: '/admin/product-configuration',
    icon: 'SlidersHorizontal',
    roles: ['admin'],
  },
];

// Get navigation items for a specific role
export function getNavigationForRole(role: Role): NavigationItem[] {
  return navigationItems.filter(item => item.roles.includes(role));
}

// Check if a route is accessible by a role
export function isRouteAccessible(route: string, role: Role): boolean {
  const normalizedRoute = route.split('?')[0]; // Remove query params
  
  // Public routes
  const publicRoutes = ['/login', '/staff-login', '/'];
  if (publicRoutes.includes(normalizedRoute)) {
    return true;
  }
  
  // Check against navigation items
  for (const item of navigationItems) {
    if (normalizedRoute.startsWith(item.href) && item.roles.includes(role)) {
      return true;
    }
  }
  
  // Admin has access to everything
  if (role === 'admin') {
    return true;
  }
  
  return false;
}
