// =====================================================
// CUSTOMER REPOSITORY - Data Access Layer for Customers
// =====================================================

import type { Customer, CustomerSummary } from '../../../shared/types';
import {
  getAllCustomers,
  getCustomerById,
  getCustomerSummaries,
  searchCustomers,
} from '../mock-data/customers';

export class CustomerRepository {
  /**
   * Get all customers
   * @future Replace with: GET /api/customers
   */
  async findAll(): Promise<Customer[]> {
    await this.simulateDelay();
    return getAllCustomers();
  }

  /**
   * Get customer by ID
   * @future Replace with: GET /api/customers/:id
   */
  async findById(id: string): Promise<Customer | null> {
    await this.simulateDelay();
    return getCustomerById(id) || null;
  }

  /**
   * Get customer summaries (lighter weight)
   * @future Replace with: GET /api/customers/summaries
   */
  async findSummaries(): Promise<CustomerSummary[]> {
    await this.simulateDelay();
    return getCustomerSummaries();
  }

  /**
   * Search customers by query
   * @future Replace with: GET /api/customers/search?q=query
   */
  async search(query: string): Promise<Customer[]> {
    await this.simulateDelay();
    return searchCustomers(query);
  }

  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }
}

// Singleton instance
export const customerRepository = new CustomerRepository();
