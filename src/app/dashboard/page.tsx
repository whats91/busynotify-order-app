// =====================================================
// DASHBOARD PAGE - Role-based Dashboard
// =====================================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  ClipboardList,
  Package,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useAuthStore, useCustomerStore, useHasHydrated } from '@/shared/lib/stores';
import { useTranslation } from '@/shared/lib/language-context';
import { AppShell } from '@/shared/components/app-shell';
import { formatCurrency } from '@/shared/components/format-currency';
import { orderService, salesmanService } from '@/versions/v1/services';
import type { Order, OrderSummary } from '@/shared/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const customerName = useCustomerStore((state) => state.customerName);
  const hasHydrated = useHasHydrated();
  const t = useTranslation();
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [salesmanStats, setSalesmanStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const displayName =
    user?.role === 'customer' ? customerName || user.name : user?.name || '';
  
  useEffect(() => {
    // Only run after hydration is complete
    if (!hasHydrated) return;
    
    // Small delay to ensure store is fully hydrated
    const timer = setTimeout(() => {
      if (!isAuthenticated || !user) {
        window.location.href = '/login';
      } else {
        loadDashboardData();
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [hasHydrated, isAuthenticated, user]);
  
  const loadDashboardData = async () => {
    try {
      let orders: Order[] = [];
      
      if (user?.role === 'customer') {
        orders = await orderService.getOrdersByCustomer(user.id);
      } else if (user?.role === 'salesman') {
        orders = await orderService.getOrdersByCreator(user.id);
      } else {
        orders = await orderService.getAllOrders();
      }
      
      const summaries: OrderSummary[] = orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
        itemCount: o.items.length,
      }));
      
      setRecentOrders(summaries.slice(0, 5));
      setStats({
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'delivered').length,
      });

      if (user?.role === 'admin') {
        const salesmen = await salesmanService.getSalesmen();
        setSalesmanStats({
          total: salesmen.length,
          active: salesmen.filter((salesman) => salesman.isActive).length,
          inactive: salesmen.filter((salesman) => !salesman.isActive).length,
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show loading until hydration is complete
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  // Show loading if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t.dashboard.welcomeMessage}, {displayName}!
            </h1>
            <p className="text-muted-foreground">
              {user.role === 'customer' 
                ? t.dashboard.customerTitle 
                : user.role === 'salesman' 
                  ? t.dashboard.salesmanTitle 
                  : t.dashboard.adminTitle}
            </p>
          </div>
          <Button onClick={() => router.push(user.role === 'admin' ? '/admin/salesmen' : '/order')}>
            {user.role === 'admin' ? (
              <Users className="mr-2 h-4 w-4" />
            ) : (
              <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            {user.role === 'admin' ? t.dashboard.manageSalesmen : t.dashboard.placeNewOrder}
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {user.role === 'admin' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t.dashboard.totalSalesmen}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesmanStats.total}</div>
              </CardContent>
            </Card>
          )}
          
          {user.role === 'admin' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t.dashboard.activeSalesmen}</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesmanStats.active}</div>
              </CardContent>
            </Card>
          )}
          
          {user.role === 'admin' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t.dashboard.inactiveSalesmen}</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesmanStats.inactive}</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.totalOrders}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.pendingOrders}</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t.dashboard.completedOrders}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>
        
        {user.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.dashboard.quickActions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.push('/admin/salesmen')} className="flex-1">
                  <Users className="mr-2 h-4 w-4" />
                  {t.dashboard.manageSalesmen}
                </Button>
                <Button variant="outline" onClick={() => router.push('/orders')} className="flex-1">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {t.dashboard.viewAllOrders}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for Salesman */}
        {user.role === 'salesman' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.dashboard.quickActions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.push('/order')} className="flex-1">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t.dashboard.placeNewOrder}
                </Button>
                <Button variant="outline" onClick={() => router.push('/orders')} className="flex-1">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {t.dashboard.viewAllOrders}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t.dashboard.recentOrders}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/orders')}>
              {t.dashboard.viewAllOrders}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {t.orderList.noOrders}
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.itemCount} items • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
