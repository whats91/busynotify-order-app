/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / order number configuration.
 * Primary Functionality: Exposes the admin-only internal alias for order-number configuration management.
 * Interlinked With: src/app/api/admin/order-number-configuration/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { GET, PUT } from '@/app/api/admin/order-number-configuration/route';
