import type { ReceiptLike } from '@slo/shared-utils'

/** Map app transaction to ReceiptLike for getReceiptStatus. is_verified === true forces READY (green) everywhere. */
export function toReceiptLike(t: {
  id: string
  status?: string | null
  is_verified?: boolean | null
  [key: string]: unknown
}): ReceiptLike {
  return {
    id: t.id,
    is_verified: t.is_verified ?? undefined,
    ai_status:
      t.status === 'pending'
        ? 'processing'
        : t.status === 'error' || t.status === 'rejected'
          ? 'failed'
          : undefined,
  }
}
