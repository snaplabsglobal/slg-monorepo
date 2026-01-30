'use client'

import { useUploadQueue } from '@/app/hooks/useUploadQueue'

export function UploadQueueIndicator() {
  const { queued, uploading, analyzing, retryable } = useUploadQueue(1500)
  const total = queued + uploading + analyzing + retryable
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  if (total === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-1 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        {uploading > 0 && <span className="text-blue-600">上传中 {uploading}</span>}
        {analyzing > 0 && <span className="text-amber-600">识别中 {analyzing}</span>}
        {queued > 0 && <span className="text-gray-500">等待 {queued}</span>}
        {retryable > 0 && <span className="text-orange-600">重试中 {retryable}</span>}
      </div>
      {offline && (
        <p className="text-xs text-amber-700">离线，恢复网络后自动继续上传</p>
      )}
    </div>
  )
}
