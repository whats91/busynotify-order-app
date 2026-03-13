/*
 * File Context:
 * Purpose: Handles the API route for api / internal / product configuration.
 * Primary Functionality: Exposes authenticated read access to product display settings for non-admin app views.
 * Interlinked With: src/app/api/admin/product-configuration/route.ts, src/proxy.ts
 * Role: private backend.
 */
export const runtime = 'nodejs';

export { GET } from '@/app/api/admin/product-configuration/route';
