'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true only after the component has mounted on the client.
 * Use to avoid hydration mismatch when rendering client-only content
 * (e.g. queue lists, status bars that depend on browser state).
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
