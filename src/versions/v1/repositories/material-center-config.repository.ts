/*
 * File Context:
 * Purpose: Implements repository access for Material Center Config.Repository.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/shared/types/index.ts
 * Role: application data/service layer.
 */
import type {
  MaterialCenterConfig,
  UpdateMaterialCenterConfigPayload,
} from '../../../shared/types';

export class MaterialCenterConfigRepository {
  async findByCompany(companyId: number, financialYear: string): Promise<MaterialCenterConfig> {
    const searchParams = new URLSearchParams({
      companyId: String(companyId),
      financialYear,
    });
    const response = await fetch(
      `/api/internal/material-center-configuration?${searchParams.toString()}`,
      {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }
    );

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: MaterialCenterConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to load material center configuration.');
    }

    return data.data;
  }

  async update(payload: UpdateMaterialCenterConfigPayload): Promise<MaterialCenterConfig> {
    const response = await fetch('/api/internal/material-center-configuration', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
      data?: MaterialCenterConfig;
    };

    if (!response.ok || data.success !== true || !data.data) {
      throw new Error(data.error || 'Failed to update material center configuration.');
    }

    return data.data;
  }
}

export const materialCenterConfigRepository = new MaterialCenterConfigRepository();
