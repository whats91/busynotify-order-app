// =====================================================
// ORDER PAGE - Product Listing with Pagination and Cart
// =====================================================

'use client';

import React, { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  ChevronsUpDown,
  Package,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { 
  useAuthStore, 
  useCartStore, 
  useHasHydrated,
  useCompanyStore,
  useProductStore,
  usePaginationStore,
  fetchProducts,
} from '@/shared/lib/stores';
import { useTranslation } from '@/shared/lib/language-context';
import { AppShell } from '@/shared/components/app-shell';
import { formatCurrency } from '@/shared/components/format-currency';
import { useSetFooterContent, useSetHeaderActions } from '@/shared/lib/header-action-context';
import { FooterBar, MobileCartFooter } from '@/shared/components/footer-bar';
import { defaultProductFieldConfig } from '@/shared/config';
import {
  customerService,
  orderService,
  productConfigService,
  materialCenterConfigService,
  salesTypeConfigService,
} from '@/versions/v1/services';
import type {
  Customer,
  MaterialCenterConfig,
  ProductDisplay,
  ProductFieldConfig,
  ProductFieldKey,
  SalesTypeConfig,
} from '@/shared/types';

const headingFieldKeys: ProductFieldKey[] = ['name', 'printName', 'productAlias'];
const metaFieldKeys: ProductFieldKey[] = [
  'productId',
  'unit',
  'hsnCode',
  'groupName',
  'groupId',
  'taxName',
  'taxRate',
  'taxId',
  'mcName',
  'mcCode',
];
const priceFieldKeys: ProductFieldKey[] = [
  'price',
  'salesPrice',
  'mrp',
  'apiPrice',
  'purchasePrice',
];
const detailFieldKeys: ProductFieldKey[] = [
  'stock',
  'salesDiscount',
  'salesMarkup',
  'purchaseDiscount',
  'descriptionLine1',
  'descriptionLine2',
  'descriptionLine3',
  'descriptionLine4',
  'createdBy',
  'creationTime',
  'modifiedBy',
  'modificationTime',
];

function hasDisplayValue(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

function formatNumericValue(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return String(value);
}

function formatCurrencyValue(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return formatCurrency(value);
}

function normalizeStateName(value: string | undefined | null): string {
  return value?.trim().toLowerCase() || '';
}

function getProductFieldDisplayValue(
  product: ProductDisplay,
  fieldKey: ProductFieldKey
): string | null {
  const raw = product._fullData;

  switch (fieldKey) {
    case 'name':
      return product.name;
    case 'productId':
      return String(product.productId);
    case 'productAlias':
      return raw?.product_alias?.trim() || null;
    case 'printName':
      return raw?.product_print_name?.trim() || null;
    case 'unit':
      return product.unit || null;
    case 'price':
      return formatCurrencyValue(product.price);
    case 'salesPrice':
      return formatCurrencyValue(product.salesPrice);
    case 'purchasePrice':
      return formatCurrencyValue(raw?.product_purchase_price);
    case 'mrp':
      return formatCurrencyValue(product.mrp);
    case 'stock':
      return formatNumericValue(product.stock);
    case 'groupName':
      return product.groupName || null;
    case 'groupId':
      return formatNumericValue(raw?.product_group_id);
    case 'mcName':
      return raw?.product_mc_name?.trim() || null;
    case 'mcCode':
      return formatNumericValue(raw?.product_mc_code);
    case 'taxName':
      return product.taxName || null;
    case 'taxId':
      return formatNumericValue(raw?.product_tax_id);
    case 'hsnCode':
      return product.hsnCode || null;
    case 'taxRate':
      return `${product.taxRate}%`;
    case 'apiPrice':
      return formatCurrencyValue(raw?.product_price);
    case 'salesDiscount':
      return formatNumericValue(raw?.product_sales_discount);
    case 'salesMarkup':
      return formatNumericValue(raw?.product_sales_markup);
    case 'purchaseDiscount':
      return formatNumericValue(raw?.product_purchase_discount);
    case 'descriptionLine1':
      return raw?.product_description_line1?.trim() || null;
    case 'descriptionLine2':
      return raw?.product_description_line2?.trim() || null;
    case 'descriptionLine3':
      return raw?.product_description_line3?.trim() || null;
    case 'descriptionLine4':
      return raw?.product_description_line4?.trim() || null;
    case 'createdBy':
      return raw?.product_created_by?.trim() || null;
    case 'creationTime':
      return raw?.product_creation_time?.trim() || null;
    case 'modifiedBy':
      return raw?.product_modified_by?.trim() || null;
    case 'modificationTime':
      return raw?.product_modification_time?.trim() || null;
    default:
      return null;
  }
}

// Header Actions Component - Renders in AppShell header
function OrderHeaderActions({ 
  totalItems, 
  onOpenCart, 
  onClearCart 
}: { 
  totalItems: number; 
  onOpenCart: () => void;
  onClearCart: () => void;
}) {
  const t = useTranslation();
  
  return (
    <div className="flex items-center gap-2">
      {totalItems > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-destructive hover:text-destructive hidden sm:flex"
          onClick={onClearCart}
        >
          Clear
        </Button>
      )}
      <Button onClick={onOpenCart} className="relative" size="sm">
        <ShoppingCart className="mr-2 h-4 w-4" />
        {t.common.cart}
        {totalItems > 0 && (
          <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
            {totalItems}
          </Badge>
        )}
      </Button>
    </div>
  );
}

// Inner content component that sets header actions (must be inside AppShell)
function OrderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showCart = searchParams.get('cart') === 'true';
  
  const { user, isAuthenticated } = useAuthStore();
  const hasHydrated = useHasHydrated();
  const { selectedCompany } = useCompanyStore();
  const { 
    products, 
    isLoading: productsLoading, 
    error: productsError,
    setProducts,
    setLoading: setProductsLoading,
    setError: setProductsError,
    lastCompanyId,
    lastFinancialYear,
  } = useProductStore();
  const {
    items,
    customerId,
    customerName,
    totalItems,
    subtotal,
    tax,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setCustomer,
    clearCustomer,
  } = useCartStore();
  const { pageSize } = usePaginationStore();
  const t = useTranslation();
  
  // Local state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCartDialog, setShowCartDialog] = useState(showCart);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [currentPage, setLocalCurrentPage] = useState(1);
  const [productFieldConfig, setProductFieldConfig] = useState<ProductFieldConfig[]>(
    defaultProductFieldConfig
  );
  const [salesTypeConfig, setSalesTypeConfig] = useState<SalesTypeConfig | null>(null);
  const [salesTypeConfigLoading, setSalesTypeConfigLoading] = useState(false);
  const [salesTypeConfigError, setSalesTypeConfigError] = useState<string | null>(null);
  const [materialCenterConfig, setMaterialCenterConfig] = useState<MaterialCenterConfig | null>(
    null
  );
  const [materialCenterConfigLoading, setMaterialCenterConfigLoading] = useState(false);
  const [materialCenterConfigError, setMaterialCenterConfigError] = useState<string | null>(null);
  const [currentCustomerRecord, setCurrentCustomerRecord] = useState<Customer | null>(null);
  const [currentCustomerLoading, setCurrentCustomerLoading] = useState(false);
  const [currentCustomerError, setCurrentCustomerError] = useState<string | null>(null);
  const isSalesman = user?.role === 'salesman';

  // Determine if we need to load products - simple check using store state
  const needsToLoadProducts = useMemo(() => {
    if (!selectedCompany) return false;
    // Need to load if the company changed
    return lastCompanyId !== selectedCompany.companyId || 
           lastFinancialYear !== selectedCompany.financialYear;
  }, [selectedCompany, lastCompanyId, lastFinancialYear]);

  // Show loading if: we're currently loading OR we need to load and haven't errored
  const isLoadingProducts = productsLoading || (needsToLoadProducts && !productsError);

  // Calculate total pages and paginated products
  const filteredProducts = useMemo(() => {
    if (!selectedCompany) {
      return [];
    }

    return products.filter(p => {
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hsnCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productId.toString().includes(searchQuery);
      return matchesSearch;
    });
  }, [products, searchQuery, selectedCompany]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  }, [filteredProducts.length, pageSize]);

  const productFieldVisibility = useMemo(() => {
    const visibilityMap = new Map<ProductFieldKey, boolean>(
      defaultProductFieldConfig.map((field) => [field.fieldKey, field.isVisible])
    );

    for (const field of productFieldConfig) {
      visibilityMap.set(field.fieldKey, field.isVisible);
    }

    return visibilityMap;
  }, [productFieldConfig]);

  const productFieldLabels = useMemo(() => {
    const labelMap = new Map<ProductFieldKey, string>(
      defaultProductFieldConfig.map((field) => [field.fieldKey, field.label])
    );

    for (const field of productFieldConfig) {
      labelMap.set(field.fieldKey, field.label);
    }

    return labelMap;
  }, [productFieldConfig]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Calculate display indices
  const startIndex = filteredProducts.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, filteredProducts.length);

  // Reset page when filters change
  useEffect(() => {
    setLocalCurrentPage(1);
  }, [searchQuery]);

  // Header actions
  const headerActions = useMemo(() => (
    <OrderHeaderActions
      totalItems={totalItems}
      onOpenCart={() => setShowCartDialog(true)}
      onClearCart={clearCart}
    />
  ), [totalItems, clearCart]);

  useSetHeaderActions(headerActions);

  const handlePageChange = useCallback((page: number) => {
    setLocalCurrentPage(page);
  }, []);

  const hasPaginationFooter = filteredProducts.length > 0 && !isLoadingProducts;

  const pageFooter = useMemo(() => {
    if (!hasPaginationFooter && totalItems === 0) {
      return null;
    }

    return (
      <>
        {hasPaginationFooter ? (
          <FooterBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={handlePageChange}
            isMobile={false}
          />
        ) : null}

        {totalItems > 0 ? (
          <MobileCartFooter
            totalItems={totalItems}
            total={total}
            onClearCart={clearCart}
            onViewCart={() => setShowCartDialog(true)}
            formatCurrency={formatCurrency}
          />
        ) : hasPaginationFooter ? (
          <FooterBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={handlePageChange}
            isMobile={true}
          />
        ) : null}
      </>
    );
  }, [
    clearCart,
    currentPage,
    endIndex,
    filteredProducts.length,
    handlePageChange,
    hasPaginationFooter,
    startIndex,
    total,
    totalItems,
    totalPages,
  ]);

  useSetFooterContent(pageFooter);

  // Load products when company changes
  const loadProducts = useCallback(async () => {
    if (!selectedCompany) return;
    
    const companyId = selectedCompany.companyId;
    const financialYear = selectedCompany.financialYear;
    
    // Skip if already loaded for this exact company
    if (lastCompanyId === companyId && lastFinancialYear === financialYear && products.length > 0) {
      return;
    }
    
    setProductsLoading(true);
    setProductsError(null);
    
    try {
      const result = await fetchProducts(companyId, financialYear);
      
      if (result.success && result.data && result.rawData && result.apiResponse) {
        setProducts(result.data, result.rawData, result.apiResponse, selectedCompany);
      } else {
        setProductsError(result.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProductsError('Failed to load products');
    }
    // Note: setProducts and setProductsError already set isLoading to false
  }, [selectedCompany, lastCompanyId, lastFinancialYear, products.length, setProducts, setProductsLoading, setProductsError]);

  // Auth check
  useEffect(() => {
    if (!hasHydrated) return;
    
    const timer = setTimeout(() => {
      if (!isAuthenticated || !user) {
        window.location.href = '/login';
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [hasHydrated, isAuthenticated, user]);
  
  useEffect(() => {
    if (showCart) {
      setShowCartDialog(true);
    }
  }, [showCart]);

  // Load products when company changes
  useEffect(() => {
    if (selectedCompany && isAuthenticated) {
      loadProducts();
    }
  }, [selectedCompany, isAuthenticated, loadProducts]);

  const loadCustomers = useCallback(async () => {
    if (!selectedCompany || !isSalesman) {
      setCustomers([]);
      setCustomersError(null);
      setCustomersLoading(false);
      return;
    }

    setCustomersLoading(true);
    setCustomersError(null);
    setCustomerSearch('');

    try {
      const customersData = await customerService.getCustomersByCompany(
        selectedCompany.companyId,
        selectedCompany.financialYear
      );

      setCustomers(customersData);

      if (customerId && !customersData.some((customer) => customer.id === customerId)) {
        clearCustomer();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load customers.';
      console.error('Failed to load customers:', error);
      setCustomers([]);
      setCustomersError(message);
    } finally {
      setCustomersLoading(false);
    }
  }, [clearCustomer, customerId, isSalesman, selectedCompany]);

  // Load customers for salesman
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (isSalesman && selectedCompany) {
      void loadCustomers();
      return;
    }

    setCustomers([]);
    setCustomersError(null);
    setCustomersLoading(false);
  }, [isAuthenticated, isSalesman, loadCustomers, selectedCompany, user]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      return;
    }

    const loadProductFieldConfig = async () => {
      try {
        const config = await productConfigService.getProductFieldConfig();
        setProductFieldConfig(config);
      } catch (error) {
        console.error('Failed to load product field configuration:', error);
        setProductFieldConfig(defaultProductFieldConfig);
      }
    };

    void loadProductFieldConfig();
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !selectedCompany) {
      setSalesTypeConfig(null);
      setSalesTypeConfigError(null);
      setSalesTypeConfigLoading(false);
      return;
    }

    let isActive = true;

    const loadSalesTypeConfig = async () => {
      setSalesTypeConfigLoading(true);
      setSalesTypeConfigError(null);

      try {
        const config = await salesTypeConfigService.getSalesTypeConfig(
          selectedCompany.companyId,
          selectedCompany.financialYear
        );

        if (isActive) {
          setSalesTypeConfig(config);
        }
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to load sales type configuration.';
          setSalesTypeConfig(null);
          setSalesTypeConfigError(message);
        }
      } finally {
        if (isActive) {
          setSalesTypeConfigLoading(false);
        }
      }
    };

    void loadSalesTypeConfig();

    return () => {
      isActive = false;
    };
  }, [hasHydrated, isAuthenticated, selectedCompany]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !selectedCompany) {
      setMaterialCenterConfig(null);
      setMaterialCenterConfigError(null);
      setMaterialCenterConfigLoading(false);
      return;
    }

    let isActive = true;

    const loadMaterialCenterConfig = async () => {
      setMaterialCenterConfigLoading(true);
      setMaterialCenterConfigError(null);

      try {
        const config = await materialCenterConfigService.getMaterialCenterConfig(
          selectedCompany.companyId,
          selectedCompany.financialYear
        );

        if (isActive) {
          setMaterialCenterConfig(config);
        }
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to load material center configuration.';
          setMaterialCenterConfig(null);
          setMaterialCenterConfigError(message);
        }
      } finally {
        if (isActive) {
          setMaterialCenterConfigLoading(false);
        }
      }
    };

    void loadMaterialCenterConfig();

    return () => {
      isActive = false;
    };
  }, [hasHydrated, isAuthenticated, selectedCompany]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !selectedCompany || user?.role !== 'customer') {
      setCurrentCustomerRecord(null);
      setCurrentCustomerError(null);
      setCurrentCustomerLoading(false);
      return;
    }

    let isActive = true;

    const loadCurrentCustomer = async () => {
      setCurrentCustomerLoading(true);
      setCurrentCustomerError(null);

      try {
        const customerRecords = await customerService.getCustomersByCompany(
          selectedCompany.companyId,
          selectedCompany.financialYear
        );
        const matchedCustomer =
          customerRecords.find((customer) => customer.id === user.id) ?? null;

        if (!matchedCustomer) {
          throw new Error('Unable to resolve the logged-in customer for the selected company.');
        }

        if (isActive) {
          setCurrentCustomerRecord(matchedCustomer);
        }
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error ? error.message : 'Failed to load customer state.';
          setCurrentCustomerRecord(null);
          setCurrentCustomerError(message);
        }
      } finally {
        if (isActive) {
          setCurrentCustomerLoading(false);
        }
      }
    };

    void loadCurrentCustomer();

    return () => {
      isActive = false;
    };
  }, [hasHydrated, isAuthenticated, selectedCompany, user]);

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const query = customerSearch.toLowerCase();
        return (
          customer.name.toLowerCase().includes(query) ||
          customer.phone.includes(customerSearch) ||
          customer.whatsappNumber?.includes(customerSearch) ||
          customer.groupName?.toLowerCase().includes(query)
        );
      }),
    [customerSearch, customers]
  );
  const selectedCustomerRecord = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customerId, customers]
  );
  const activeCustomerRecord = isSalesman ? selectedCustomerRecord : currentCustomerRecord;
  const activeCustomerState = activeCustomerRecord?.state?.trim() || '';
  const activeMaterialCenterId = materialCenterConfig?.materialCenterId?.trim() || '';
  const activeMaterialCenterName = materialCenterConfig?.materialCenterName?.trim() || '';

  const canBrowseProducts = Boolean(selectedCompany) && (!isSalesman || Boolean(customerId));

  const convertToCartProduct = (product: ProductDisplay) => ({
    id: product.id,
    sku: product.hsnCode,
    name: product.name,
    description: '',
    price: product.price,
    currency: 'INR',
    unit: product.unit,
    category: product.groupName,
    stock: product.stock,
    isActive: true,
  });

  const handleAddToCart = (product: ProductDisplay) => {
    const cartProduct = convertToCartProduct(product);
    addItem(cartProduct, 1, product.taxRate);
  };
  
  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    if (!selectedCompany) {
      toast({
        variant: 'destructive',
        title: 'Unable to place order',
        description: 'Select a company before placing an order.',
      });
      return;
    }
    
    if (user?.role === 'salesman' && !customerId) {
      setShowCustomerSelect(true);
      toast({
        variant: 'destructive',
        title: 'Customer required',
        description: 'Select a customer before placing the order.',
      });
      return;
    }

    if (salesTypeConfigLoading || materialCenterConfigLoading || currentCustomerLoading) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Order configuration details are still loading.',
      });
      return;
    }

    if (salesTypeConfigError) {
      toast({
        variant: 'destructive',
        title: 'Missing sales type configuration',
        description: salesTypeConfigError,
      });
      return;
    }

    if (!salesTypeConfig) {
      toast({
        variant: 'destructive',
        title: 'Missing sales type configuration',
        description: 'Configure same-state and interstate sales types for this company first.',
      });
      return;
    }

    if (materialCenterConfigError) {
      toast({
        variant: 'destructive',
        title: 'Missing material center configuration',
        description: materialCenterConfigError,
      });
      return;
    }

    if (!materialCenterConfig) {
      toast({
        variant: 'destructive',
        title: 'Missing material center configuration',
        description: 'Configure a default material center for this company before placing orders.',
      });
      return;
    }

    if (!activeMaterialCenterId || !activeMaterialCenterName) {
      toast({
        variant: 'destructive',
        title: 'Material center required',
        description: 'Select and save a default material center in Configuration before placing orders.',
      });
      return;
    }

    if (!salesTypeConfig.companyState.trim()) {
      toast({
        variant: 'destructive',
        title: 'Company state required',
        description: 'Add the company state in Sales Type Settings before placing orders.',
      });
      return;
    }

    if (!activeCustomerState) {
      toast({
        variant: 'destructive',
        title: 'Customer state unavailable',
        description:
          currentCustomerError ||
          'The selected customer does not have a state configured for tax selection.',
      });
      return;
    }

    const isSameStateOrder =
      normalizeStateName(activeCustomerState) ===
      normalizeStateName(salesTypeConfig.companyState);
    const applicableSaleTypeId = isSameStateOrder
      ? salesTypeConfig.sameStateSaleTypeId
      : salesTypeConfig.interstateSaleTypeId;
    const applicableSaleTypeName = isSameStateOrder
      ? salesTypeConfig.sameStateSaleTypeName
      : salesTypeConfig.interstateSaleTypeName;

    if (!applicableSaleTypeId || !applicableSaleTypeName) {
      toast({
        variant: 'destructive',
        title: 'Sales type not configured',
        description:
          'Configure both same-state and interstate sales types before placing orders.',
      });
      return;
    }
    
    const orderCustomerId =
      user?.role === 'customer' ? activeCustomerRecord?.id || user.id : customerId;
    const orderCustomerName =
      user?.role === 'customer' ? activeCustomerRecord?.name || user.name : customerName;
    
    setIsPlacingOrder(true);
    
    try {
      const result = await orderService.createOrder({
        companyId: selectedCompany?.companyId,
        financialYear: selectedCompany?.financialYear,
        customerId: orderCustomerId || '',
        customerName: orderCustomerName || '',
        customerState: activeCustomerState,
        companyState: salesTypeConfig.companyState.trim(),
        saleTypeId: applicableSaleTypeId,
        saleTypeName: applicableSaleTypeName,
        materialCenterId: activeMaterialCenterId,
        materialCenterName: activeMaterialCenterName,
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
        createdBy: user!.id,
        createdByRole: user!.role as 'customer' | 'salesman' | 'admin',
      });
      
      if (result.success) {
        clearCart();
        if (user?.role === 'salesman') {
          clearCustomer();
        }
        setOrderSuccess(true);
        setShowCartDialog(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Order not placed',
          description: result.error || 'The order could not be created. Please try again.',
        });
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      toast({
        variant: 'destructive',
        title: 'Order request failed',
        description: error instanceof Error ? error.message : 'Failed to place order. Please try again.',
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

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
    <>
      <section className="flex min-h-full flex-col bg-background">
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
            <div className="space-y-3">
              {isSalesman ? (
                <div className="rounded-2xl border bg-muted/30 p-3">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t.order.selectCustomer}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customerName
                          ? `Ordering for ${customerName}`
                          : t.order.customerRequiredDescription}
                      </p>
                    </div>
                    {customerName ? (
                      <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs">
                        {customerName}
                      </Badge>
                    ) : null}
                  </div>

                  <Popover open={showCustomerSelect} onOpenChange={setShowCustomerSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between rounded-xl"
                        disabled={!selectedCompany || customersLoading}
                      >
                        {customersLoading
                          ? t.order.loadingCustomers
                          : customerName || t.order.selectCustomer}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[22rem] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={t.order.searchCustomer}
                          value={customerSearch}
                          onValueChange={setCustomerSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {customersLoading ? t.order.loadingCustomers : 'No customer found.'}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredCustomers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={`${customer.name} ${customer.phone} ${customer.groupName || ''}`}
                                onSelect={() => {
                                  setCustomer(customer.id, customer.name);
                                  setShowCustomerSelect(false);
                                  setCustomerSearch('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    customerId === customer.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {customer.phone}
                                    {customer.city ? ` • ${customer.city}` : ''}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, HSN, group, or ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border-0 bg-muted/60 pl-9 shadow-none"
                  disabled={!canBrowseProducts || isLoadingProducts}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-5">
          <div className="w-full rounded-2xl border bg-card shadow-sm">
            <div className="p-4 sm:p-5">
              {!selectedCompany ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Select a company from the sidebar to load products.
                  </p>
                </div>
              ) : isSalesman && customersLoading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{t.order.loadingCustomers}</p>
                </div>
              ) : isSalesman && customersError ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Unable to load customers</p>
                    <p className="text-sm text-muted-foreground">{customersError}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void loadCustomers()}>
                    Retry
                  </Button>
                </div>
              ) : isSalesman && customers.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">{t.order.noCustomersAvailable}</p>
                </div>
              ) : isSalesman && !customerId ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t.order.customerRequiredTitle}</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      {t.order.customerRequiredDescription}
                    </p>
                  </div>
                  <Button onClick={() => setShowCustomerSelect(true)}>{t.order.selectCustomer}</Button>
                </div>
              ) : productsError ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Unable to load products</p>
                    <p className="text-sm text-muted-foreground">{productsError}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadProducts}>
                    Retry
                  </Button>
                </div>
              ) : isLoadingProducts ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No products available for this company.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No products match the current search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {paginatedProducts.map((product) => {
                    const cartItem = items.find(i => i.product.id === product.id);
                    const quantityInCart = cartItem?.quantity || 0;
                    const visibleValues = new Map<ProductFieldKey, string>();

                    for (const field of defaultProductFieldConfig) {
                      if (productFieldVisibility.get(field.fieldKey) !== true) {
                        continue;
                      }

                      const value = getProductFieldDisplayValue(product, field.fieldKey);

                      if (value && hasDisplayValue(value)) {
                        visibleValues.set(field.fieldKey, value);
                      }
                    }

                    const headingValue =
                      headingFieldKeys
                        .map((fieldKey) => visibleValues.get(fieldKey))
                        .find((value) => hasDisplayValue(value || null)) || null;
                    const usedFieldKeys = new Set<ProductFieldKey>();

                    if (headingValue) {
                      const headingKey = headingFieldKeys.find(
                        (fieldKey) => visibleValues.get(fieldKey) === headingValue
                      );

                      if (headingKey) {
                        usedFieldKeys.add(headingKey);
                      }
                    }

                    const secondaryHeadingEntries = headingFieldKeys
                      .filter((fieldKey) => !usedFieldKeys.has(fieldKey))
                      .map((fieldKey) => {
                        const value = visibleValues.get(fieldKey);
                        if (!value) {
                          return null;
                        }

                        usedFieldKeys.add(fieldKey);
                        return {
                          key: fieldKey,
                          label: productFieldLabels.get(fieldKey) || fieldKey,
                          value,
                        };
                      })
                      .filter(
                        (
                          entry
                        ): entry is { key: ProductFieldKey; label: string; value: string } =>
                          entry !== null
                      );

                    const metaEntries = metaFieldKeys
                      .map((fieldKey) => {
                        const value = visibleValues.get(fieldKey);
                        if (!value) {
                          return null;
                        }

                        usedFieldKeys.add(fieldKey);
                        return {
                          key: fieldKey,
                          label: productFieldLabels.get(fieldKey) || fieldKey,
                          value,
                        };
                      })
                      .filter(
                        (
                          entry
                        ): entry is { key: ProductFieldKey; label: string; value: string } =>
                          entry !== null
                      );

                    const primaryPriceEntry =
                      priceFieldKeys
                        .map((fieldKey) => {
                          const value = visibleValues.get(fieldKey);
                          if (!value) {
                            return null;
                          }

                          return {
                            key: fieldKey,
                            label: productFieldLabels.get(fieldKey) || fieldKey,
                            value,
                          };
                        })
                        .find(
                          (
                            entry
                          ): entry is { key: ProductFieldKey; label: string; value: string } =>
                            entry !== null
                        ) || null;

                    if (primaryPriceEntry) {
                      usedFieldKeys.add(primaryPriceEntry.key);
                    }

                    const secondaryPriceEntries = priceFieldKeys
                      .filter((fieldKey) => fieldKey !== primaryPriceEntry?.key)
                      .map((fieldKey) => {
                        const value = visibleValues.get(fieldKey);
                        if (!value) {
                          return null;
                        }

                        usedFieldKeys.add(fieldKey);
                        return {
                          key: fieldKey,
                          label: productFieldLabels.get(fieldKey) || fieldKey,
                          value,
                        };
                      })
                      .filter(
                        (
                          entry
                        ): entry is { key: ProductFieldKey; label: string; value: string } =>
                          entry !== null
                      );

                    const stockValue = visibleValues.get('stock');
                    if (stockValue) {
                      usedFieldKeys.add('stock');
                    }

                    const detailEntries = [
                      ...detailFieldKeys,
                      ...defaultProductFieldConfig
                        .map((field) => field.fieldKey)
                        .filter((fieldKey) => !usedFieldKeys.has(fieldKey)),
                    ]
                      .map((fieldKey) => {
                        if (usedFieldKeys.has(fieldKey)) {
                          return null;
                        }

                        const value = visibleValues.get(fieldKey);
                        if (!value) {
                          return null;
                        }

                        usedFieldKeys.add(fieldKey);
                        return {
                          key: fieldKey,
                          label: productFieldLabels.get(fieldKey) || fieldKey,
                          value,
                        };
                      })
                      .filter(
                        (
                          entry
                        ): entry is { key: ProductFieldKey; label: string; value: string } =>
                          entry !== null
                      );

                    return (
                      <Card
                        key={product.id}
                        className="overflow-hidden rounded-xl border-border/80 shadow-none transition-colors hover:border-border"
                      >
                        <CardContent className="flex h-full flex-col gap-3 p-3">
                          {headingValue ? (
                            <div className="space-y-1">
                              <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5">
                                {headingValue}
                              </p>
                              {secondaryHeadingEntries.map((entry) => (
                                <p key={entry.key} className="line-clamp-1 text-[11px] text-muted-foreground">
                                  {entry.label}: {entry.value}
                                </p>
                              ))}
                            </div>
                          ) : null}

                          {metaEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {metaEntries.map((entry) => (
                                <span
                                  key={entry.key}
                                  className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {entry.label}: {entry.value}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {primaryPriceEntry || secondaryPriceEntries.length > 0 || stockValue ? (
                            <div className="flex items-center justify-between gap-2">
                              {primaryPriceEntry || secondaryPriceEntries.length > 0 ? (
                                <div className="min-w-0">
                                  {primaryPriceEntry ? (
                                    <>
                                      <p className="text-sm font-semibold">{primaryPriceEntry.value}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {primaryPriceEntry.label}
                                      </p>
                                    </>
                                  ) : null}
                                  {secondaryPriceEntries.map((entry) => (
                                    <p key={entry.key} className="text-[10px] text-muted-foreground">
                                      {entry.label}: {entry.value}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <div />
                              )}
                              {stockValue ? (
                                <Badge
                                  variant={product.stock > 0 ? 'default' : 'secondary'}
                                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                                >
                                  {product.stock > 0 ? stockValue : 'Out'}
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}

                          {detailEntries.length > 0 ? (
                            <div className="space-y-1 rounded-xl bg-muted/20 p-2">
                              {detailEntries.map((entry) => (
                                <div
                                  key={entry.key}
                                  className="flex items-start justify-between gap-3 text-[11px]"
                                >
                                  <span className="text-muted-foreground">{entry.label}</span>
                                  <span className="max-w-[60%] text-right break-words">
                                    {entry.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-auto">
                            {quantityInCart > 0 ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    onClick={() => updateQuantity(cartItem?.id || '', quantityInCart - 1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center text-sm font-medium">{quantityInCart}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    onClick={() => handleAddToCart(product)}
                                    disabled={product.stock <= quantityInCart}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-destructive"
                                  onClick={() => removeItem(cartItem?.id || '')}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                className="h-9 w-full rounded-lg text-xs"
                                size="sm"
                                onClick={() => handleAddToCart(product)}
                                disabled={product.stock === 0}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                {t.order.addToCart}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cart Dialog */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="flex h-[calc(100dvh-1.5rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-[90vh] sm:max-h-[44rem]">
          <DialogHeader className="shrink-0 border-b px-4 py-4 text-left sm:px-6">
            <DialogTitle>{t.cart.title}</DialogTitle>
            <DialogDescription>
              {totalItems} {t.cart.items}
            </DialogDescription>
          </DialogHeader>
          
          {items.length === 0 ? (
            <div className="flex-1 px-4 py-8 text-center text-muted-foreground sm:px-6">
              {t.cart.empty}
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                <div className="space-y-4 px-4 py-4 sm:px-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 rounded-lg border p-3">
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-medium w-20 text-right">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                  
                  {user?.role === 'salesman' && (
                    <Popover open={showCustomerSelect} onOpenChange={setShowCustomerSelect}>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {t.cart.orderFor}
                        </div>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                            disabled={customersLoading || !selectedCompany}
                          >
                            {customersLoading
                              ? t.order.loadingCustomers
                              : customerName || t.order.selectCustomer}
                            <ChevronsUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </div>
                      <PopoverContent className="w-80 p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={t.order.searchCustomer}
                            value={customerSearch}
                            onValueChange={setCustomerSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {customersLoading ? t.order.loadingCustomers : 'No customer found.'}
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredCustomers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={`${customer.name} ${customer.phone} ${customer.groupName || ''}`}
                                  onSelect={() => {
                                    setCustomer(customer.id, customer.name);
                                    setShowCustomerSelect(false);
                                    setCustomerSearch('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customerId === customer.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{customer.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {customer.phone}
                                      {customer.city ? ` • ${customer.city}` : ''}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}

                  {isSalesman && customersError ? (
                    <p className="text-sm text-destructive">{customersError}</p>
                  ) : null}

                  <div className="rounded-xl border bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Material Center
                        </p>
                        <p className="font-medium">
                          {materialCenterConfigLoading
                            ? 'Loading...'
                            : activeMaterialCenterName || 'Not configured'}
                        </p>
                      </div>
                      {activeMaterialCenterId ? (
                        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                          {activeMaterialCenterId}
                        </Badge>
                      ) : null}
                    </div>
                    {materialCenterConfigError ? (
                      <p className="mt-2 text-sm text-destructive">{materialCenterConfigError}</p>
                    ) : null}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.cart.subtotal}</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.cart.tax}</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
                <div className="mb-4 flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t.cart.grandTotal}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalItems} {t.cart.items}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">{formatCurrency(total)}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearCart} className="flex-1">
                    {t.cart.clearCart}
                  </Button>
                  <Button 
                    onClick={handlePlaceOrder} 
                    className="flex-1"
                    disabled={
                      isPlacingOrder ||
                      salesTypeConfigLoading ||
                      materialCenterConfigLoading ||
                      currentCustomerLoading ||
                      (user?.role === 'salesman' && !customerId)
                    }
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Placing...
                      </>
                    ) : (
                      t.cart.placeOrder
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Order Success Dialog */}
      <Dialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">{t.cart.orderSuccess}</DialogTitle>
            <DialogDescription>
              {t.cart.orderSuccessMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => {
              setOrderSuccess(false);
              router.push('/orders');
            }}>
              {t.dashboard.viewAllOrders}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrderPageContent() {
  return (
    <AppShell contentContainerClassName="max-w-none px-0 py-0 lg:px-0 lg:py-0">
      <OrderPageInner />
    </AppShell>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  );
}
