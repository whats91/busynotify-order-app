/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / product configuration.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/admin/product-configuration/route.ts
 * Role: admin private backend.
 */
export const runtime = 'nodejs';

export { GET, PUT } from '@/app/api/admin/product-configuration/route';
