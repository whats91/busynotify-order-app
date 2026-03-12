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
