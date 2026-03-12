/*
 * File Context:
 * Purpose: Implements service-layer behavior for Sale Type.Service.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/shared/types/index.ts, src/versions/v1/repositories/sale-type.repository.ts
 * Role: application data/service layer.
 */
import type { SaleType } from '../../../shared/types';
import { saleTypeRepository } from '../repositories/sale-type.repository';

export class SaleTypeService {
  async getSaleTypesByCompany(companyId: number, financialYear: string): Promise<SaleType[]> {
    return saleTypeRepository.findAllByCompany(companyId, financialYear);
  }
}

export const saleTypeService = new SaleTypeService();
