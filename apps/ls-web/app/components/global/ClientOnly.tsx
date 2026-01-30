'use client'

import { useHasMounted } from '@/app/hooks/useHasMounted'

/**
 * Renders children only after mount on the client. Use to avoid React hydration
 * mismatch (e.g. React Error #418) when children depend on client-only state.
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const mounted = useHasMounted()
  if (!mounted) return null
  return <>{children}</>
}
