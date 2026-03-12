/*
 * File Context:
 * Purpose: Handles the API route for api / internal / sale types.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/sale-types/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { POST } from '@/app/api/sale-types/route';
