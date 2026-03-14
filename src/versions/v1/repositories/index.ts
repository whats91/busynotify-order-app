/*
 * File Context:
 * Purpose: Implements repository access for Index.
 * Primary Functionality: Wraps lower-level fetch or persistence calls behind a stable repository interface.
 * Interlinked With: src/versions/v1/repositories/auth.repository.ts, src/versions/v1/repositories/customer.repository.ts, src/versions/v1/repositories/ecommerce.repository.ts, src/versions/v1/repositories/material-center-config.repository.ts
 * Role: application data/service layer.
 */
// =====================================================
// REPOSITORIES INDEX
// =====================================================

export * from './auth.repository';
export * from './customer.repository';
export * from './product.repository';
export * from './product-config.repository';
export * from './sale-type.repository';
export * from './sales-type-config.repository';
export * from './material-center.repository';
export * from './material-center-config.repository';
export * from './voucher-series.repository';
export * from './voucher-series-config.repository';
export * from './order-number-config.repository';
export * from './ecommerce.repository';
export * from './order.repository';
export * from './salesman.repository';
export * from './task.repository';
