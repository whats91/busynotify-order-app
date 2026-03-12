// =====================================================
// CUSTOMER REPOSITORY - Data Access Layer for Customers
// =====================================================

import type { Customer, CustomerApiResponse, CustomerListRequest, CustomerSummary } from '../../../shared/types';
import {
  getAllCustomers,
  getCustomerById,
  getCustomerSummaries,
  searchCustomers,
} from '../mock-data/customers';

export class CustomerRepository {
  async findAllByCompany(params: CustomerListRequest): Promise<Customer[]> {
    const response = await fetch('/api/customers', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = (await response.json()) as CustomerApiResponse & {
      error?: string;
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to fetch customers.');
    }

    return data.data;
  }

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
