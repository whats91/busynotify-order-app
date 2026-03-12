/*
 * File Context:
 * Purpose: Defines the project file for Product Pricing.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: src/shared/types/index.ts
 * Role: shared project asset.
 */
import type { ApiProduct } from '../types';

function normalizePrice(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 0;
  }

  return value;
}

export function resolveProductPricing(apiProduct: ApiProduct) {
  const salesPrice = normalizePrice(apiProduct.product_sales_price);
  const mrp = normalizePrice(apiProduct.product_mrp);
  const price = salesPrice > 0 ? salesPrice : mrp;

  return {
    price,
    salesPrice,
    mrp,
  };
}
