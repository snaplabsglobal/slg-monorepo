'use client'

import { useEffect, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Subscribe to Realtime postgres_changes for a single transaction row.
 * When another client (or tab) updates is_verified / status, this client gets the payload and can update local state.
 * A 端 Confirm -> DB 写入 -> Realtime 推给 B 端 -> getReceiptStatus() 立刻变绿
 */
export function useSubscribeTransaction(
  id: string | null,
  onUpdate: (row: Record<string, unknown>) => void
) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`transaction:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            onUpdateRef.current(payload.new as Record<string, unknown>)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, supabase])
}
