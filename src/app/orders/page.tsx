/*
 * File Context:
 * Purpose: Implements the Next.js page for orders.
 * Primary Functionality: Composes route-level UI, data fetching, and user interactions for this page.
 * Interlinked With: src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/dialog.tsx, src/components/ui/select.tsx
 * Role: role-based user-facing UI.
 */
// =====================================================
// ORDERS LIST PAGE
// =====================================================

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Package, Eye, Loader2, Trash2 } from 'lucide-react';
import { useAuthStore, useHasHydrated } from '@/shared/lib/stores';
import { useTranslation } from '@/shared/lib/language-context';
import { AppShell } from '@/shared/components/app-shell';
import { FooterBar } from '@/shared/components/footer-bar';
import { OrderStatusBadge } from '@/shared/components/order-status-badge';
import { formatCurrency } from '@/shared/components/format-currency';
import { confirmAlert } from '@/shared/lib/sweet-alert';
import { toast } from '@/hooks/use-toast';
import { orderService } from '@/versions/v1/services';
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/shared/types';

type DateFilterOption =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear'
  | 'custom';

const ORDERS_PAGE_SIZE = 10;

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseDateInput(value: string, endOfSelectedDay = false) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return endOfSelectedDay ? endOfDay(parsed) : startOfDay(parsed);
}

function getDateFilterRange(
  filter: DateFilterOption,
  customFrom: string,
  customTo: string
): { start: Date | null; end: Date | null } {
  const now = new Date();

  switch (filter) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    }
    case 'thisWeek': {
      const start = startOfDay(now);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      return {
        start,
        end: endOfDay(now),
      };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        start: startOfDay(start),
        end: endOfDay(now),
      };
    }
    case 'custom':
      return {
        start: parseDateInput(customFrom),
        end: parseDateInput(customTo, true),
      };
    default:
      return {
        start: null,
        end: null,
      };
  }
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();
  const t = useTranslation();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';
  const showCustomerFilter = user?.role === 'admin' || user?.role === 'salesman';

  const customerOptions = useMemo(() => {
    if (!showCustomerFilter) {
      return [];
    }

    const seen = new Set<string>();

    for (const order of orders) {
      const normalizedName = order.customerName.trim();

      if (normalizedName) {
        seen.add(normalizedName);
      }
    }

    return Array.from(seen.values()).sort((left, right) => left.localeCompare(right));
  }, [orders, showCustomerFilter]);

  const selectedOrderTaxBreakdown = useMemo(() => {
    if (!selectedOrder) {
      return [];
    }

    const breakdown = new Map<number, number>();

    for (const item of selectedOrder.items) {
      const taxRate = item.taxPercentage ?? 0;
      const taxAmount =
        item.taxAmount ?? Number((item.subtotal * (taxRate / 100)).toFixed(6));
      breakdown.set(taxRate, (breakdown.get(taxRate) ?? 0) + taxAmount);
    }

    return Array.from(breakdown.entries())
      .map(([taxRate, taxAmount]) => ({
        taxRate,
        taxAmount,
      }))
      .sort((left, right) => left.taxRate - right.taxRate);
  }, [selectedOrder]);
  
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
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const normalizedCustomerQuery = customerQuery.trim().toLowerCase();
    const dateRange = getDateFilterRange(dateFilter, customDateFrom, customDateTo);

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesCustomer =
        !showCustomerFilter ||
        normalizedCustomerQuery.length === 0 ||
        order.customerName.toLowerCase().includes(normalizedCustomerQuery);

      if (!matchesStatus || !matchesCustomer) {
        return false;
      }

      if (!dateRange.start && !dateRange.end) {
        return true;
      }

      const createdAt = new Date(order.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }

      if (dateRange.start && createdAt < dateRange.start) {
        return false;
      }

      if (dateRange.end && createdAt > dateRange.end) {
        return false;
      }

      return true;
    });
  }, [
    orders,
    statusFilter,
    showCustomerFilter,
    customerQuery,
    dateFilter,
    customDateFrom,
    customDateTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE));

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PAGE_SIZE;
    return filteredOrders.slice(startIndex, startIndex + ORDERS_PAGE_SIZE);
  }, [currentPage, filteredOrders]);

  const paginationStartIndex =
    filteredOrders.length === 0 ? 0 : (currentPage - 1) * ORDERS_PAGE_SIZE + 1;
  const paginationEndIndex = Math.min(
    currentPage * ORDERS_PAGE_SIZE,
    filteredOrders.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, customerQuery, dateFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatStatusLabel = (status: OrderStatus) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  const applyUpdatedOrder = (updatedOrder: Order) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
    setSelectedOrder((currentOrder) =>
      currentOrder?.id === updatedOrder.id ? updatedOrder : currentOrder
    );
  };

  const removeDeletedOrder = (orderId: string) => {
    setOrders((currentOrders) => currentOrders.filter((order) => order.id !== orderId));
    setSelectedOrder((currentOrder) => (currentOrder?.id === orderId ? null : currentOrder));
  };

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    if (!isAdmin) {
      return;
    }

    setUpdatingOrderId(orderId);

    try {
      const result = await orderService.updateOrderStatus(orderId, status);

      if (!result.success || !result.order) {
        throw new Error(result.error || 'Failed to update order status');
      }

      applyUpdatedOrder(result.order);
      toast({
        title: 'Order status updated',
        description: `${result.order.orderNumber} is now ${formatStatusLabel(status)}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update order status',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!isAdmin) {
      return;
    }

    const confirmed = await confirmAlert({
      title: 'Delete Order',
      text: `Delete order "${order.orderNumber}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep Order',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    setDeletingOrderId(order.id);

    try {
      const result = await orderService.deleteOrder(order.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete order');
      }

      removeDeletedOrder(order.id);
      toast({
        title: 'Order deleted',
        description: `${order.orderNumber} was deleted successfully.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete order',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  const renderStatusControl = (order: Order, triggerClassName = 'w-[9rem]') => {
    if (!isAdmin) {
      return <OrderStatusBadge status={order.status} />;
    }

    const isUpdating = updatingOrderId === order.id;
    const isDeleting = deletingOrderId === order.id;

    return (
      <div className="flex items-center gap-2">
        <Select
          value={order.status}
          onValueChange={(value) => void handleStatusUpdate(order.id, value as OrderStatus)}
          disabled={isUpdating || isDeleting}
        >
          <SelectTrigger className={`${triggerClassName} h-8`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {formatStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
    );
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
              {filteredOrders.length === orders.length
                ? `${filteredOrders.length} orders`
                : `${filteredOrders.length} of ${orders.length} orders`}
            </p>
          </div>
          
          <Button onClick={() => router.push('/order')}>
            <Package className="mr-2 h-4 w-4" />
            {t.dashboard.placeNewOrder}
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dateFilter}
            onValueChange={(value) => setDateFilter(value as DateFilterOption)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {showCustomerFilter ? (
            <>
              <Input
                list="order-customer-options"
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
                placeholder="Search customer"
                className="w-full sm:w-64"
              />
              <datalist id="order-customer-options">
                {customerOptions.map((customerName) => (
                  <option key={customerName} value={customerName} />
                ))}
              </datalist>
            </>
          ) : null}

          {dateFilter === 'custom' ? (
            <>
              <Input
                type="date"
                value={customDateFrom}
                onChange={(event) => setCustomDateFrom(event.target.value)}
                className="w-full sm:w-44"
              />
              <Input
                type="date"
                value={customDateTo}
                onChange={(event) => setCustomDateTo(event.target.value)}
                className="w-full sm:w-44"
              />
            </>
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
          <>
          <div className="space-y-1">
            {paginatedOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Mobile Layout */}
                  <div className="px-3 py-0.5 sm:hidden">
                    <div className="mb-0.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      {renderStatusControl(order, 'w-[8.25rem]')}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items
                        </p>
                        <p className="font-bold">{formatCurrency(order.total)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t.orderList.viewDetails}
                        </Button>
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 text-destructive hover:text-destructive"
                            onClick={() => void handleDeleteOrder(order)}
                            disabled={deletingOrderId === order.id}
                          >
                            {deletingOrderId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-2 sm:px-4 sm:py-0.5">
                    <div className="col-span-3">
                      <p className="font-medium leading-tight">{order.orderNumber}</p>
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
                    <div className="col-span-1 text-right">
                      <p className="text-sm text-muted-foreground">{t.orderList.total}</p>
                      <p className="font-bold">{formatCurrency(order.total)}</p>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      {renderStatusControl(order)}
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      {isAdmin ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteOrder(order)}
                          disabled={deletingOrderId === order.id}
                        >
                          {deletingOrderId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}
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
          <FooterBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            startIndex={paginationStartIndex}
            endIndex={paginationEndIndex}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), totalPages))
            }
            className="rounded-xl border"
          />
          <FooterBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            startIndex={paginationStartIndex}
            endIndex={paginationEndIndex}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), totalPages))
            }
            className="rounded-xl border"
            isMobile
          />
          </>
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
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{t.orderList.status}</span>
                      {renderStatusControl(selectedOrder, 'w-[10rem]')}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t.orderList.customer}</span>
                      <span className="font-medium">{selectedOrder.customerName}</span>
                    </div>

                    {selectedOrder.materialCenterName ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Material Center</span>
                        <div className="text-right">
                          <p className="font-medium">{selectedOrder.materialCenterName}</p>
                          {selectedOrder.materialCenterId ? (
                            <p className="text-xs text-muted-foreground">
                              ID {selectedOrder.materialCenterId}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {selectedOrder.saleTypeName ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Sales Type</span>
                        <div className="text-right">
                          <p className="font-medium">{selectedOrder.saleTypeName}</p>
                          {selectedOrder.saleTypeId ? (
                            <p className="text-xs text-muted-foreground">
                              ID {selectedOrder.saleTypeId}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    
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
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.unitPrice)} each
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t.cart.tax} ({item.taxPercentage}% GST): {formatCurrency(item.taxAmount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatCurrency(item.totalPrice)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.subtotal)} + tax
                              </p>
                            </div>
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
                  {selectedOrderTaxBreakdown.map((entry) => (
                    <div key={entry.taxRate} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t.cart.tax} ({entry.taxRate}% GST)
                      </span>
                      <span>{formatCurrency(entry.taxAmount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.cart.tax}</span>
                    <span>{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                    <span>{t.cart.grandTotal}</span>
                    <span className="text-lg font-semibold">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                  {isAdmin ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDeleteOrder(selectedOrder)}
                        disabled={deletingOrderId === selectedOrder.id}
                      >
                        {deletingOrderId === selectedOrder.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Order
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
