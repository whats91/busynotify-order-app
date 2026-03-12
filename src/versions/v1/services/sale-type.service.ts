import type { SaleType } from '../../../shared/types';
import { saleTypeRepository } from '../repositories/sale-type.repository';

export class SaleTypeService {
  async getSaleTypesByCompany(companyId: number, financialYear: string): Promise<SaleType[]> {
    return saleTypeRepository.findAllByCompany(companyId, financialYear);
  }
}

export const saleTypeService = new SaleTypeService();
