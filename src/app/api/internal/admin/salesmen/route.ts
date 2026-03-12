/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / salesmen.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/admin/salesmen/route.ts
 * Role: admin private backend.
 */
export const runtime = 'nodejs';

export { GET, POST } from '@/app/api/admin/salesmen/route';
