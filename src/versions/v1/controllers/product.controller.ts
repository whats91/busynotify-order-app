// =====================================================
// PRODUCT CONTROLLER - Request/Response Handling for Products
// =====================================================

import type { Product, ProductCategory, ProductFilter, ApiResponse } from '../../../shared/types';
import { productService } from '../services/product.service';

export class ProductController {
  /**
   * Get all products
   * @future This will be called by GET /api/products
   */
  async getAllProducts(): Promise<ApiResponse<{ products: Product[] }>> {
    try {
      const products = await productService.getAllProducts();
      
      return {
        success: true,
        data: { products },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch products',
      };
    }
  }

  /**
   * Get product by ID
   * @future This will be called by GET /api/products/:id
   */
  async getProductById(id: string): Promise<ApiResponse<{ product: Product }>> {
    try {
      const product = await productService.getProductById(id);
      
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }
      
      return {
        success: true,
        data: { product },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch product',
      };
    }
  }

  /**
   * Get categories
   * @future This will be called by GET /api/products/categories
   */
  async getCategories(): Promise<ApiResponse<{ categories: ProductCategory[] }>> {
    try {
      const categories = await productService.getCategories();
      
      return {
        success: true,
        data: { categories },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch categories',
      };
    }
  }

  /**
   * Search products
   * @future This will be called by GET /api/products/search
   */
  async searchProducts(
    query?: string,
    category?: string
  ): Promise<ApiResponse<{ products: Product[] }>> {
    try {
      const products = await productService.searchProducts(query || '', category);
      
      return {
        success: true,
        data: { products },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to search products',
      };
    }
  }

  /**
   * Get filtered products
   * @future This will be called by GET /api/products with query params
   */
  async getFilteredProducts(filter: ProductFilter): Promise<ApiResponse<{ products: Product[] }>> {
    try {
      const products = await productService.getFilteredProducts(filter);
      
      return {
        success: true,
        data: { products },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch products',
      };
    }
  }
}

// Singleton instance
export const productController = new ProductController();
