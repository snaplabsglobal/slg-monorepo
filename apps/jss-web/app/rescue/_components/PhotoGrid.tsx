/**
 * Photo Grid Component
 *
 * 3-column responsive grid for photo tiles
 */

import type { ReactNode } from 'react'

export function PhotoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {children}
    </div>
  )
}
