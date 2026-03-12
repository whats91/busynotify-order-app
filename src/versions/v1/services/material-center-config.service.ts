/*
 * File Context:
 * Purpose: Implements service-layer behavior for Material Center Config.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/material-center-config.repository.ts
 * Role: application data/service layer.
 */
import type {
  MaterialCenterConfig,
  UpdateMaterialCenterConfigPayload,
} from '../../../shared/types';
import { materialCenterConfigRepository } from '../repositories/material-center-config.repository';

export class MaterialCenterConfigService {
  async getMaterialCenterConfig(
    companyId: number,
    financialYear: string
  ): Promise<MaterialCenterConfig> {
    return materialCenterConfigRepository.findByCompany(companyId, financialYear);
  }

  async updateMaterialCenterConfig(payload: UpdateMaterialCenterConfigPayload): Promise<{
    success: boolean;
    config?: MaterialCenterConfig;
    error?: string;
  }> {
    try {
      const config = await materialCenterConfigRepository.update(payload);

      return {
        success: true,
        config,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update material center configuration.',
      };
    }
  }
}

export const materialCenterConfigService = new MaterialCenterConfigService();
