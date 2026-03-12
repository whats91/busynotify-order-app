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
