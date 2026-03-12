/*
 * File Context:
 * Purpose: Encapsulates reusable React behavior for Use Mobile.
 * Primary Functionality: Packages reusable React state and effect behavior behind a dedicated hook API.
 * Interlinked With: No direct internal imports; primarily used by framework or toolchain entry points.
 * Role: shared frontend behavior.
 */
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
