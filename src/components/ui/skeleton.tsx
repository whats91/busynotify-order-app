/*
 * File Context:
 * Purpose: Provides the reusable Skeleton UI primitive.
 * Primary Functionality: Exports a reusable presentational building block that other components compose.
 * Interlinked With: src/lib/utils.ts
 * Role: shared UI primitive.
 */
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
