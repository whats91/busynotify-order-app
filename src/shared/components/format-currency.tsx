/*
 * File Context:
 * Purpose: Provides the shared Format Currency component used across routes.
 * Primary Functionality: Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.
 * Interlinked With: src/shared/config/brand.config.ts
 * Role: shared UI.
 */
// =====================================================
// FORMAT CURRENCY HELPER
// =====================================================

import { formatCurrency as formatCurrencyUtil } from '../config/brand.config';

export function formatCurrency(amount: number): string {
  return formatCurrencyUtil(amount);
}
