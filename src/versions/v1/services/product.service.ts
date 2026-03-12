/*
 * File Context:
 * Purpose: Implements service-layer behavior for Product.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/product.repository.ts
 * Role: application data/service layer.
 */
// =====================================================
// PRODUCT SERVICE - Business Logic for Product Operations
// =====================================================

import type { Product, ProductCategory, ProductFilter } from '../../../shared/types';
import { productRepository } from '../repositories/product.repository';

export class ProductService {
  /**
   * Get all active products
   */
  async getAllProducts(): Promise<Product[]> {
    return productRepository.findAll();
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    return productRepository.findById(id);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<ProductCategory[]> {
    return productRepository.findCategories();
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<Product[]> {
    return productRepository.findByCategory(category);
  }

  /**
   * Search products
   */
  async searchProducts(query: string, category?: string): Promise<Product[]> {
    return productRepository.search(query, category);
  }

  /**
   * Get products with filter
   */
  async getFilteredProducts(filter: ProductFilter): Promise<Product[]> {
    return productRepository.findWithFilter(filter);
  }

  /**
   * Check product availability
   */
  async checkAvailability(productId: string, quantity: number): Promise<{
    available: boolean;
    stock: number;
  }> {
    const product = await productRepository.findById(productId);
    
    if (!product) {
      return { available: false, stock: 0 };
    }
    
    return {
      available: product.stock >= quantity,
      stock: product.stock,
    };
  }
}

// Singleton instance
export const productService = new ProductService();
