'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { detectReceiptEdges, fullImageQuad, type ReceiptQuad } from '@/app/lib/edge-detection'
import { perspectiveTransformToBlob } from '@/app/lib/perspective-transform'
import { EdgeOverlay } from './EdgeOverlay'
import { XIcon } from './icons'

interface ReceiptEdgeCropModalProps {
  imageUrl: string
  fileName?: string
  onConfirm: (blob: Blob | null) => void
  onCancel: () => void
}

export function ReceiptEdgeCropModal({
  imageUrl,
  fileName = 'receipt.jpg',
  onConfirm,
  onCancel,
}: ReceiptEdgeCropModalProps) {
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [edges, setEdges] = useState<ReceiptQuad | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const ensureCanvas = useCallback(() => {
    const img = imgRef.current
    if (!img || !img.complete || !img.naturalWidth) return null
    if (canvasRef.current && canvasRef.current.width === img.naturalWidth) return canvasRef.current
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    canvasRef.current = canvas
    return canvas
  }, [])

  const runDetect = useCallback(() => {
    const canvas = ensureCanvas()
    if (!canvas) return
    setDetecting(true)
    requestAnimationFrame(() => {
      const quad = detectReceiptEdges(canvas)
      setEdges(quad)
      setDetecting(false)
    })
  }, [ensureCanvas])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const onLoad = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
      setLoading(false)
      runDetect()
    }
    if (img.complete && img.naturalWidth) onLoad()
    else img.addEventListener('load', onLoad)
    return () => img.removeEventListener('load', onLoad)
  }, [imageUrl, runDetect])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const measure = () => {
      const rect = img.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setDisplaySize({ width: rect.width, height: rect.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(img)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [imageSize, loading])

  const handleConfirmCrop = async () => {
    const canvas = ensureCanvas()
    if (!canvas || !edges) return
    try {
      const blob = await perspectiveTransformToBlob(canvas, edges, 800, 1200, 0.92)
      onConfirm(blob)
    } catch (e) {
      console.error('Crop failed:', e)
      onConfirm(null)
    }
  }

  const handleUseOriginal = () => {
    onConfirm(null)
  }

  const initialEdges = edges ?? (imageSize.width && imageSize.height ? fullImageQuad(imageSize.width, imageSize.height) : null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">裁剪收据边缘</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="关闭"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative flex-1 min-h-[280px] bg-gray-100 flex items-center justify-center overflow-hidden"
        >
          {loading ? (
            <div className="text-gray-500">加载中…</div>
          ) : (
            <div className="relative inline-block max-w-full max-h-[60vh]">
              <img
                ref={imgRef}
                src={imageUrl}
                alt="收据"
                className="max-w-full max-h-full object-contain block"
                style={{ maxHeight: '60vh' }}
                draggable={false}
              />
              {initialEdges && displaySize.width > 0 && imageSize.width > 0 && (
                <EdgeOverlay
                  displayWidth={displaySize.width}
                  displayHeight={displaySize.height}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                  edges={initialEdges}
                  onAdjust={setEdges}
                />
              )}
              {detecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                  <span className="text-white font-medium">正在检测边缘…</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runDetect}
            disabled={loading || detecting}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            重新检测边缘
          </button>
          <button
            type="button"
            onClick={handleUseOriginal}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            使用原图
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={!edges || detecting}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 font-medium"
          >
            确认裁剪并上传
          </button>
        </div>
      </div>
    </div>
  )
}
