/*
 * File Context:
 * Purpose: Handles the API route for api / internal / material center configuration.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: src/app/api/material-center-configuration/route.ts
 * Role: private authenticated backend.
 */
export const runtime = 'nodejs';

export { GET, PUT } from '@/app/api/material-center-configuration/route';
