/*
 * File Context:
 * Purpose: Provides the reusable Aspect Ratio UI primitive.
 * Primary Functionality: Exports a reusable presentational building block that other components compose.
 * Interlinked With: Consumed by route pages and other shared UI components.
 * Role: shared UI primitive.
 */
"use client"

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export { AspectRatio }
