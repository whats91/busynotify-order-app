'use client';

/*
 * File Context:
 * Purpose: Provides the shared Ecommerce Storefront component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/components/ui/badge.tsx, src/components/ui/button.tsx, src/components/ui/card.tsx, src/components/ui/dialog.tsx
 * Role: shared UI.
 */
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  LogIn,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/shared/components/format-currency';
import {
  useAuthStore,
  useEcommerceCartStore,
  useHasHydrated,
} from '@/shared/lib/stores';
import { FooterBar } from '@/shared/components/footer-bar';
import type { EcommerceCatalogProduct, EcommerceStorefrontPayload } from '@/shared/types';

interface EcommerceStorefrontProps {
  payload: EcommerceStorefrontPayload;
}

function StorefrontSearchInput({
  initialValue,
  onSearchChange,
  className,
}: {
  initialValue: string;
  onSearchChange: (value: string) => void;
  className?: string;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const normalizedValue = value.trim();
    const normalizedInitialValue = initialValue.trim();

    if (normalizedValue === normalizedInitialValue) {
      return;
    }

    const timer = window.setTimeout(() => {
      onSearchChange(normalizedValue);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [initialValue, onSearchChange, value]);

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search products"
          className="pl-9"
        />
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: EcommerceCatalogProduct;
  onAddToCart: (product: EcommerceCatalogProduct) => void;
}) {
  const showMrp = product.mrp > 0 && product.mrp !== product.price;

  return (
    <Card className="overflow-hidden border-border/70 bg-background/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {product.groupName ? (
              <Badge variant="secondary" className="rounded-full">
                {product.groupName}
              </Badge>
            ) : null}
          </div>
          <div>
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {product.name}
            </h3>
            {product.printName && product.printName !== product.name ? (
              <p className="mt-1 text-sm text-muted-foreground">{product.printName}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">{formatCurrency(product.price)}</span>
              {showMrp ? (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(product.mrp)}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {product.unit} • {product.taxName || `${product.taxRate}% GST`}
            </p>
          </div>
          <Button onClick={() => onAddToCart(product)} disabled={product.stock <= 0}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function EcommerceStorefront({ payload }: EcommerceStorefrontProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();
  const {
    context,
    items,
    totalItems,
    subtotal,
    tax,
    total,
    setContext,
    addItem,
    clearCart,
    removeItem,
    updateQuantity,
  } = useEcommerceCartStore();

  const [cartOpen, setCartOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContext(
      payload.activeContext?.companyId ?? null,
      payload.activeContext?.financialYear ?? ''
    );
  }, [payload.activeContext?.companyId, payload.activeContext?.financialYear, setContext]);

  const navigateWithParams = (updates: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    updates(params);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.push(nextUrl, { scroll: false });
    });
  };

  const handleSearchChange = (value: string) => {
    navigateWithParams((params) => {
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }

      params.delete('page');
    });
  };

  const handleAddToCart = (product: EcommerceCatalogProduct) => {
    addItem(product, 1);
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleCheckout = () => {
    if (!hasHydrated || !isAuthenticated) {
      setLoginPromptOpen(true);
      return;
    }

    toast({
      title: 'Checkout coming soon',
      description: 'Checkout and order placement will be added in the next phase.',
    });
  };

  const renderUnavailableState = () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {payload.settings?.emptyStateTitle || 'Storefront unavailable'}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {payload.error ||
            payload.settings?.emptyStateDescription ||
            'This storefront is not configured yet. Please check back later.'}
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/login?returnTo=/">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  if (!payload.isEnabled) {
    return null;
  }

  if (!payload.activeContext || !payload.settings) {
    return renderUnavailableState();
  }

  const selectedCategory = payload.filters.selectedCategory || 'all';
  const storeTitle = payload.settings.storeTitle || payload.activeContext.companyName || 'Store';
  const actionHref = hasHydrated && isAuthenticated ? '/dashboard' : '/login?returnTo=/';
  const actionLabel = hasHydrated && isAuthenticated ? 'Dashboard' : 'Login';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(255,255,255,0.9)_22%,rgba(255,255,255,1)_100%)]">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{storeTitle}</p>
            <p className="truncate text-xs text-muted-foreground">
              {payload.settings.storeSubtitle}
            </p>
          </div>

          <div className="hidden max-w-md flex-1 md:block">
            <StorefrontSearchInput
              key={`desktop-${payload.filters.searchQuery}`}
              initialValue={payload.filters.searchQuery}
              onSearchChange={handleSearchChange}
            />
          </div>

          <Button variant="outline" onClick={() => setCartOpen(true)} className="relative">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cart
            {totalItems > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {totalItems}
              </span>
            ) : null}
          </Button>

          <Button asChild>
            <Link href={actionHref}>
              <LogIn className="mr-2 h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
        </div>
        <div className="border-t px-4 py-3 md:hidden">
          <StorefrontSearchInput
            key={`mobile-${payload.filters.searchQuery}`}
            initialValue={payload.filters.searchQuery}
            onSearchChange={handleSearchChange}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-6 rounded-[2rem] border bg-card/70 p-8 shadow-sm lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {payload.activeContext.companyName || 'Active Storefront'}
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {payload.settings.heroTitle}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                {payload.settings.heroSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() =>
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                {payload.settings.heroCtaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => setCartOpen(true)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Cart
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Card className="border-border/70 bg-background/80">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Categories
                </p>
                <p className="mt-2 text-2xl font-semibold">{payload.categories.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-background/80">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Products
                </p>
                <p className="mt-2 text-2xl font-semibold">{payload.pagination.totalItems}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-background/80">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Cart Total
                </p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(total)}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{payload.settings.categoriesTitle}</h2>
              <p className="text-sm text-muted-foreground">
                Filter the storefront by product group.
              </p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() =>
                navigateWithParams((params) => {
                  params.delete('category');
                  params.delete('page');
                })
              }
            >
              All
            </Button>
            {payload.categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() =>
                  navigateWithParams((params) => {
                    params.set('category', category);
                    params.delete('page');
                  })
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </section>

        <section id="catalog-section" className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{payload.settings.catalogTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {payload.pagination.totalItems} product
                {payload.pagination.totalItems === 1 ? '' : 's'} available
              </p>
            </div>
            {isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating catalog...
              </div>
            ) : null}
          </div>

          {payload.products.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-background/80 p-10 text-center">
              <h3 className="text-lg font-semibold">{payload.settings.emptyStateTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {payload.settings.emptyStateDescription}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {payload.products.map((product) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <FooterBar
        currentPage={payload.pagination.currentPage}
        totalPages={payload.pagination.totalPages}
        totalItems={payload.pagination.totalItems}
        startIndex={payload.pagination.startIndex}
        endIndex={payload.pagination.endIndex}
        onPageChange={(page) =>
          navigateWithParams((params) => {
            if (page <= 1) {
              params.delete('page');
            } else {
              params.set('page', String(page));
            }
          })
        }
        className="sticky bottom-0 z-20"
      />
      <FooterBar
        currentPage={payload.pagination.currentPage}
        totalPages={payload.pagination.totalPages}
        totalItems={payload.pagination.totalItems}
        startIndex={payload.pagination.startIndex}
        endIndex={payload.pagination.endIndex}
        onPageChange={(page) =>
          navigateWithParams((params) => {
            if (page <= 1) {
              params.delete('page');
            } else {
              params.set('page', String(page));
            }
          })
        }
        className="sticky bottom-0 z-20"
        isMobile
      />

      <footer className="border-t bg-background/90">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
          {payload.settings.footerNote}
        </div>
      </footer>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription>
              {context.companyId === payload.activeContext.companyId &&
              context.financialYear === payload.activeContext.financialYear
                ? 'Your cart is saved locally for this storefront.'
                : 'Your cart will refresh for the active storefront company.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Your cart is empty. Add products to continue.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.product.groupName}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-10 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="border-t">
            <div className="space-y-3 rounded-2xl border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={clearCart} disabled={items.length === 0}>
                Clear
              </Button>
              <Button onClick={handleCheckout} disabled={items.length === 0}>
                Checkout
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{payload.settings.checkoutLoginTitle}</DialogTitle>
            <DialogDescription>
              {payload.settings.checkoutLoginDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoginPromptOpen(false)}>
              Continue Browsing
            </Button>
            <Button asChild>
              <Link href="/login?returnTo=/">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
