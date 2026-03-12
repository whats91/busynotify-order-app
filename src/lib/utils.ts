/*
 * File Context:
 * Purpose: Provides shared infrastructure for Utils.
 * Primary Functionality: Supports shared runtime infrastructure consumed by routes, services, or server helpers.
 * Interlinked With: No direct internal imports; primarily used by framework or toolchain entry points.
 * Role: shared infrastructure.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
