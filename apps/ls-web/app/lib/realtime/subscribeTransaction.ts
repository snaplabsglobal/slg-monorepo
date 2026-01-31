/**
 * Subscribe to a single transaction's postgres_changes with auto-reconnect on TIMED_OUT/CLOSED/CHANNEL_ERROR.
 * Use this instead of ad-hoc channel creation to avoid channel leakage and "Subscription timed out".
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/app/lib/supabase/browser'

export function subscribeTransaction(
  id: string,
  onRow: (row: Record<string, unknown>) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const supabase = getBrowserSupabase()
  let channel: RealtimeChannel | null = null
  let retry = 0
  let stopped = false

  const sub = () => {
    if (stopped) return

    channel = supabase
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
            onRow(payload.new as Record<string, unknown>)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') retry = 0
        if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          const wait = Math.min(30000, 500 * Math.pow(2, retry++))
          setTimeout(() => {
            if (stopped) return
            try {
              if (channel) supabase.removeChannel(channel)
            } catch {
              /* ignore */
            }
            sub()
          }, wait)
        }
      })
  }

  sub()

  const onOnline = () => {
    if (stopped) return
    try {
      if (channel) supabase.removeChannel(channel)
    } catch {
      /* ignore */
    }
    sub()
  }
  window.addEventListener('online', onOnline)

  return () => {
    stopped = true
    window.removeEventListener('online', onOnline)
    try {
      if (channel) supabase.removeChannel(channel)
    } catch {
      /* ignore */
    }
  }
}
