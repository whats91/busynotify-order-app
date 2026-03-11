// =====================================================
// CUSTOMER SERVICE - Business Logic for Customer Operations
// =====================================================

import type { Customer, CustomerSummary } from '../../../shared/types';
import { customerRepository } from '../repositories/customer.repository';

export class CustomerService {
  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<Customer[]> {
    return customerRepository.findAll();
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    return customerRepository.findById(id);
  }

  /**
   * Get customer summaries (lighter weight)
   */
  async getCustomerSummaries(): Promise<CustomerSummary[]> {
    return customerRepository.findSummaries();
  }

  /**
   * Search customers
   */
  async searchCustomers(query: string): Promise<Customer[]> {
    if (!query.trim()) {
      return customerRepository.findAll();
    }
    return customerRepository.search(query);
  }
}

// Singleton instance
export const customerService = new CustomerService();
