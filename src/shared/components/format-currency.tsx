// =====================================================
// FORMAT CURRENCY HELPER
// =====================================================

import { formatCurrency as formatCurrencyUtil } from '../config/brand.config';

export function formatCurrency(amount: number): string {
  return formatCurrencyUtil(amount);
}
