/*
 * File Context:
 * Purpose: Handles the API route for api / internal / orders / :id.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/orders/[id]/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { DELETE, GET } from '@/app/api/orders/[id]/route';
