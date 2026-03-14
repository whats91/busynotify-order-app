/*
 * File Context:
 * Purpose: Implements service-layer behavior for Index.
 * Primary Functionality: Coordinates repository calls and domain logic for higher-level app features.
 * Interlinked With: src/versions/v1/services/auth.service.ts, src/versions/v1/services/customer.service.ts, src/versions/v1/services/ecommerce.service.ts, src/versions/v1/services/material-center-config.service.ts
 * Role: application data/service layer.
 */
// =====================================================
// SERVICES INDEX
// =====================================================

export * from './auth.service';
export * from './customer.service';
export * from './product.service';
export * from './product-config.service';
export * from './sale-type.service';
export * from './sales-type-config.service';
export * from './material-center.service';
export * from './material-center-config.service';
export * from './voucher-series.service';
export * from './voucher-series-config.service';
export * from './order-number-config.service';
export * from './ecommerce.service';
export * from './order.service';
export * from './salesman.service';
export * from './task.service';
