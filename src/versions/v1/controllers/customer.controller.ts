// =====================================================
// CUSTOMER CONTROLLER - Request/Response Handling for Customers
// =====================================================

import type { Customer, CustomerSummary, ApiResponse } from '../../../shared/types';
import { customerService } from '../services/customer.service';

export class CustomerController {
  /**
   * Get all customers
   * @future This will be called by GET /api/customers
   */
  async getAllCustomers(): Promise<ApiResponse<{ customers: Customer[] }>> {
    try {
      const customers = await customerService.getAllCustomers();
      
      return {
        success: true,
        data: { customers },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch customers',
      };
    }
  }

  /**
   * Get customer by ID
   * @future This will be called by GET /api/customers/:id
   */
  async getCustomerById(id: string): Promise<ApiResponse<{ customer: Customer }>> {
    try {
      const customer = await customerService.getCustomerById(id);
      
      if (!customer) {
        return {
          success: false,
          error: 'Customer not found',
        };
      }
      
      return {
        success: true,
        data: { customer },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch customer',
      };
    }
  }

  /**
   * Get customer summaries
   * @future This will be called by GET /api/customers/summaries
   */
  async getCustomerSummaries(): Promise<ApiResponse<{ summaries: CustomerSummary[] }>> {
    try {
      const summaries = await customerService.getCustomerSummaries();
      
      return {
        success: true,
        data: { summaries },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch customer summaries',
      };
    }
  }

  /**
   * Search customers
   * @future This will be called by GET /api/customers/search
   */
  async searchCustomers(query: string): Promise<ApiResponse<{ customers: Customer[] }>> {
    try {
      const customers = await customerService.searchCustomers(query);
      
      return {
        success: true,
        data: { customers },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to search customers',
      };
    }
  }
}

// Singleton instance
export const customerController = new CustomerController();
