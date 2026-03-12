/*
 * File Context:
 * Purpose: Stores shared client state for Index.
 * Primary Functionality: Keeps client state synchronized across views, refreshes, and related interactions.
 * Interlinked With: src/shared/lib/stores/auth.store.ts, src/shared/lib/stores/cart.store.ts, src/shared/lib/stores/company.store.ts, src/shared/lib/stores/customer.store.ts
 * Role: shared client state.
 */
// =====================================================
// STORES INDEX
// =====================================================

export * from './auth.store';
export * from './cart.store';
export * from './language.store';
export * from './company.store';
export * from './customer.store';
export * from './product.store';
export * from './pagination.store';
export * from './ecommerce-cart.store';
