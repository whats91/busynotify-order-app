/*
 * File Context:
 * Purpose: Handles the API route for api.
 * Primary Functionality: Validates incoming requests, calls service or server modules, and returns framework JSON responses.
 * Interlinked With: Referenced by the Next.js routing runtime and adjacent shared modules.
 * Role: shared backend.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}