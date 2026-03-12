/*
 * File Context:
 * Purpose: Handles the API route for api / internal / meta / indian states.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/meta/indian-states/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { GET } from '@/app/api/meta/indian-states/route';
