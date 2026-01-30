// components/transactions/ResponsiveDetailPanel.tsx
// 响应式详情面板 - 桌面端 Slide-over，移动端 Bottom Sheet

'use client'

import { useEffect, useState } from 'react'
import { TransactionDetailSlideOver } from './TransactionDetailSlideOver'
import { MobileBottomSheet } from './MobileBottomSheet'

interface ResponsiveDetailPanelProps {
  transactionId: string | null
  isOpen: boolean
  onClose: () => void
  onConfirmed?: (updated?: any) => void
  /** When true (Recycle Bin), allow loading deleted transactions */
  includeDeleted?: boolean
}

export function ResponsiveDetailPanel({
  transactionId,
  isOpen,
  onClose,
  onConfirmed,
  includeDeleted = false,
}: ResponsiveDetailPanelProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    // 移动端：Bottom Sheet
    return (
      <MobileBottomSheet
        transactionId={transactionId}
        isOpen={isOpen}
        onClose={onClose}
        onConfirmed={onConfirmed}
        includeDeleted={includeDeleted}
      />
    )
  }

  // 桌面端：Slide-over (always render, but only visible when isOpen)
  // TransactionDetailSlideOver handles its own open state based on transactionId
  return (
    <>
      <TransactionDetailSlideOver
        transactionId={isOpen ? transactionId : null}
        onClose={onClose}
        onConfirmed={onConfirmed}
        includeDeleted={includeDeleted}
      />
      {/* Mobile Bottom Sheet is handled separately above */}
    </>
  )
}
