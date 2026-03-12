// =====================================================
// SALESMAN REPOSITORY - Data Access Layer for Admin CRUD
// =====================================================

import type {
  CreateSalesmanPayload,
  Salesman,
  UpdateSalesmanPayload,
} from '../../../shared/types';

export class SalesmanRepository {
  async findAll(): Promise<Salesman[]> {
    const response = await fetch('/api/internal/admin/salesmen', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Salesman[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to fetch salesmen.');
    }

    return data.data;
  }

  async create(payload: CreateSalesmanPayload): Promise<Salesman> {
    const response = await fetch('/api/internal/admin/salesmen', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Salesman;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to create salesman.');
    }

    return data.data;
  }

  async update(id: string, payload: UpdateSalesmanPayload): Promise<Salesman> {
    const response = await fetch(`/api/internal/admin/salesmen/${id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: Salesman;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to update salesman.');
    }

    return data.data;
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/internal/admin/salesmen/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    if (!response.ok || data.success !== true) {
      throw new Error(data.error || 'Failed to delete salesman.');
    }
  }
}

export const salesmanRepository = new SalesmanRepository();
