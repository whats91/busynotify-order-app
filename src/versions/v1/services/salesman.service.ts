// =====================================================
// SALESMAN SERVICE - Business Logic for Admin CRUD
// =====================================================

import type {
  CreateSalesmanPayload,
  Salesman,
  UpdateSalesmanPayload,
} from '../../../shared/types';
import { salesmanRepository } from '../repositories/salesman.repository';

export class SalesmanService {
  async getSalesmen(): Promise<Salesman[]> {
    return salesmanRepository.findAll();
  }

  async createSalesman(payload: CreateSalesmanPayload): Promise<{
    success: boolean;
    salesman?: Salesman;
    error?: string;
  }> {
    try {
      const salesman = await salesmanRepository.create(payload);
      return {
        success: true,
        salesman,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create salesman.',
      };
    }
  }

  async updateSalesman(id: string, payload: UpdateSalesmanPayload): Promise<{
    success: boolean;
    salesman?: Salesman;
    error?: string;
  }> {
    try {
      const salesman = await salesmanRepository.update(id, payload);
      return {
        success: true,
        salesman,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update salesman.',
      };
    }
  }

  async deleteSalesman(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await salesmanRepository.delete(id);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete salesman.',
      };
    }
  }
}

export const salesmanService = new SalesmanService();
