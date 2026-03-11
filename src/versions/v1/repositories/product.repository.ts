// =====================================================
// PRODUCT REPOSITORY - Data Access Layer for Products
// =====================================================

import type { Product, ProductCategory, ProductFilter } from '../../../shared/types';
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getAllCategories,
  searchProducts,
} from '../mock-data/products';

export class ProductRepository {
  /**
   * Get all products
   * @future Replace with: GET /api/products
   */
  async findAll(): Promise<Product[]> {
    await this.simulateDelay();
    return getAllProducts();
  }

  /**
   * Get product by ID
   * @future Replace with: GET /api/products/:id
   */
  async findById(id: string): Promise<Product | null> {
    await this.simulateDelay();
    return getProductById(id) || null;
  }

  /**
   * Get products by category
   * @future Replace with: GET /api/products?category=xxx
   */
  async findByCategory(category: string): Promise<Product[]> {
    await this.simulateDelay();
    return getProductsByCategory(category);
  }

  /**
   * Get all categories
   * @future Replace with: GET /api/products/categories
   */
  async findCategories(): Promise<ProductCategory[]> {
    await this.simulateDelay();
    return getAllCategories();
  }

  /**
   * Search products with filters
   * @future Replace with: GET /api/products/search?q=xxx&category=xxx
   */
  async search(query: string, category?: string): Promise<Product[]> {
    await this.simulateDelay();
    return searchProducts(query, category);
  }

  /**
   * Get products with filter
   * @future Replace with: GET /api/products with query params
   */
  async findWithFilter(filter: ProductFilter): Promise<Product[]> {
    await this.simulateDelay();
    let products = getAllProducts();

    if (filter.category) {
      products = products.filter(p => p.category === filter.category);
    }

    if (filter.search) {
      const lowerSearch = filter.search.toLowerCase();
      products = products.filter(
        p =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.sku.toLowerCase().includes(lowerSearch)
      );
    }

    if (filter.inStock !== undefined) {
      products = products.filter(p => 
        filter.inStock ? p.stock > 0 : p.stock === 0
      );
    }

    if (filter.minPrice !== undefined) {
      products = products.filter(p => p.price >= filter.minPrice!);
    }

    if (filter.maxPrice !== undefined) {
      products = products.filter(p => p.price <= filter.maxPrice!);
    }

    return products;
  }

  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }
}

// Singleton instance
export const productRepository = new ProductRepository();
