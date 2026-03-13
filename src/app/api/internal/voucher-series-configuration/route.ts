/*
 * File Context:
 * Purpose: Handles the API route for api / internal / voucher series configuration.
 * Primary Functionality: Exposes authenticated read access to voucher series configuration without requiring admin role.
 * Interlinked With: src/app/api/admin/voucher-series-configuration/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { GET } from '@/app/api/admin/voucher-series-configuration/route';
