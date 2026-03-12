/*
 * File Context:
 * Purpose: Implements service-layer behavior for Material Center.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/material-center.repository.ts
 * Role: application data/service layer.
 */
import type { MaterialCenter } from '../../../shared/types';
import { materialCenterRepository } from '../repositories/material-center.repository';

export class MaterialCenterService {
  async getMaterialCentersByCompany(
    companyId: number,
    financialYear: string
  ): Promise<MaterialCenter[]> {
    return materialCenterRepository.findAllByCompany(companyId, financialYear);
  }
}

export const materialCenterService = new MaterialCenterService();
