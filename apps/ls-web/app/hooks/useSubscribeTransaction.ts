'use client'

import { useEffect, useRef } from 'react'
import { subscribeTransaction } from '@/app/lib/realtime/subscribeTransaction'

/**
 * Subscribe to Realtime postgres_changes for a single transaction row.
 * Uses shared singleton + auto-reconnect to avoid "Subscription timed out" and channel leakage.
 */
export function useSubscribeTransaction(
  id: string | null,
  onUpdate: (row: Record<string, unknown>) => void
) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!id) return
    const unsub = subscribeTransaction(id, (row) => onUpdateRef.current(row))
    return unsub
  }, [id])
}
