/*
 * File Context:
 * Purpose: Handles the API route for api / internal / sales type configuration.
 * Primary Functionality: Exposes authenticated read access to sales type configuration without requiring admin role.
 * Interlinked With: src/app/api/admin/sales-type-configuration/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { GET } from '@/app/api/admin/sales-type-configuration/route';
