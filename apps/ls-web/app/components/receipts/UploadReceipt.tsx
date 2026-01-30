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

export function UploadReceipt({ onUploadSuccess, onCancel, projectId }: UploadReceiptProps) {
  const router = useRouter();
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

  // Cleanup on unmount: revoke preview URLs
  useEffect(() => {
    return () => {
      // cleanup previews
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

  const enqueueFiles = (files: File[]) => {
    console.log('[UploadReceipt] enqueueFiles called with', files.length, 'files')
    const now = Date.now()
    const items: QueueItem[] = []
    for (const file of files) {
      const msg = validateFile(file)
      if (msg) {
        console.warn('[UploadReceipt] File validation failed:', msg, file.name)
        setError(msg)
        pushToast({ type: 'error', message: msg })
        continue
      }
      const itemId = `q-${now}-${Math.random().toString(36).slice(2)}`
      items.push({
        id: itemId,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'queued',
        createdAt: Date.now(),
      })
      console.log('[UploadReceipt] Enqueued file:', { id: itemId, name: file.name, size: file.size })
    }
    if (items.length > 0) {
      console.log('[UploadReceipt] Adding', items.length, 'items to queue')
      setQueue((prev) => {
        const newQueue = [...items, ...prev]
        console.log('[UploadReceipt] New queue length:', newQueue.length)
        return newQueue
      })
      setError(null)
    } else {
      console.warn('[UploadReceipt] No valid files to enqueue')
    }
  }

  const handleFiles = (files: File[]) => {
    enqueueFiles(files)
    // reset input so selecting the same file again works
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Process queue: use functional updates to avoid stale closure
  // CRITICAL: Always ensure state is reset in finally block to prevent forever spinners
  const processQueue = useCallback(async () => {
    console.log('[UploadReceipt] processQueue called')
    
    // CRITICAL: First, get the current queue state and find the next item BEFORE updating state
    // This avoids the closure issue where next/currentItemId are lost
    let next: QueueItem | undefined
    let currentItemId: string | undefined
    
    // Use a functional update to both read and update in one go
    const updateResult = await new Promise<{ next: QueueItem | undefined; updated: boolean }>((resolve) => {
      setQueue((prev) => {
        console.log('[UploadReceipt] processQueue: current queue state:', prev.map(q => ({ id: q.id, status: q.status, name: q.file.name })))
        
        // Check if already processing
        const alreadyUploading = prev.some((q) => q.status === 'uploading')
        if (alreadyUploading) {
          console.log('[UploadReceipt] processQueue: already uploading, skipping')
          resolve({ next: undefined, updated: false })
          return prev
        }
        
        const queued = prev.filter((q) => q.status === 'queued').sort((a, b) => a.createdAt - b.createdAt)
        console.log('[UploadReceipt] processQueue: queued items:', queued.length)
        
        if (queued.length === 0) {
          console.log('[UploadReceipt] processQueue: no queued items found')
          resolve({ next: undefined, updated: false })
          return prev
        }
        
        const selected = queued[0]
        console.log('[UploadReceipt] processQueue: selected next item:', { id: selected.id, name: selected.file.name })
        
        // Resolve with the selected item BEFORE returning the updated state
        resolve({ next: selected, updated: true })
        
        // Update status to uploading
        return prev.map((q) => (q.id === selected.id ? { ...q, status: 'uploading' } : q))
      })
    })
    
    next = updateResult.next
    currentItemId = next?.id
    
    if (!next || !currentItemId) {
      console.log('[UploadReceipt] processQueue: early return - no next item', { hasNext: !!next, hasId: !!currentItemId })
      return
    }
    
    console.log('[UploadReceipt] processQueue: proceeding with upload', { id: currentItemId, name: next.file.name })

    // CRITICAL: Add timeout to prevent forever spinners (30 seconds max)
    const timeoutId = setTimeout(() => {
      console.error('[UploadReceipt] Upload timeout after 30s for item:', currentItemId)
      setQueue((prev) =>
        prev.map((q) =>
          q.id === currentItemId
            ? { ...q, status: 'error', message: '上传超时，请重试' }
            : q
        )
      )
      pushToast({ type: 'error', message: '⚠️ 上传超时，请重试' })
    }, 30000) // 30 second timeout

    // Use AbortController for request cancellation
    const abortController = new AbortController()

    try {
      // Generate client_id for idempotency (Layer 2)
      const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`
      
      console.log('[UploadReceipt] Starting upload for item:', {
        id: currentItemId,
        fileName: next.file.name,
        fileSize: next.file.size,
        clientId,
      })
      
      const formData = new FormData()
      formData.append('file', next.file)
      formData.append('client_id', clientId) // Add client_id for idempotency
      if (projectId) formData.append('projectId', projectId)

      console.log('[UploadReceipt] Sending request to /api/receipts/quick-upload')
      const response = await fetch('/api/receipts/quick-upload', {
        method: 'POST',
        body: formData,
        signal: abortController.signal, // Allow cancellation
      })

      console.log('[UploadReceipt] Received response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      clearTimeout(timeoutId) // Clear timeout on success

      const json = await response.json().catch(() => ({}))
      
      // Handle duplicate detection responses
      if (response.status === 409 && json?.error === 'DUPLICATE_IMAGE') {
        const msg = json?.message || '这张收据已经上传过了'
        pushToast({ type: 'error', message: `⚠️ ${msg}` })
        setQueue((prev) =>
          prev.map((q) =>
            q.id === currentItemId ? { ...q, status: 'error', message: msg } : q
          )
        )
        return // Skip this item, don't throw
      }
      
      if (!response.ok || !json?.success || !json?.transaction?.id) {
        const msg = json?.message || json?.error || 'Upload failed'
        throw new Error(msg)
      }
      
      // Handle idempotent duplicate (same client_id)
      if (json.duplicate) {
        console.log('[UploadReceipt] Idempotent duplicate detected, using existing transaction:', json.transaction.id)
        pushToast({ type: 'info', message: '✅ 已收到（幂等性检查通过）' })
      }

      const transactionId = String(json.transaction.id)
      pushToast({ type: 'success', message: '✅ 已收到，正在后台识别' })

      setQueue((prev) =>
        prev.map((q) =>
          q.id === currentItemId ? { ...q, status: 'received', transactionId } : q
        )
      )

      if (onUploadSuccess) onUploadSuccess(transactionId)

      // fire-and-forget analyze (with error logging)
      console.log('[UploadReceipt] Triggering analyze for transaction:', transactionId)
      fetch(`/api/receipts/${transactionId}/analyze`, { method: 'POST' })
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error('[UploadReceipt] Analyze failed:', {
              status: res.status,
              statusText: res.statusText,
              error: errorData,
            })
          } else {
            const result = await res.json().catch(() => ({}))
            console.log('[UploadReceipt] Analyze completed successfully:', {
              transactionId: transactionId,
              status: result.status,
              vendor_name: result.transaction?.vendor_name,
              success: result.success,
            })
            
            // CRITICAL: After analyze completes, trigger a custom event
            // This allows components to manually refresh if Realtime is delayed
            // The Realtime hook should receive the UPDATE event automatically, but this is a fallback
            if (result.success && result.transaction) {
              // Dispatch a custom event that components can listen to
              window.dispatchEvent(new CustomEvent('transaction-analyzed', {
                detail: {
                  transactionId: transactionId,
                  transaction: result.transaction,
                }
              }))
              console.log('[UploadReceipt] Dispatched transaction-analyzed event')
            }
          }
        })
        .catch((err) => {
          console.error('[UploadReceipt] Analyze error:', err)
        })
    } catch (err: any) {
      clearTimeout(timeoutId) // Clear timeout on error
      
      console.error('[UploadReceipt] Upload error:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        itemId: currentItemId,
      })
      
      // Don't update state if request was aborted (component unmounted)
      if (err.name === 'AbortError') {
        console.log('[UploadReceipt] Upload aborted (component unmounted)')
        return
      }
      
      const msg = err?.message || 'Failed to upload receipt. Please try again.'
      setQueue((prev) =>
        prev.map((q) => (q.id === currentItemId ? { ...q, status: 'error', message: msg } : q))
      )
      pushToast({ type: 'error', message: `上传失败: ${msg}` })
      setError(msg)
    } finally {
      // CRITICAL: Always clear timeout and ensure state is reset
      clearTimeout(timeoutId)
      
      // Ensure uploading state is cleared even if something goes wrong
      setQueue((prev) => {
        const item = prev.find((q) => q.id === currentItemId)
        // Only reset if still in uploading state (not already updated to received/error)
        if (item && item.status === 'uploading') {
          return prev.map((q) =>
            q.id === currentItemId ? { ...q, status: 'error', message: '上传中断' } : q
          )
        }
        return prev
      })
      
      // small delay to avoid overload, then continue
      await new Promise((r) => setTimeout(r, 200))
      // process next queued item (use functional update to get latest queue)
      setTimeout(() => {
        void processQueue()
      }, 0)
    }
  }, [onUploadSuccess, projectId, pushToast])

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

  // Auto-process queue when new items are added
  useEffect(() => {
    const hasQueued = queue.some((q) => q.status === 'queued')
    const isCurrentlyUploading = queue.some((q) => q.status === 'uploading')
    
    console.log('[UploadReceipt] Queue state check:', {
      queueLength: queue.length,
      hasQueued,
      isCurrentlyUploading,
      queueStatuses: queue.map(q => ({ id: q.id, status: q.status })),
    })
    
    // Only process if there are queued items AND we're not already uploading
    if (hasQueued && !isCurrentlyUploading) {
      console.log('[UploadReceipt] Triggering processQueue...')
      // small delay to ensure state is settled
      const timer = setTimeout(() => {
        void processQueue()
      }, 100)
      return () => clearTimeout(timer)
    } else if (hasQueued && isCurrentlyUploading) {
      console.log('[UploadReceipt] Skipping processQueue: already uploading')
    }
  }, [queue, processQueue])

  const removeItem = (id: string) => {
    if (cropItemId === id) setCropItemId(null)
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
  }

  const handleCropConfirm = useCallback(
    (blob: Blob | null) => {
      const id = cropItemId
      setCropItemId(null)
      if (!id) return
      if (blob) {
        setQueue((prev) => {
          const item = prev.find((q) => q.id === id)
          if (!item) return prev
          const name = item.file.name.replace(/\.[^.]+$/, '') + '.jpg'
          const newFile = new File([blob], name, { type: 'image/jpeg' })
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
        pushToast({ type: 'info', message: '已裁剪，将上传裁剪后的图片' })
      }
    },
    [cropItemId, pushToast]
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

      {queue.length > 0 && (
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
