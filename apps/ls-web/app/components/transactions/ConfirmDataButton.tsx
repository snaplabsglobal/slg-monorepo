'use client'

import { useState } from 'react'

/** 财务绿：全系统唯一「確認數據」按钮色 */
const FINANCIAL_GREEN = '#10b981'

export function ConfirmDataButton({
  transactionId,
  onDone,
}: {
  transactionId: string
  onDone: () => void
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [vanished, setVanished] = useState(false)

  async function onConfirm() {
    if (state !== 'idle') return
    setVanished(true)
    setState('saving')
    try {
      const res = await fetch(`/api/transactions/${transactionId}/verify`, { method: 'POST' })
      if (!res.ok) throw new Error('verify_failed')
      setState('success')
      window.dispatchEvent(new CustomEvent('transaction-verified', { detail: { transactionId } }))
      onDone()
    } catch {
      setVanished(false)
      setState('error')
      setTimeout(() => setState('idle'), 1000)
    }
  }

  if (vanished && state !== 'error') return null

  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={state === 'saving'}
      className={[
        'w-full rounded-xl py-3 text-base font-semibold transition',
        state === 'idle' && 'text-white',
        state === 'saving' && 'opacity-90 text-white',
        state === 'error' && 'bg-red-600 text-white',
      ].join(' ')}
      style={{
        backgroundColor:
          state === 'idle' || state === 'saving' ? FINANCIAL_GREEN : undefined,
      }}
    >
      {state === 'idle' && '確認數據'}
      {state === 'saving' && '確認中…'}
      {state === 'error' && '出錯了，請重試'}
    </button>
  )
}
