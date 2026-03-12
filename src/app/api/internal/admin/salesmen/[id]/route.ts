/*
 * File Context:
 * Purpose: Handles the API route for api / internal / admin / salesmen / :id.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/admin/salesmen/[id]/route.ts
 * Role: admin private backend.
 */
export const runtime = 'nodejs';

export { PATCH, DELETE } from '@/app/api/admin/salesmen/[id]/route';
