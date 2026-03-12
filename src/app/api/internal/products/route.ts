/*
 * File Context:
 * Purpose: Handles the API route for api / internal / products.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/products/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { POST } from '@/app/api/products/route';
