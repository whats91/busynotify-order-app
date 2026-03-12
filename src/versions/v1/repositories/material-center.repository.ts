/*
 * File Context:
 * Purpose: Implements repository access for Material Center.Repository.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
import type { MaterialCenter } from '../../../shared/types';

export class MaterialCenterRepository {
  async findAllByCompany(companyId: number, financialYear: string): Promise<MaterialCenter[]> {
    const response = await fetch('/api/internal/material-centers', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        financialYear,
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: MaterialCenter[];
    };

    if (!response.ok || data.success !== true || !Array.isArray(data.data)) {
      throw new Error(data.error || 'Failed to load material centers.');
    }

    return data.data;
  }
}

export const materialCenterRepository = new MaterialCenterRepository();
