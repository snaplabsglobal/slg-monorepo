'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  XIcon,
  ImageIcon,
} from './icons';
import { ReceiptEdgeCropModal } from './ReceiptEdgeCropModal';
import { useHasMounted } from '@/app/hooks/useHasMounted';
import { enqueueReceipt } from '@/app/lib/upload-queue';
import { putBlob, deleteItem as deleteQueueItem } from '@/app/lib/upload-queue/store';
import { useUploadQueue } from '@/app/hooks/useUploadQueue';

interface UploadReceiptProps {
  onUploadSuccess?: (transactionId: string) => void;
  onCancel?: () => void;
  projectId?: string | null;
}

type QueueItem = {
  id: string
  file: File
  previewUrl: string
  status: 'queued' | 'uploading' | 'received' | 'error'
  message?: string
  transactionId?: string
  createdAt: number
}

type ToastItem = { id: string; type: 'success' | 'error' | 'info'; message: string }

/** Map IDB queue status to UI status */
function mapIdbStatusToUi(
  status: string
): 'queued' | 'uploading' | 'received' | 'error' | 'done' {
  if (status === 'queued') return 'queued'
  if (status === 'uploading' || status === 'analyzing') return 'uploading'
  if (status === 'received') return 'received'
  if (
    status === 'failed_retryable' ||
    status === 'failed_fatal' ||
    status === 'skipped_duplicate'
  )
    return 'error'
  if (status === 'done') return 'done'
  return 'queued'
}

export function UploadReceipt({ onUploadSuccess, onCancel, projectId }: UploadReceiptProps) {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const { items: idbItems } = useUploadQueue(1500)
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [cropItemId, setCropItemId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const hasTriggeredRedirectRef = useRef(false)

  const isUploading = useMemo(() => queue.some((q) => q.status === 'uploading'), [queue])

  const allReceived = useMemo(
    () => queue.length > 0 && queue.every((q) => q.status === 'received'),
    [queue]
  )

  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, ...t }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 2200)
  }, [])

  // Sync status from IndexedDB queue (offline upload buffer) into local UI queue
  useEffect(() => {
    if (idbItems.length === 0) return
    setQueue((prev) => {
      let next = prev
      for (const idb of idbItems) {
        const uiStatus = mapIdbStatusToUi(idb.status)
        if (uiStatus === 'done' || idb.status === 'skipped_duplicate') {
          next = next.filter((q) => q.id !== idb.id)
          continue
        }
        const idx = next.findIndex((q) => q.id === idb.id)
        if (idx === -1) continue
        const cur = next[idx]
        if (cur.status !== uiStatus || cur.message !== idb.message || cur.transactionId !== idb.transactionId) {
          next = next.slice()
          next[idx] = { ...cur, status: uiStatus, message: idb.message, transactionId: idb.transactionId }
        }
      }
      return next
    })
  }, [idbItems])

  // Cleanup on unmount: revoke preview URLs
  useEffect(() => {
    return () => {
      queue.forEach((q) => {
        try {
          URL.revokeObjectURL(q.previewUrl)
        } catch {
          // ignore
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CRITICAL: Cleanup on unmount - ensure no uploads are stuck in uploading state
  useEffect(() => {
    return () => {
      // When component unmounts, mark any uploading items as error
      // This prevents forever spinners if user navigates away
      setQueue((prev) =>
        prev.map((q) =>
          q.status === 'uploading' ? { ...q, status: 'error', message: '上传已中断（页面已离开）' } : q
        )
      )
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      handleFiles(files)
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFiles(files)
    }
  };

  const validateFile = (selectedFile: File) => {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]
    if (!validTypes.includes(selectedFile.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, HEIC)'
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB'
    }
    return null
  }

  const enqueueFiles = useCallback(
    async (files: File[]) => {
      const items: QueueItem[] = []
      for (const file of files) {
        const msg = validateFile(file)
        if (msg) {
          setError(msg)
          pushToast({ type: 'error', message: msg })
          continue
        }
        try {
          const receiptItem = await enqueueReceipt({
            file,
            projectId: projectId ?? undefined,
          })
          items.push({
            id: receiptItem.id,
            file,
            previewUrl: URL.createObjectURL(file),
            status: 'queued',
            createdAt: receiptItem.createdAt,
          })
        } catch (e) {
          const msg = e instanceof Error ? e.message : '加入队列失败'
          setError(msg)
          pushToast({ type: 'error', message: msg })
        }
      }
      if (items.length > 0) {
        setQueue((prev) => [...items, ...prev])
        setError(null)
      }
    },
    [projectId, pushToast]
  )

  const handleFiles = useCallback(
    (files: File[]) => {
      void enqueueFiles(files)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [enqueueFiles]
  )

  // Auto-redirect when queue is empty (all files uploaded with green checkmark)
  useEffect(() => {
    if (queue.length === 0) {
      hasTriggeredRedirectRef.current = false
      return
    }
    if (!allReceived || hasTriggeredRedirectRef.current) return

    hasTriggeredRedirectRef.current = true
    pushToast({
      type: 'success',
      message: 'All receipts uploaded successfully! Processing in the background...',
    })
    const timer = window.setTimeout(() => {
      router.push('/transactions')
    }, 2000)
    return () => clearTimeout(timer)
  }, [allReceived, queue.length, pushToast, router])

  const removeItem = useCallback((id: string) => {
    if (cropItemId === id) setCropItemId(null)
    void deleteQueueItem(id).catch(() => {})
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id)
      if (item?.previewUrl) {
        try {
          URL.revokeObjectURL(item.previewUrl)
        } catch {
          // ignore
        }
      }
      return prev.filter((q) => q.id !== id)
    })
  }, [cropItemId])

  const handleCropConfirm = useCallback(
    async (blob: Blob | null) => {
      const id = cropItemId
      setCropItemId(null)
      if (!id) return
      if (blob) {
        const name = (queue.find((q) => q.id === id)?.file.name ?? 'receipt').replace(/\.[^.]+$/, '') + '.jpg'
        const newFile = new File([blob], name, { type: 'image/jpeg' })
        setQueue((prev) => {
          const item = prev.find((q) => q.id === id)
          if (!item) return prev
          const newPreviewUrl = URL.createObjectURL(blob)
          try {
            URL.revokeObjectURL(item.previewUrl)
          } catch {
            // ignore
          }
          return prev.map((q) =>
            q.id === id ? { ...q, file: newFile, previewUrl: newPreviewUrl } : q
          )
        })
        try {
          await putBlob(id, newFile)
        } catch {
          // ignore
        }
        pushToast({ type: 'info', message: '已裁剪，将上传裁剪后的图片' })
      }
    },
    [cropItemId, queue, pushToast]
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium backdrop-blur bg-white/90 ${
                t.type === 'success'
                  ? 'border-emerald-200 text-emerald-900'
                  : t.type === 'error'
                    ? 'border-red-200 text-red-900'
                    : 'border-blue-200 text-blue-900'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          💡 连续选择多张收据，系统会先保存，后续后台自动识别
        </div>
        <button
          type="button"
          onClick={() => router.push('/transactions')}
          className="text-sm font-semibold text-blue-700 hover:text-blue-800 underline"
        >
          查看交易列表
        </button>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-3 border-dashed rounded-2xl p-10 
          transition-all duration-300 ease-out
          ${dragActive 
            ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
            : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:border-blue-400 hover:shadow-lg'
          }
        `}
      >
        <div
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {/* click-through layer */}
        </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={false}
      />

      <div className="flex flex-col items-center justify-center text-center">
        <div
          className={`
            w-20 h-20 rounded-full flex items-center justify-center mb-6
            transition-all duration-300
            ${dragActive ? 'bg-blue-500 scale-110' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}
          `}
        >
          <UploadIcon className="w-10 h-10 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {dragActive ? 'Drop it here!' : '拍照/选择收据'}
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm">
          选择后会立即保存（不阻塞），后台自动识别并更新交易列表
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-4 h-4" />
            PNG, JPG, WebP, HEIC
          </span>
          <span>•</span>
          <span>Max 10MB</span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          <UploadIcon className="w-5 h-5" />
          选择图片（支持多张）
        </button>
      </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900 mb-1">Upload Failed</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {hasMounted && queue.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">上传队列</h4>
            <div className="text-xs text-gray-500">
              {(() => {
                const uploadingCount = queue.filter((q) => q.status === 'uploading').length
                const queuedCount = queue.filter((q) => q.status === 'queued').length
                const totalPending = uploadingCount + queuedCount
                
                if (uploadingCount > 0 && queuedCount > 0) {
                  return `正在上传 ${uploadingCount} 张 · 等待 ${queuedCount} 张`
                } else if (uploadingCount > 0) {
                  return `正在上传 ${uploadingCount} 张`
                } else if (queuedCount > 0) {
                  return `等待上传 ${queuedCount} 张`
                } else {
                  return '队列为空'
                }
              })()}
            </div>
          </div>

          {queue.slice(0, 6).map((q) => (
            <div
              key={q.id}
              className={`flex items-center gap-3 p-3 rounded-xl border bg-white ${
                q.status === 'error'
                  ? 'border-red-200'
                  : q.status === 'received'
                    ? 'border-emerald-200'
                    : q.status === 'uploading'
                      ? 'border-blue-200'
                      : 'border-gray-200'
              }`}
            >
              <img
                src={q.previewUrl}
                alt="preview"
                className="h-14 w-14 object-cover rounded-lg border border-gray-100"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{q.file.name || 'receipt'}</p>
                  {q.status === 'uploading' && <Loader2Icon className="w-4 h-4 animate-spin text-blue-600" />}
                  {q.status === 'received' && <CheckCircle2Icon className="w-4 h-4 text-emerald-600" />}
                  {q.status === 'error' && <AlertCircleIcon className="w-4 h-4 text-red-600" />}
                </div>
                <p className="text-xs text-gray-500">
                  {q.status === 'queued' && '等待上传'}
                  {q.status === 'uploading' && '上传中…'}
                  {q.status === 'received' && '已收到，后台识别中'}
                  {q.status === 'error' && (q.message || '上传失败')}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {q.status === 'queued' && (
                  <button
                    type="button"
                    onClick={() => setCropItemId(q.id)}
                    className="p-2 rounded-lg hover:bg-orange-50 text-orange-600 hover:text-orange-700 text-xs font-medium"
                    title="裁剪收据边缘"
                  >
                    裁剪边缘
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(q.id)}
                  className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700"
                  aria-label="remove"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {queue.length > 6 && (
            <p className="text-xs text-gray-500">仅显示最近 6 条。其余仍会继续后台上传。</p>
          )}
        </div>
      )}

      {onCancel && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-6 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      )}

      {cropItemId && (() => {
        const item = queue.find((q) => q.id === cropItemId)
        if (!item) return null
        return (
          <ReceiptEdgeCropModal
            imageUrl={item.previewUrl}
            fileName={item.file.name}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropItemId(null)}
          />
        )
      })()}
    </div>
  );
}
