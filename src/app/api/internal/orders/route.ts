/*
 * File Context:
 * Purpose: Handles the API route for api / internal / orders.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/orders/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { GET, POST } from '@/app/api/orders/route';
