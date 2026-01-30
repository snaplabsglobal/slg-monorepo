'use client'

const RECYCLE_DAYS = 30

function daysUntilCleanup(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime()
  const cleanup = deleted + RECYCLE_DAYS * 24 * 60 * 60 * 1000
  const now = Date.now()
  const daysLeft = Math.ceil((cleanup - now) / (24 * 60 * 60 * 1000))
  return Math.max(0, daysLeft)
}

interface DeletedInfoBannerProps {
  deletedAt: string
  deletionReason?: string | null
}

export function DeletedInfoBanner({ deletedAt, deletionReason }: DeletedInfoBannerProps) {
  const daysLeft = daysUntilCleanup(deletedAt)
  const deletedDate = new Date(deletedAt)
  const dateStr = deletedDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="mb-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-900">
      <p className="text-sm font-semibold">⚠️ 此收据已被删除</p>
      <dl className="mt-2 space-y-1 text-xs">
        <div>
          <span className="text-amber-700">删除时间：</span>
          <span className="font-medium">{dateStr}</span>
        </div>
        {deletionReason && (
          <div>
            <span className="text-amber-700">删除原因：</span>
            <span className="font-medium">{deletionReason}</span>
          </div>
        )}
        <div>
          <span className="text-amber-700">自动清理：</span>
          <span className="font-medium">
            {daysLeft > 0 ? `还剩 ${daysLeft} 天` : '即将清理'}
          </span>
        </div>
      </dl>
      <p className="mt-3 text-xs text-amber-800">
        💡 想要编辑？请先还原此收据
      </p>
    </div>
  )
}
