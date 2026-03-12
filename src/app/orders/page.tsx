// =====================================================
// ORDERS LIST PAGE
// =====================================================

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, Eye, Loader2 } from 'lucide-react';
import { useAuthStore, useHasHydrated } from '@/shared/lib/stores';
import { useTranslation } from '@/shared/lib/language-context';
import { AppShell } from '@/shared/components/app-shell';
import { OrderStatusBadge } from '@/shared/components/order-status-badge';
import { formatCurrency } from '@/shared/components/format-currency';
import { orderService } from '@/versions/v1/services';
import type { Order } from '@/shared/types';

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();
  const t = useTranslation();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const salesmanCustomerOptions = useMemo(() => {
    if (user?.role !== 'salesman') {
      return [];
    }

    const seen = new Map<string, string>();

    for (const order of orders) {
      if (!seen.has(order.customerId)) {
        seen.set(order.customerId, order.customerName);
      }
    }

    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [orders, user?.role]);
  
  useEffect(() => {
    // Only run after hydration is complete
    if (!hasHydrated) return;
    
    // Small delay to ensure store is fully hydrated
    const timer = setTimeout(() => {
      if (!isAuthenticated || !user) {
        window.location.href = '/login';
      } else {
        loadOrders();
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [hasHydrated, isAuthenticated, user]);
  
  useEffect(() => {
    const nextOrders = orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesCustomer = customerFilter === 'all' || order.customerId === customerFilter;
      return matchesStatus && matchesCustomer;
    });

    setFilteredOrders(nextOrders);
  }, [customerFilter, orders, statusFilter]);

  useEffect(() => {
    if (
      customerFilter !== 'all' &&
      user?.role === 'salesman' &&
      !orders.some((order) => order.customerId === customerFilter)
    ) {
      setCustomerFilter('all');
    }
  }, [customerFilter, orders, user?.role]);
  
  const loadOrders = async () => {
    try {
      let orderData: Order[] = [];
      
      if (user?.role === 'customer') {
        orderData = await orderService.getOrdersByCustomer(user.id);
      } else if (user?.role === 'salesman') {
        orderData = await orderService.getOrdersByCreator(user.id);
      } else {
        orderData = await orderService.getAllOrders();
      }
      
      setOrders(orderData);
      setFilteredOrders(orderData);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Show loading until hydration is complete
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.orderList.title}</h1>
            <p className="text-muted-foreground">
              {filteredOrders.length} orders
            </p>
          </div>
          
          <Button onClick={() => router.push('/order')}>
            <Package className="mr-2 h-4 w-4" />
            {t.dashboard.placeNewOrder}
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {user.role === 'salesman' ? (
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {salesmanCustomerOptions.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        
        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.orderList.noOrders}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push('/order')}
              >
                {t.dashboard.placeNewOrder}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Mobile Layout */}
                  <div className="p-4 sm:hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items
                        </p>
                        <p className="font-bold">{formatCurrency(order.total)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {t.orderList.viewDetails}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center sm:p-4">
                    <div className="col-span-3">
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-muted-foreground">{t.orderList.customer}</p>
                      <p className="font-medium">{order.customerName}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">{t.cart.items}</p>
                      <p className="font-medium">{order.items.length} items</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm text-muted-foreground">{t.orderList.total}</p>
                      <p className="font-bold">{formatCurrency(order.total)}</p>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="flex h-[calc(100dvh-1.5rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-[90vh] sm:max-h-[44rem]">
            <DialogHeader className="shrink-0 border-b px-4 py-4 text-left sm:px-6">
              <DialogTitle>{selectedOrder?.orderNumber}</DialogTitle>
              <DialogDescription>
                {selectedOrder && formatDate(selectedOrder.createdAt)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                  <div className="space-y-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t.orderList.status}</span>
                      <OrderStatusBadge status={selectedOrder.status} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t.orderList.customer}</span>
                      <span className="font-medium">{selectedOrder.customerName}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">{t.order.products}</span>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.productSku} × {item.quantity}
                              </p>
                            </div>
                            <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedOrder.notes && (
                      <div className="border-t pt-4">
                        <span className="text-sm text-muted-foreground">Notes</span>
                        <p className="mt-1">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.cart.subtotal}</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.cart.tax}</span>
                    <span>{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                    <span>{t.cart.grandTotal}</span>
                    <span className="text-lg font-semibold">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
