/*
 * File Context:
 * Purpose: Handles the API route for api / order / :id / status.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/public/orders/[id]/status/route.ts
 * Role: public integration backend.
 */
export const runtime = 'nodejs';

export { PATCH, PUT } from '@/app/api/public/orders/[id]/status/route';
