// =====================================================
// PRODUCT STORE - Zustand Store for Products
// =====================================================

import { create } from 'zustand';
import type { ApiProduct, ProductDisplay, ProductApiResponse, Company } from '../../types';

interface ProductState {
  products: ProductDisplay[];
  rawProducts: ApiProduct[]; // Full API response for Phase 2 configuration
  lastApiResponse: ProductApiResponse | null; // Full API response with metadata
  isLoading: boolean;
  error: string | null;
  lastCompanyId: number | null;
  lastFinancialYear: string | null;
  
  // Actions
  setProducts: (products: ProductDisplay[], rawProducts: ApiProduct[], apiResponse: ProductApiResponse | null, company?: Company | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearProducts: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  rawProducts: [],
  lastApiResponse: null,
  isLoading: false,
  error: null,
  lastCompanyId: null,
  lastFinancialYear: null,
  
  setProducts: (products, rawProducts, lastApiResponse, company) => set({ 
    products, 
    rawProducts,
    lastApiResponse,
    isLoading: false,
    error: null,
    lastCompanyId: company?.companyId ?? null,
    lastFinancialYear: company?.financialYear ?? null,
  }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  clearProducts: () => set({ 
    products: [], 
    rawProducts: [],
    lastApiResponse: null,
    error: null,
    lastCompanyId: null,
    lastFinancialYear: null,
  }),
}));

function normalizePrice(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 0;
  }

  return value;
}

function resolveProductPricing(apiProduct: ApiProduct) {
  const salesPrice = normalizePrice(apiProduct.product_sales_price);
  const mrp = normalizePrice(apiProduct.product_mrp);
  const price = salesPrice > 0 ? salesPrice : mrp;

  return {
    price,
    salesPrice,
    mrp,
  };
}

// Helper function to transform API product to display format
export function transformProduct(apiProduct: ApiProduct): ProductDisplay {
  const pricing = resolveProductPricing(apiProduct);

  return {
    id: apiProduct.product_id.toString(),
    productId: apiProduct.product_id,
    name: apiProduct.product_name,
    price: pricing.price,
    salesPrice: pricing.salesPrice,
    mrp: pricing.mrp,
    stock: apiProduct.product_stock,
    unit: apiProduct.product_unit,
    taxRate: apiProduct.product_tax_rate,
    taxName: apiProduct.product_tax_name,
    groupName: apiProduct.product_group_name,
    hsnCode: apiProduct.product_hsn_code,
    _fullData: apiProduct,
  };
}

// Function to fetch products from API
export async function fetchProducts(companyId: number, financialYear: string): Promise<{
  success: boolean;
  data?: ProductDisplay[];
  rawData?: ApiProduct[];
  apiResponse?: ProductApiResponse;
  error?: string;
}> {
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        financialYear,
      }),
    });

    const result: ProductApiResponse = await response.json();

    if (result.success && result.data) {
      const transformedProducts = result.data.map(transformProduct);
      return {
        success: true,
        data: transformedProducts,
        rawData: result.data,
        apiResponse: result,
      };
    } else {
      return {
        success: false,
        error: 'Failed to fetch products',
      };
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      success: false,
      error: 'Failed to fetch products',
    };
  }
}

// Selector hooks
export const useProducts = () => useProductStore((state) => state.products);
export const useRawProducts = () => useProductStore((state) => state.rawProducts);
export const useProductsLoading = () => useProductStore((state) => state.isLoading);
export const useProductsError = () => useProductStore((state) => state.error);
